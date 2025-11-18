# 腾讯云COS文件存储实现文档

## 📋 目录

- [架构概览](#架构概览)
- [配置说明](#配置说明)
- [上传实现](#上传实现)
- [读取实现](#读取实现)
- [文件类型配置](#文件类型配置)
- [使用示例](#使用示例)
- [最佳实践](#最佳实践)
- [故障排查](#故障排查)

---

## 架构概览

### 整体架构：**客户端直传 + 临时密钥**

```
┌─────────────────────────────────────────────────────────────┐
│                         上传流程                              │
└─────────────────────────────────────────────────────────────┘

  用户选择文件
       ↓
  前端请求临时凭证
       ↓  POST /api/cos/temp-credentials
  后端生成临时密钥（STS）
       ↓  返回 { credentials, config }
  前端使用临时密钥直接上传
       ↓  使用 cos-js-sdk-v5
  腾讯云COS存储文件
       ↓
  返回文件URL


┌─────────────────────────────────────────────────────────────┐
│                         读取流程                              │
└─────────────────────────────────────────────────────────────┘

  前端获得文件URL
       ↓
  直接访问COS公网URL
       ↓  无需鉴权
  腾讯云COS返回文件
       ↓
  浏览器渲染/下载
```

### 核心特点

| 特性 | 说明 |
|------|------|
| **上传方式** | 客户端直传（不经过服务器中转） |
| **安全机制** | 临时密钥（1小时有效期） |
| **权限控制** | STS策略限制上传路径和操作权限 |
| **读取方式** | 公开读取（直接URL访问） |
| **图片处理** | 腾讯云数据万象（实时处理） |

### 优势

✅ **速度快** - 直接上传到COS，无需服务器中转
✅ **安全性高** - 临时密钥自动过期，永久密钥不暴露
✅ **成本低** - 服务器带宽压力小
✅ **可扩展** - 支持大文件和高并发
✅ **易维护** - 前后端职责分离清晰

---

## 配置说明

### 环境变量配置

#### 后端配置（`backend/.env`）

```bash
# 腾讯云对象存储COS配置
COS_SECRET_ID=AKIDxxxxxxxxxxxxxxxx        # 腾讯云SecretId
COS_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxx  # 腾讯云SecretKey
COS_BUCKET=your-bucket-1234567890         # 存储桶名称（包含APPID）
COS_REGION=ap-guangzhou                   # 地域
COS_BASE_URL=https://your-bucket-1234567890.cos.ap-guangzhou.myqcloud.com
```

**获取方式**：
1. SecretId/Key: [腾讯云控制台](https://console.cloud.tencent.com/cam/capi) > 访问管理 > 访问密钥
2. Bucket: [COS控制台](https://console.cloud.tencent.com/cos) > 存储桶列表
3. Region: 创建存储桶时选择的地域

**安全提示**：
- ⚠️ 永久密钥仅在后端使用，**绝不**暴露给前端
- ⚠️ 生产环境使用子账号密钥，限制权限范围
- ⚠️ `.env` 文件已加入 `.gitignore`，不会提交到代码仓库

#### 前端配置（`frontend/.env`）

```bash
# 腾讯云对象存储COS配置
VITE_COS_BUCKET=your-bucket-1234567890    # 与后端保持一致
VITE_COS_REGION=ap-guangzhou              # 与后端保持一致
```

**说明**：前端只需要Bucket和Region信息，不需要密钥。

---

## 上传实现

### 后端实现

#### 1. 临时凭证生成（`backend/src/utils/cos.ts`）

```typescript
/**
 * 获取临时密钥
 * @param fileType 文件类型: 'avatar' | 'student' | 'course' | 'feedback'
 * @param userId 用户ID（用于生成唯一路径）
 * @returns 临时密钥信息
 */
export const getTempCredentials = async (
  fileType: 'avatar' | 'student' | 'course' | 'feedback',
  userId?: string
): Promise<any> => {
  const config = FILE_TYPE_CONFIGS[fileType];
  const uploadPath = userId ? `${config.prefix}${userId}/*` : `${config.prefix}*`;

  // STS策略：仅允许上传操作
  const policy = {
    version: '2.0',
    statement: [{
      action: [
        'name/cos:PutObject',           // 简单上传
        'name/cos:PostObject',          // 表单上传
        'name/cos:InitiateMultipartUpload',  // 分片上传
        'name/cos:ListMultipartUploads',
        'name/cos:ListParts',
        'name/cos:UploadPart',
        'name/cos:CompleteMultipartUpload',
      ],
      effect: 'allow',
      resource: [`qcs::cos:${region}:uid/${appId}:${bucket}/${uploadPath}`]
    }]
  };

  return STS.getCredential({
    secretId: COS_CONFIG.secretId,
    secretKey: COS_CONFIG.secretKey,
    policy,
    durationSeconds: 3600,  // 有效期1小时
  });
};
```

**关键点**：
- 使用 `qcloud-cos-sts` SDK生成临时密钥
- 权限最小化：只授予上传权限，不包含读取和删除
- 路径隔离：不同用户/类型有独立的上传目录

#### 2. API控制器（`backend/src/controllers/cosController.ts`）

```typescript
/**
 * 获取临时上传凭证
 * POST /api/cos/temp-credentials
 * Body: { fileType: string, targetId?: string }
 */
export const getTempUploadCredentials = async (req: Request, res: Response) => {
  const { fileType, targetId } = req.body;

  // 验证文件类型
  if (!['avatar', 'student', 'course', 'feedback'].includes(fileType)) {
    res.status(400).json(errorResponse('无效的文件类型'));
    return;
  }

  // feedback类型必须提供targetId（学生ID）
  if (fileType === 'feedback' && !targetId) {
    res.status(400).json(errorResponse('feedback类型必须提供targetId'));
    return;
  }

  // 确定上传目录的userId
  let userId: string | undefined;
  if (fileType === 'avatar') {
    userId = undefined;  // 头像不分目录
  } else if (fileType === 'feedback') {
    userId = targetId;   // 使用学生ID
  } else {
    userId = req.user.id; // 使用当前用户ID
  }

  const credentials = await getTempCredentials(fileType, userId);
  res.json(successResponse(credentials));
};
```

**路由配置**（`backend/src/routes/index.ts`）：
```typescript
import cosRoutes from './cosRoutes';
router.use('/cos', authenticateToken, cosRoutes);
```

### 前端实现

#### 1. 上传工具函数（`frontend/src/utils/cosUpload.ts`）

```typescript
/**
 * 上传文件到COS
 * @param options 上传选项
 * @returns 文件URL
 */
export const uploadToCos = async (options: UploadOptions): Promise<string> => {
  const { file, fileType, targetId, onProgress } = options;

  // 1️⃣ 获取临时凭证
  const credentialsResponse = await api.post('/cos/temp-credentials', {
    fileType,
    targetId
  });
  const { credentials, config } = credentialsResponse.data.data;

  // 2️⃣ 验证文件
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!config.allowedExtensions.includes(fileExtension)) {
    throw new Error(`不支持的文件类型`);
  }
  if (file.size > config.maxSizeMB * 1024 * 1024) {
    throw new Error(`文件过大`);
  }

  // 3️⃣ 初始化COS客户端
  const cos = new COS({
    getAuthorization: (_options, callback) => {
      callback({
        TmpSecretId: credentials.tmpSecretId,
        TmpSecretKey: credentials.tmpSecretKey,
        SecurityToken: credentials.sessionToken,
        ExpiredTime: credentialsResponse.data.data.expiredTime
      });
    }
  });

  // 4️⃣ 生成唯一文件名
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}_${randomStr}${fileExtension}`;
  const key = `${config.prefix}${fileName}`;

  // 5️⃣ 上传到COS
  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: config.bucket,
      Region: config.region,
      Key: key,
      Body: file,
      onProgress: (progressData) => {
        onProgress?.(progressData.percent * 100);
      }
    }, (err, data) => {
      if (err) {
        reject(new Error(`上传失败: ${err.message}`));
      } else {
        const url = `https://${data.Location}`;
        resolve(url);
      }
    });
  });
};
```

#### 2. 快捷方法

```typescript
// 上传头像
export const uploadAvatar = (file: File, onProgress?: (percent: number) => void) => {
  return uploadToCos({ file, fileType: 'avatar', onProgress });
};

// 上传学生文件
export const uploadStudentFile = (file: File, onProgress?: (percent: number) => void) => {
  return uploadToCos({ file, fileType: 'student', onProgress });
};

// 上传课程文件
export const uploadCourseFile = (file: File, onProgress?: (percent: number) => void) => {
  return uploadToCos({ file, fileType: 'course', onProgress });
};

// 上传反馈媒体（需要学生ID）
export const uploadFeedbackMedia = (
  file: File,
  studentId: string,
  onProgress?: (percent: number) => void
) => {
  return uploadToCos({ file, fileType: 'feedback', targetId: studentId, onProgress });
};
```

#### 3. 组件中使用示例（`frontend/src/components/Feedback/MediaUploader.tsx`）

```typescript
const performUpload = async (pendingFile: PendingFile) => {
  // 上传到COS
  const url = await uploadFeedbackMedia(file, studentId, (percent) => {
    // 更新进度
    setUploadingFiles((prev) =>
      prev.map((f) => f.file === file ? { ...f, progress: percent } : f)
    );
  });

  // 生成缩略图（照片使用COS图片处理，视频提取首帧）
  let thumbnail = url;
  if (type === 'photo') {
    thumbnail = `${url}?imageView2/2/w/200/q/85`;
  } else if (type === 'video') {
    thumbnail = await extractVideoThumbnail(file);
  }

  // 添加到已上传列表
  const newFile: FeedbackMediaFile = { type, url, thumbnail, name, size };
  onChange([...uploadedFiles, newFile]);
};
```

---

## 读取实现

### 访问方式：**公开读取（Public Read）**

```typescript
// 文件上传后返回的URL
const url = "https://your-bucket-1234567890.cos.ap-guangzhou.myqcloud.com/avatars/12345_abc.jpg";

// 前端直接使用（无需鉴权）
<img src={url} />
<Avatar src={url} />
<video src={url} />
```

### 图片处理（腾讯云数据万象）

#### 常用处理参数

```typescript
// 生成缩略图（宽度200px，质量85%）
const thumbnail = `${url}?imageView2/2/w/200/q/85`;

// 等比例缩放（限定宽高）
const scaled = `${url}?imageView2/1/w/800/h/600`;

// 裁剪（正方形）
const cropped = `${url}?imageView2/1/w/300/h/300/q/90`;

// 格式转换（转为WebP）
const webp = `${url}?imageMogr2/format/webp`;

// 水印
const watermarked = `${url}?watermark/2/text/5rC46L2J57yW56iL/fontsize/20`;
```

#### 参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `imageView2/1` | 限定宽高，等比缩放 | `w/800/h/600` |
| `imageView2/2` | 限定宽度，高度自适应 | `w/200` |
| `imageView2/3` | 限定高度，宽度自适应 | `h/300` |
| `q/85` | 图片质量（1-100） | `q/85` |
| `format/webp` | 转换格式 | `webp`, `jpg`, `png` |

**文档**：[腾讯云数据万象图片处理](https://cloud.tencent.com/document/product/460/6924)

### 删除文件（服务器端）

```typescript
// backend/src/utils/cos.ts

/**
 * 删除单个文件
 * @param url 文件URL或key
 * @returns 是否删除成功
 */
export const deleteFileFromCos = async (url: string): Promise<boolean> => {
  // 提取key
  const key = url.startsWith('http') ? extractKeyFromUrl(url) : url;

  const cos = initCosClient();
  return new Promise((resolve, reject) => {
    cos.deleteObject({
      Bucket: COS_CONFIG.bucket,
      Region: COS_CONFIG.region,
      Key: key
    }, (err) => {
      if (err && err.statusCode !== 404) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
};

/**
 * 批量删除文件
 * @param urls 文件URL数组
 * @returns 删除成功的数量
 */
export const deleteFilesFromCos = async (urls: string[]): Promise<number> => {
  const deletePromises = urls.map(url => deleteFileFromCos(url));
  const results = await Promise.all(deletePromises);
  return results.filter(r => r).length;
};
```

---

## 文件类型配置

### 配置表（`backend/src/utils/cos.ts`）

```typescript
const FILE_TYPE_CONFIGS: Record<string, FileTypeConfig> = {
  avatar: {
    prefix: 'avatars/',
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSizeMB: 2,
  },
  student: {
    prefix: 'students/',
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'],
    maxSizeMB: 10,
  },
  course: {
    prefix: 'courses/',
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.mp4', '.avi', '.mov'],
    maxSizeMB: 100,
  },
  feedback: {
    prefix: 'feedback/',
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.avi', '.mov', '.m4v'],
    maxSizeMB: 50,
  },
};
```

### 目录结构

```
your-bucket-1234567890/
├── avatars/                    # 头像（不分用户）
│   ├── 1699999999_abc123.jpg
│   └── 1700000000_def456.png
│
├── students/                   # 学生文件（按用户ID分目录）
│   ├── user-123/
│   │   ├── 1699999999_doc1.pdf
│   │   └── 1700000000_doc2.docx
│   └── user-456/
│       └── 1699999999_file.jpg
│
├── courses/                    # 课程文件（按用户ID分目录）
│   └── staff-789/
│       ├── 1699999999_cover.jpg
│       └── 1700000000_video.mp4
│
└── feedback/                   # 反馈媒体（按学生ID分目录）
    ├── student-001/
    │   ├── 1699999999_photo1.jpg
    │   └── 1700000000_video1.mp4
    └── student-002/
        └── 1699999999_photo2.jpg
```

---

## 使用示例

### 示例1：上传头像

```typescript
import { uploadAvatar } from '@/utils/cosUpload';

const handleAvatarUpload = async (file: File) => {
  try {
    setUploading(true);

    const url = await uploadAvatar(file, (percent) => {
      setProgress(percent);
      console.log('上传进度:', percent + '%');
    });

    console.log('头像URL:', url);
    setAvatarUrl(url);
    message.success('头像上传成功');
  } catch (error) {
    message.error('头像上传失败');
  } finally {
    setUploading(false);
  }
};
```

### 示例2：上传反馈媒体

```typescript
import { uploadFeedbackMedia } from '@/utils/cosUpload';

const handleMediaUpload = async (file: File, studentId: string) => {
  try {
    const url = await uploadFeedbackMedia(file, studentId, (percent) => {
      updateProgress(file.name, percent);
    });

    // 照片：生成缩略图
    let thumbnail = url;
    if (file.type.startsWith('image/')) {
      thumbnail = `${url}?imageView2/2/w/200/q/85`;
    }

    // 视频：提取首帧
    if (file.type.startsWith('video/')) {
      thumbnail = await extractVideoThumbnail(file);
    }

    const mediaFile = {
      type: file.type.startsWith('image/') ? 'photo' : 'video',
      url,
      thumbnail,
      name: file.name,
      size: file.size
    };

    onUploadSuccess(mediaFile);
  } catch (error) {
    message.error(`上传失败: ${error.message}`);
  }
};
```

### 示例3：Ant Design Upload组件集成

```typescript
import { Upload, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';

const AvatarUploader: React.FC = () => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: RcFile): Promise<boolean> => {
    try {
      setUploading(true);

      const url = await uploadAvatar(file, (percent) => {
        console.log('进度:', percent);
      });

      message.success('上传成功');
      onSuccess(url);
    } catch (error) {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }

    return false; // 阻止Antd默认上传行为
  };

  return (
    <Upload
      beforeUpload={handleUpload}
      showUploadList={false}
      accept="image/*"
    >
      <Button icon={<UploadOutlined />} loading={uploading}>
        上传头像
      </Button>
    </Upload>
  );
};
```

---

## 最佳实践

### 1. 安全性

#### ✅ 推荐做法

- 永久密钥仅在后端使用，不暴露给前端
- 使用临时密钥（STS），设置合理的过期时间
- 权限最小化：只授予必要的操作权限
- 目录隔离：不同用户/类型使用不同的路径前缀
- 生产环境使用子账号密钥，限制权限范围

#### ❌ 避免做法

- 不要在前端代码中硬编码永久密钥
- 不要授予不必要的权限（如删除、修改ACL）
- 不要使用过长的临时密钥有效期（建议1-2小时）
- 不要跳过文件类型和大小验证

### 2. 性能优化

#### 图片优化

```typescript
// 根据使用场景选择合适的图片参数

// 缩略图列表（200px宽）
const thumbnail = `${url}?imageView2/2/w/200/q/75`;

// 详情页预览（800px宽）
const preview = `${url}?imageView2/2/w/800/q/85`;

// 原图下载（不处理）
const original = url;

// WebP格式（更小体积）
const webp = `${url}?imageMogr2/format/webp/quality/85`;
```

#### 延迟上传

```typescript
// 用户停止操作后再上传，避免频繁请求
useEffect(() => {
  const timer = setTimeout(() => {
    uploadPendingFiles();
  }, 5000); // 5秒后自动上传

  return () => clearTimeout(timer);
}, [pendingFiles]);
```

### 3. 错误处理

```typescript
try {
  const url = await uploadAvatar(file);
  message.success('上传成功');
} catch (error: any) {
  // 根据错误类型给出不同提示
  if (error.message.includes('不支持的文件类型')) {
    message.error('文件格式不正确，请上传JPG/PNG格式');
  } else if (error.message.includes('文件过大')) {
    message.error('文件不能超过2MB');
  } else if (error.message.includes('网络')) {
    message.error('网络异常，请稍后重试');
  } else {
    message.error('上传失败，请重试');
  }

  logger.error('[上传失败]', error);
}
```

### 4. 用户体验

#### 进度提示

```typescript
const [uploadProgress, setUploadProgress] = useState(0);

const url = await uploadAvatar(file, (percent) => {
  setUploadProgress(percent);
});

// 显示进度条
<Progress percent={uploadProgress} />
```

#### 文件预览

```typescript
// 上传前预览
const preview = URL.createObjectURL(file);
<img src={preview} />

// 使用完毕后清理
URL.revokeObjectURL(preview);
```

---

## 故障排查

### 常见问题

#### 1. 上传失败：403 Forbidden

**原因**：临时密钥权限不足或已过期

**解决方法**：
- 检查后端 `policy` 配置是否正确
- 检查 `resource` 路径是否匹配上传路径
- 检查临时密钥是否过期（默认1小时）

```typescript
// 查看临时密钥配置
logger.debug('临时凭证:', {
  tmpSecretId: credentials.tmpSecretId.substring(0, 10) + '...',
  expiredTime: credentials.expiredTime,
  resource: policy.statement[0].resource
});
```

#### 2. 上传失败：NoSuchBucket

**原因**：Bucket名称或Region配置错误

**解决方法**：
- 检查 `COS_BUCKET` 和 `COS_REGION` 是否正确
- 检查前后端配置是否一致
- 确认Bucket确实存在

#### 3. 图片处理无效

**原因**：未开启数据万象服务

**解决方法**：
- 登录腾讯云COS控制台
- 进入存储桶 > 数据处理 > 图片处理
- 开启图片处理服务

#### 4. CORS错误

**原因**：COS未配置CORS规则

**解决方法**：
```json
// 在COS控制台配置CORS规则
{
  "CORSRules": [{
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "AllowedMethods": ["GET", "POST", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "x-cos-request-id"],
    "MaxAgeSeconds": 3600
  }]
}
```

### 调试技巧

#### 1. 开启详细日志

```typescript
// backend/src/utils/cos.ts
logger.debug('[COS] 生成临时凭证', {
  fileType,
  userId,
  uploadPath,
  policy: JSON.stringify(policy, null, 2)
});

// frontend/src/utils/cosUpload.ts
logger.debug('[COS上传] 上传参数:', {
  Bucket: bucket,
  Region: region,
  Key: key,
  fileSize: file.size
});
```

#### 2. 测试临时密钥

```bash
# 使用coscmd工具测试临时密钥
pip install coscmd

coscmd config \
  -a <TmpSecretId> \
  -s <TmpSecretKey> \
  -t <SecurityToken> \
  -b <Bucket> \
  -r <Region>

coscmd list
```

#### 3. 网络抓包

```bash
# Chrome DevTools
1. 打开开发者工具
2. Network标签
3. 筛选 "myqcloud.com"
4. 查看请求详情
```

---

## 附录

### 相关文档

- [腾讯云COS官方文档](https://cloud.tencent.com/document/product/436)
- [cos-js-sdk-v5文档](https://cloud.tencent.com/document/product/436/11459)
- [临时密钥STS文档](https://cloud.tencent.com/document/product/436/14048)
- [数据万象图片处理](https://cloud.tencent.com/document/product/460/6924)

### 依赖包版本

```json
// backend/package.json
{
  "cos-nodejs-sdk-v5": "^2.12.0",
  "qcloud-cos-sts": "^3.1.0"
}

// frontend/package.json
{
  "cos-js-sdk-v5": "^1.4.0"
}
```

### 代码位置索引

| 功能 | 文件路径 |
|------|---------|
| 临时密钥生成 | `backend/src/utils/cos.ts` |
| COS控制器 | `backend/src/controllers/cosController.ts` |
| COS路由 | `backend/src/routes/cosRoutes.ts` |
| 前端上传工具 | `frontend/src/utils/cosUpload.ts` |
| 媒体上传组件 | `frontend/src/components/Feedback/MediaUploader.tsx` |
| 环境变量示例 | `backend/.env.example`, `frontend/.env.example` |

---

## 更新日志

| 日期 | 版本 | 说明 |
|------|------|------|
| 2024-11 | v1.0 | 初始版本：客户端直传 + 临时密钥实现 |

---

**文档维护者**：开发团队
**最后更新**：2024-11-16

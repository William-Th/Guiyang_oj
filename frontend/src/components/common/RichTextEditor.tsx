import React, { useEffect, useState } from 'react';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import '@wangeditor/editor/dist/css/style.css';
import { questionImageUploadApi } from '../../services/api';
import { looksLikeHtml } from '@/utils/richText';

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  height?: number;
  disabled?: boolean;
  /** 测试定位用（E2E 通过 [data-testid="..."] 找到编辑区） */
  testId?: string;
}

const TOOLBAR_KEYS: Partial<IToolbarConfig> = {
  toolbarKeys: [
    'headerSelect',
    'bold', 'italic', 'underline', 'through', 'sup', 'sub', 'clearStyle',
    '|', 'color', 'bgColor',
    '|', 'fontSize', 'lineHeight',
    '|', 'bulletedList', 'numberedList',
    '|', 'justifyLeft', 'justifyCenter', 'justifyRight',
    '|', 'insertLink', 'insertImage', 'uploadImage',
    '|', 'insertTable', 'blockquote', 'codeBlock',
    '|', 'undo', 'redo', 'fullScreen',
  ],
};

/**
 * 富文本编辑器（wangEditor v5 封装）
 *
 * - 支持标题/加粗/颜色/列表/表格/代码块等常用排版
 * - 配图上传复用 POST /api/upload/question-image（教师/管理员权限）
 * - 与 antd Form 受控集成：Form.Item 注入 value/onChange
 */
const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '请输入内容…',
  height = 300,
  disabled = false,
  testId,
}) => {
  const [editor, setEditor] = useState<IDomEditor | null>(null);

  // 组件卸载时销毁编辑器实例（官方推荐写法）
  useEffect(() => {
    return () => {
      if (editor == null) return;
      editor.destroy();
      setEditor(null);
    };
  }, [editor]);

  // 空值时清空编辑器（Form.resetFields → value 变 undefined）
  useEffect(() => {
    if (editor && !value && editor.getText().trim() !== '') {
      editor.clear();
    }
  }, [value, editor]);

  // 历史纯文本内容转为安全 HTML，避免 wangEditor setHtml 解析裸文本失败
  const editorValue = React.useMemo(() => {
    const v = value ?? '';
    if (!v || looksLikeHtml(v)) return v;
    const wrapper = document.createElement('p');
    wrapper.textContent = v;
    return wrapper.innerHTML;
  }, [value]);

  const editorConfig: Partial<IEditorConfig> = {
    placeholder,
    readOnly: disabled,
    MENU_CONF: {
      uploadImage: {
        // 与后端 /api/upload/question-image 的 2MB 限制保持一致
        maxFileSize: 2 * 1024 * 1024,
        allowedFileTypes: ['image/*'],
        async customUpload(file: File, insertFn: (url: string, alt?: string, href?: string) => void) {
          const formData = new FormData();
          formData.append('image', file);
          const response = await questionImageUploadApi(formData);
          const url = (response as any)?.data?.url;
          if (!url) {
            throw new Error((response as any)?.message || '图片上传失败');
          }
          insertFn(url, file.name, url);
        },
      },
    },
  };

  return (
    <div className="rich-text-editor" data-testid={testId}>
      <Toolbar
        editor={editor}
        defaultConfig={TOOLBAR_KEYS}
        mode="default"
        style={{ borderBottom: '1px solid #d9d9d9', zIndex: 2 }}
      />
      <Editor
        defaultConfig={editorConfig}
        value={editorValue}
        onChange={(editorInstance: IDomEditor) => onChange?.(editorInstance.getHtml())}
        mode="default"
        style={{ height, overflowY: 'hidden' }}
        onCreated={setEditor}
      />
    </div>
  );
};

export default RichTextEditor;

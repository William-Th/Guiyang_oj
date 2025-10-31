#!/bin/sh
# 在Docker容器内部执行管理员功能测试

echo "=========================================="
echo "管理员账号生成和权限管理功能测试"
echo "=========================================="

# 1. 登录获取token
echo "\n=== 测试1: 市级管理员登录 ==="
LOGIN_RESPONSE=$(wget -q -O- --post-data='{"username":"admin","password":"password123"}' \
  --header='Content-Type: application/json' \
  http://localhost:3001/api/auth/login 2>&1)

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ 登录成功"
echo "Token: ${TOKEN:0:50}..."

# 2. 获取区域列表
echo "\n=== 测试2: 获取区域列表 ==="
DISTRICTS=$(wget -q -O- --header="Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/admin/districts 2>&1)

DISTRICT_COUNT=$(echo "$DISTRICTS" | grep -o '"districts":\[' | wc -l)
if [ "$DISTRICT_COUNT" -gt 0 ]; then
  echo "✅ 获取区域列表成功"
  echo "$DISTRICTS" | head -50
else
  echo "❌ 获取区域列表失败"
fi

# 3. 获取学校列表
echo "\n=== 测试3: 获取学校列表 ==="
SCHOOLS=$(wget -q -O- --header="Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/admin/schools 2>&1)

echo "$SCHOOLS" | head -50

# 4. 创建校级管理员
echo "\n=== 测试4: 创建校级管理员 ==="
CREATE_RESPONSE=$(wget -q -O- --post-data='{
  "username": "test_school_admin_001",
  "password": "test123456",
  "role": "school_admin",
  "realName": "测试校级管理员001",
  "phone": "13800138888",
  "email": "test001@guiyang.edu",
  "schoolId": 1,
  "permissionScope": {
    "permissions": ["manage_students", "manage_teachers", "manage_exams"]
  }
}' \
  --header="Authorization: Bearer $TOKEN" \
  --header="Content-Type: application/json" \
  http://localhost:3001/api/admin/admins 2>&1)

if echo "$CREATE_RESPONSE" | grep -q "管理员创建成功"; then
  echo "✅ 创建校级管理员成功"
  echo "$CREATE_RESPONSE" | head -30
  NEW_ADMIN_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo "新管理员ID: $NEW_ADMIN_ID"
else
  echo "❌ 创建校级管理员失败"
  echo "$CREATE_RESPONSE"
fi

# 5. 创建区级管理员
echo "\n=== 测试5: 创建区级管理员 ==="
CREATE_DISTRICT_ADMIN=$(wget -q -O- --post-data='{
  "username": "test_district_admin_001",
  "password": "test123456",
  "role": "district_admin",
  "realName": "测试区级管理员001",
  "phone": "13800139999",
  "email": "test_district@guiyang.edu",
  "districtId": 1,
  "permissionScope": {
    "district": "云岩区",
    "schools": "all",
    "permissions": ["manage_schools", "manage_teachers", "view_reports"]
  }
}' \
  --header="Authorization: Bearer $TOKEN" \
  --header="Content-Type: application/json" \
  http://localhost:3001/api/admin/admins 2>&1)

if echo "$CREATE_DISTRICT_ADMIN" | grep -q "管理员创建成功"; then
  echo "✅ 创建区级管理员成功"
  echo "$CREATE_DISTRICT_ADMIN" | head -30
else
  echo "❌ 创建区级管理员失败"
  echo "$CREATE_DISTRICT_ADMIN"
fi

# 6. 获取所有管理员列表
echo "\n=== 测试6: 获取所有管理员列表 ==="
ALL_ADMINS=$(wget -q -O- --header="Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/admin/admins 2>&1)

ADMIN_TOTAL=$(echo "$ALL_ADMINS" | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "✅ 管理员总数: $ADMIN_TOTAL"
echo "$ALL_ADMINS" | head -100

# 7. 获取管理员统计
echo "\n=== 测试7: 获取管理员统计 ==="
STATS=$(wget -q -O- --header="Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/admin/stats 2>&1)

echo "✅ 管理员统计:"
echo "$STATS"

# 8. 更新管理员权限 (如果有新创建的管理员)
if [ ! -z "$NEW_ADMIN_ID" ]; then
  echo "\n=== 测试8: 更新管理员权限 (ID: $NEW_ADMIN_ID) ==="
  UPDATE_RESPONSE=$(wget -q -O- --method=PUT \
    --body-data='{
      "schoolId": 2,
      "permissionScope": {
        "permissions": ["manage_students", "manage_exams", "view_reports", "export_data"]
      }
    }' \
    --header="Authorization: Bearer $TOKEN" \
    --header="Content-Type: application/json" \
    http://localhost:3001/api/admin/admins/$NEW_ADMIN_ID/permissions 2>&1)

  if echo "$UPDATE_RESPONSE" | grep -q "管理员权限更新成功"; then
    echo "✅ 更新管理员权限成功"
    echo "$UPDATE_RESPONSE" | head -30
  else
    echo "❌ 更新管理员权限失败"
    echo "$UPDATE_RESPONSE"
  fi
fi

echo "\n=========================================="
echo "测试完成"
echo "=========================================="

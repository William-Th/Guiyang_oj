const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Test configuration
const testConfig = {
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
};

let adminToken = '';

async function login() {
  console.log('\n=== 测试1: 市级管理员登录 ===');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'password123',
      loginType: 'username'
    }, testConfig);

    adminToken = response.data.token;
    console.log('✅ 登录成功');
    console.log('Token:', adminToken.substring(0, 30) + '...');
    console.log('用户:', response.data.user);
    return true;
  } catch (error) {
    console.log('❌ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

async function getDistricts() {
  console.log('\n=== 测试2: 获取区域列表 ===');
  try {
    const response = await axios.get(`${BASE_URL}/admin/districts`, {
      ...testConfig,
      headers: {
        ...testConfig.headers,
        'Authorization': `Bearer ${adminToken}`
      }
    });

    console.log('✅ 获取区域列表成功');
    console.log('区域数量:', response.data.districts.length);
    console.log('区域列表:', response.data.districts.map(d => d.name).join(', '));
    return response.data.districts;
  } catch (error) {
    console.log('❌ 获取区域列表失败:', error.response?.data || error.message);
    return null;
  }
}

async function getSchools() {
  console.log('\n=== 测试3: 获取学校列表 ===');
  try {
    const response = await axios.get(`${BASE_URL}/admin/schools`, {
      ...testConfig,
      headers: {
        ...testConfig.headers,
        'Authorization': `Bearer ${adminToken}`
      }
    });

    console.log('✅ 获取学校列表成功');
    console.log('学校数量:', response.data.schools.length);
    console.log('学校列表:', response.data.schools.map(s => s.name).join(', '));
    return response.data.schools;
  } catch (error) {
    console.log('❌ 获取学校列表失败:', error.response?.data || error.message);
    return null;
  }
}

async function createDistrictAdmin(districtId) {
  console.log('\n=== 测试4: 创建区级管理员 ===');
  try {
    const response = await axios.post(`${BASE_URL}/admin/admins`, {
      username: 'test_district_admin',
      password: 'test123456',
      role: 'district_admin',
      realName: '测试区级管理员',
      phone: '13800138888',
      email: 'test_district@guiyang.edu',
      districtId: districtId,
      permissionScope: {
        district: '测试区',
        schools: 'all',
        permissions: ['manage_schools', 'manage_teachers', 'view_reports']
      }
    }, {
      ...testConfig,
      headers: {
        ...testConfig.headers,
        'Authorization': `Bearer ${adminToken}`
      }
    });

    console.log('✅ 创建区级管理员成功');
    console.log('管理员ID:', response.data.admin.id);
    console.log('用户名:', response.data.admin.username);
    console.log('角色:', response.data.admin.role);
    console.log('管理区域:', response.data.admin.district_name);
    return response.data.admin;
  } catch (error) {
    console.log('❌ 创建区级管理员失败:', error.response?.data || error.message);
    return null;
  }
}

async function createSchoolAdmin(schoolId) {
  console.log('\n=== 测试5: 创建校级管理员 ===');
  try {
    const response = await axios.post(`${BASE_URL}/admin/admins`, {
      username: 'test_school_admin',
      password: 'test123456',
      role: 'school_admin',
      realName: '测试校级管理员',
      phone: '13800139999',
      email: 'test_school@guiyang.edu',
      schoolId: schoolId,
      permissionScope: {
        school: '测试学校',
        permissions: ['manage_students', 'manage_teachers', 'manage_exams', 'view_reports']
      }
    }, {
      ...testConfig,
      headers: {
        ...testConfig.headers,
        'Authorization': `Bearer ${adminToken}`
      }
    });

    console.log('✅ 创建校级管理员成功');
    console.log('管理员ID:', response.data.admin.id);
    console.log('用户名:', response.data.admin.username);
    console.log('角色:', response.data.admin.role);
    console.log('管理学校:', response.data.admin.school_name);
    return response.data.admin;
  } catch (error) {
    console.log('❌ 创建校级管理员失败:', error.response?.data || error.message);
    return null;
  }
}

async function getAllAdmins() {
  console.log('\n=== 测试6: 获取所有管理员列表 ===');
  try {
    const response = await axios.get(`${BASE_URL}/admin/admins`, {
      ...testConfig,
      headers: {
        ...testConfig.headers,
        'Authorization': `Bearer ${adminToken}`
      }
    });

    console.log('✅ 获取管理员列表成功');
    console.log('管理员总数:', response.data.total);
    console.log('管理员列表:');
    response.data.admins.forEach(admin => {
      console.log(`  - ${admin.real_name} (${admin.username}) - ${admin.role} - ${admin.school_name || admin.district_name || '市级'}`);
    });
    return response.data.admins;
  } catch (error) {
    console.log('❌ 获取管理员列表失败:', error.response?.data || error.message);
    return null;
  }
}

async function getAdminById(adminId) {
  console.log(`\n=== 测试7: 获取管理员详情 (ID: ${adminId}) ===`);
  try {
    const response = await axios.get(`${BASE_URL}/admin/admins/${adminId}`, {
      ...testConfig,
      headers: {
        ...testConfig.headers,
        'Authorization': `Bearer ${adminToken}`
      }
    });

    console.log('✅ 获取管理员详情成功');
    console.log('管理员信息:', response.data.admin);
    return response.data.admin;
  } catch (error) {
    console.log('❌ 获取管理员详情失败:', error.response?.data || error.message);
    return null;
  }
}

async function updateAdminPermissions(adminId, schoolId) {
  console.log(`\n=== 测试8: 更新管理员权限 (ID: ${adminId}) ===`);
  try {
    const response = await axios.put(`${BASE_URL}/admin/admins/${adminId}/permissions`, {
      schoolId: schoolId,
      permissionScope: {
        school: '更新后的学校',
        permissions: ['manage_students', 'manage_exams', 'view_reports', 'export_data']
      }
    }, {
      ...testConfig,
      headers: {
        ...testConfig.headers,
        'Authorization': `Bearer ${adminToken}`
      }
    });

    console.log('✅ 更新管理员权限成功');
    console.log('更新后的管理员信息:', response.data.admin);
    return response.data.admin;
  } catch (error) {
    console.log('❌ 更新管理员权限失败:', error.response?.data || error.message);
    return null;
  }
}

async function getAdminStats() {
  console.log('\n=== 测试9: 获取管理员统计 ===');
  try {
    const response = await axios.get(`${BASE_URL}/admin/stats`, {
      ...testConfig,
      headers: {
        ...testConfig.headers,
        'Authorization': `Bearer ${adminToken}`
      }
    });

    console.log('✅ 获取管理员统计成功');
    console.log('管理员总数:', response.data.total);
    console.log('按角色统计:');
    response.data.byRole.forEach(stat => {
      console.log(`  - ${stat.role}: ${stat.count}`);
    });
    return response.data;
  } catch (error) {
    console.log('❌ 获取管理员统计失败:', error.response?.data || error.message);
    return null;
  }
}

async function deleteAdminPermissions(adminId) {
  console.log(`\n=== 测试10: 删除管理员权限 (ID: ${adminId}) ===`);
  try {
    const response = await axios.delete(`${BASE_URL}/admin/admins/${adminId}/permissions`, {
      ...testConfig,
      headers: {
        ...testConfig.headers,
        'Authorization': `Bearer ${adminToken}`
      }
    });

    console.log('✅ 删除管理员权限成功');
    console.log(response.data.message);
    return true;
  } catch (error) {
    console.log('❌ 删除管理员权限失败:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('管理员账号生成和权限管理功能测试');
  console.log('='.repeat(60));

  // 1. Login as admin
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ 登录失败，终止测试');
    return;
  }

  // 2. Get districts
  const districts = await getDistricts();
  if (!districts || districts.length === 0) {
    console.log('\n❌ 获取区域失败，终止测试');
    return;
  }

  // 3. Get schools
  const schools = await getSchools();
  if (!schools || schools.length === 0) {
    console.log('\n❌ 获取学校失败，终止测试');
    return;
  }

  // 4. Create district admin
  const districtAdmin = await createDistrictAdmin(districts[0].id);

  // 5. Create school admin
  const schoolAdmin = await createSchoolAdmin(schools[0].id);

  // 6. Get all admins
  const admins = await getAllAdmins();

  // 7. Get admin by ID
  if (schoolAdmin) {
    await getAdminById(schoolAdmin.id);
  }

  // 8. Update admin permissions
  if (schoolAdmin && schools.length > 1) {
    await updateAdminPermissions(schoolAdmin.id, schools[1].id);
  }

  // 9. Get admin statistics
  await getAdminStats();

  // 10. Delete admin permissions (optional, for testing)
  // if (districtAdmin) {
  //   await deleteAdminPermissions(districtAdmin.id);
  // }

  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
}

// Run all tests
runTests().catch(error => {
  console.error('测试执行错误:', error);
  process.exit(1);
});

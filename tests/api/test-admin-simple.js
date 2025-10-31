// 简化版测试脚本 - 在Docker容器内运行
const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3001;

function request(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('管理员账号生成和权限管理功能测试');
  console.log('='.repeat(60));

  try {
    // 1. 登录
    console.log('\n=== 测试1: 市级管理员登录 ===');
    const loginRes = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'password123'
    });

    if (loginRes.status !== 200) {
      console.log('❌ 登录失败:', loginRes);
      return;
    }

    const token = loginRes.data.token;
    console.log('✅ 登录成功');
    console.log('用户:', loginRes.data.user);

    // 2. 获取区域列表
    console.log('\n=== 测试2: 获取区域列表 ===');
    const districtsRes = await request('GET', '/api/admin/districts', null, token);
    if (districtsRes.status === 200) {
      console.log('✅ 获取成功，区域数量:', districtsRes.data.districts.length);
      console.log('区域列表:', districtsRes.data.districts.map(d => d.name).join(', '));
    } else {
      console.log('❌ 获取失败:', districtsRes);
    }

    // 3. 获取学校列表
    console.log('\n=== 测试3: 获取学校列表 ===');
    const schoolsRes = await request('GET', '/api/admin/schools', null, token);
    if (schoolsRes.status === 200) {
      console.log('✅ 获取成功，学校数量:', schoolsRes.data.schools.length);
      console.log('学校列表:', schoolsRes.data.schools.map(s => s.name).join(', '));
    } else {
      console.log('❌ 获取失败:', schoolsRes);
    }

    // 4. 创建校级管理员
    console.log('\n=== 测试4: 创建校级管理员 ===');
    const createSchoolAdminRes = await request('POST', '/api/admin/admins', {
      username: 'test_school_admin_' + Date.now(),
      password: 'test123456',
      role: 'school_admin',
      realName: '测试校级管理员',
      phone: '13800138888',
      email: 'test_school@guiyang.edu',
      schoolId: 1,
      permissionScope: {
        permissions: ['manage_students', 'manage_teachers', 'manage_exams']
      }
    }, token);

    if (createSchoolAdminRes.status === 201) {
      console.log('✅ 创建成功');
      console.log('管理员信息:', createSchoolAdminRes.data.admin);
      var newAdminId = createSchoolAdminRes.data.admin.id;
    } else {
      console.log('❌ 创建失败:', createSchoolAdminRes);
    }

    // 5. 创建区级管理员
    console.log('\n=== 测试5: 创建区级管理员 ===');
    const createDistrictAdminRes = await request('POST', '/api/admin/admins', {
      username: 'test_district_admin_' + Date.now(),
      password: 'test123456',
      role: 'district_admin',
      realName: '测试区级管理员',
      phone: '13800139999',
      email: 'test_district@guiyang.edu',
      districtId: 1,
      permissionScope: {
        district: '云岩区',
        schools: 'all',
        permissions: ['manage_schools', 'manage_teachers', 'view_reports']
      }
    }, token);

    if (createDistrictAdminRes.status === 201) {
      console.log('✅ 创建成功');
      console.log('管理员信息:', createDistrictAdminRes.data.admin);
    } else {
      console.log('❌ 创建失败:', createDistrictAdminRes);
    }

    // 6. 获取所有管理员
    console.log('\n=== 测试6: 获取所有管理员列表 ===');
    const allAdminsRes = await request('GET', '/api/admin/admins', null, token);
    if (allAdminsRes.status === 200) {
      console.log('✅ 获取成功，管理员总数:', allAdminsRes.data.total);
      console.log('管理员列表:');
      allAdminsRes.data.admins.slice(0, 5).forEach(admin => {
        console.log(`  - ${admin.real_name} (${admin.username}) - ${admin.role}`);
      });
    } else {
      console.log('❌ 获取失败:', allAdminsRes);
    }

    // 7. 获取管理员统计
    console.log('\n=== 测试7: 获取管理员统计 ===');
    const statsRes = await request('GET', '/api/admin/stats', null, token);
    if (statsRes.status === 200) {
      console.log('✅ 获取成功');
      console.log('总数:', statsRes.data.total);
      console.log('按角色统计:', statsRes.data.byRole);
    } else {
      console.log('❌ 获取失败:', statsRes);
    }

    // 8. 更新管理员权限
    if (newAdminId) {
      console.log(`\n=== 测试8: 更新管理员权限 (ID: ${newAdminId}) ===`);
      const updateRes = await request('PUT', `/api/admin/admins/${newAdminId}/permissions`, {
        schoolId: 2,
        permissionScope: {
          permissions: ['manage_students', 'manage_exams', 'view_reports', 'export_data']
        }
      }, token);

      if (updateRes.status === 200) {
        console.log('✅ 更新成功');
        console.log('更新后的管理员:', updateRes.data.admin);
      } else {
        console.log('❌ 更新失败:', updateRes);
      }

      // 9. 获取管理员详情
      console.log(`\n=== 测试9: 获取管理员详情 (ID: ${newAdminId}) ===`);
      const adminDetailRes = await request('GET', `/api/admin/admins/${newAdminId}`, null, token);
      if (adminDetailRes.status === 200) {
        console.log('✅ 获取成功');
        console.log('管理员详情:', adminDetailRes.data.admin);
      } else {
        console.log('❌ 获取失败:', adminDetailRes);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有测试完成');
    console.log('='.repeat(60));

  } catch (error) {
    console.log('❌ 测试执行错误:', error.message);
  }
}

runTests();

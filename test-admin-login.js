const axios = require('axios');

async function testAdminLogin() {
  try {
    console.log('1. Testing admin login...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: 'password123',
      loginType: 'username'
    });

    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    const token = loginResponse.data.token;

    console.log('\n2. Testing profile fetch...');
    const profileResponse = await axios.get('http://localhost:3001/api/users/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Profile response:', JSON.stringify(profileResponse.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAdminLogin();

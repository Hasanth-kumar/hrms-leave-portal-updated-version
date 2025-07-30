const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
let authToken = '';

async function testEndpoint(method, url, data = null) {
  try {
    const config = {
      headers: { Authorization: `Bearer ${authToken}` }
    };
    
    let response;
    if (method.toLowerCase() === 'get') {
      response = await axios.get(`${API_BASE}${url}`, config);
    } else if (method.toLowerCase() === 'post') {
      response = await axios.post(`${API_BASE}${url}`, data, config);
    } else if (method.toLowerCase() === 'put') {
      response = await axios.put(`${API_BASE}${url}`, data, config);
    } else if (method.toLowerCase() === 'delete') {
      response = await axios.delete(`${API_BASE}${url}`, config);
    }
    
    console.log(`✅ ${method.toUpperCase()} ${url} - Success`);
    return response.data;
  } catch (error) {
    console.error(`❌ ${method.toUpperCase()} ${url} - Failed:`, error.response?.data?.message || error.message);
    return null;
  }
}

async function runTests() {
  try {
    // Test login
    console.log('\n🔍 Testing login...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@company.com',
      password: 'password123'
    });
    
    if (loginRes.data.data && loginRes.data.data.token) {
      authToken = loginRes.data.data.token;
      console.log('✅ Login successful');
    } else {
      console.error('❌ Login failed - No token received');
      return;
    }
    
    // Test all endpoints
    console.log('\n🔍 Testing all endpoints...');
    await testEndpoint('GET', '/auth/current-user');
    await testEndpoint('GET', '/leaves/balance');
    await testEndpoint('GET', '/leaves/lop-status');
    await testEndpoint('GET', '/leaves/holidays');
    await testEndpoint('GET', '/leaves/my-leaves');
    await testEndpoint('GET', '/leaves/team');
    await testEndpoint('GET', '/admin/users');
    await testEndpoint('GET', '/admin/departments');
    await testEndpoint('GET', '/admin/settings');
    await testEndpoint('GET', '/admin/leave-stats');
    
    console.log('\n✅ All tests completed');
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
  }
}

runTests(); 
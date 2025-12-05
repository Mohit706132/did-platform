// test-api.js - Test script for DID Platform API endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:4000';
let sessionId = '';
let credentialId = '';

// Helper function to make requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

async function runTests() {
  console.log('🚀 Starting DID Platform API Tests...\n');
  
  // Test 1: Health Check
  console.log('1️⃣  Testing Health Check...');
  const health = await makeRequest('GET', '/health');
  console.log(health.success ? '✅ Health check passed' : '❌ Health check failed');
  console.log('Response:', JSON.stringify(health.data, null, 2), '\n');
  
  // Test 2: Register User
  console.log('2️⃣  Testing User Registration...');
  const registerData = {
    email: `test${Date.now()}@example.com`,
    password: 'Test@1234',
    firstName: 'John',
    lastName: 'Doe'
  };
  const register = await makeRequest('POST', '/api/auth/register', registerData);
  if (register.success) {
    sessionId = register.data.sessionId;
    console.log('✅ Registration successful');
    console.log('Session ID:', sessionId);
  } else {
    console.log('❌ Registration failed');
  }
  console.log('Response:', JSON.stringify(register, null, 2), '\n');
  
  // Test 3: Login
  console.log('3️⃣  Testing User Login...');
  const loginData = {
    email: registerData.email,
    password: registerData.password
  };
  const login = await makeRequest('POST', '/api/auth/login', loginData);
  if (login.success) {
    sessionId = login.data.sessionId;
    console.log('✅ Login successful');
    console.log('Session ID:', sessionId);
  } else {
    console.log('❌ Login failed');
  }
  console.log('Response:', JSON.stringify(login, null, 2), '\n');
  
  if (!sessionId) {
    console.log('❌ No session ID available. Stopping tests.');
    return;
  }
  
  // Test 4: Issue Credential
  console.log('4️⃣  Testing Credential Issuance...');
  const issueData = {
    subjectDid: 'did:mychain:holder-123',
    claims: {
      name: 'John Doe',
      age: 25,
      degree: 'Computer Science',
      university: 'Test University'
    },
    expirationDate: '2026-12-31T23:59:59Z',
    type: ['VerifiableCredential', 'EducationCredential']
  };
  const issue = await makeRequest('POST', '/api/credentials/issue', issueData, {
    'x-session-id': sessionId
  });
  if (issue.success) {
    credentialId = issue.data.credentialId;
    console.log('✅ Credential issued successfully');
    console.log('Credential ID:', credentialId);
  } else {
    console.log('❌ Credential issuance failed');
  }
  console.log('Response:', JSON.stringify(issue, null, 2), '\n');
  
  // Test 5: Get All Credentials
  console.log('5️⃣  Testing Get All Credentials...');
  const getAll = await makeRequest('GET', '/api/credentials?page=1&limit=10', null, {
    'x-session-id': sessionId
  });
  console.log(getAll.success ? '✅ Retrieved credentials' : '❌ Failed to get credentials');
  console.log('Response:', JSON.stringify(getAll, null, 2), '\n');
  
  if (credentialId) {
    // Test 6: Get Single Credential
    console.log('6️⃣  Testing Get Single Credential...');
    const getSingle = await makeRequest('GET', `/api/credentials/${credentialId}`, null, {
      'x-session-id': sessionId
    });
    console.log(getSingle.success ? '✅ Retrieved credential' : '❌ Failed to get credential');
    console.log('Response:', JSON.stringify(getSingle, null, 2), '\n');
    
    // Test 7: Get Credential Usage Log
    console.log('7️⃣  Testing Get Credential Usage Log...');
    const getLog = await makeRequest('GET', `/api/credentials/${credentialId}/usage-log`, null, {
      'x-session-id': sessionId
    });
    console.log(getLog.success ? '✅ Retrieved usage log' : '❌ Failed to get usage log');
    console.log('Response:', JSON.stringify(getLog, null, 2), '\n');
    
    // Test 8: Verify Credential (if we have full credential data)
    if (getSingle.success && getSingle.data.credential) {
      console.log('8️⃣  Testing Credential Verification...');
      const verify = await makeRequest('POST', '/api/credentials/verify', 
        getSingle.data.credential.credentialData, 
        { 'x-session-id': sessionId }
      );
      console.log(verify.success ? '✅ Credential verified' : '❌ Verification failed');
      console.log('Response:', JSON.stringify(verify, null, 2), '\n');
    }
    
    // Test 9: Revoke Credential
    console.log('9️⃣  Testing Credential Revocation...');
    const revoke = await makeRequest('POST', `/api/credentials/${credentialId}/revoke`, 
      { reason: 'Test revocation' }, 
      { 'x-session-id': sessionId }
    );
    console.log(revoke.success ? '✅ Credential revoked' : '❌ Revocation failed');
    console.log('Response:', JSON.stringify(revoke, null, 2), '\n');
  }
  
  // Test 10: Logout
  console.log('🔟 Testing Logout...');
  const logout = await makeRequest('POST', '/api/auth/logout', {}, {
    'x-session-id': sessionId
  });
  console.log(logout.success ? '✅ Logout successful' : '❌ Logout failed');
  console.log('Response:', JSON.stringify(logout, null, 2), '\n');
  
  console.log('🎉 All tests completed!');
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };

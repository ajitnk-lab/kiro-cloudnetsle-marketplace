#!/usr/bin/env node

// Comprehensive auth flow debugging script
const https = require('https');
const http = require('http');

const MARKETPLACE_API = 'https://y26tmcluvk.execute-api.us-east-1.amazonaws.com/prod';
const FAISS_API = 'https://5to8z1h4ue.execute-api.us-east-1.amazonaws.com/prod';

// Test data
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPass123!',
  solution_id: 'aws-solution-finder'
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Debug-Script/1.0',
        ...options.headers
      }
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed,
            raw: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            raw: data
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testCatalogAPI() {
  console.log('\n🔍 STEP 1: Testing Catalog API');
  
  try {
    const response = await makeRequest(`${MARKETPLACE_API}/catalog`);
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200 && response.data) {
      const solutions = Array.isArray(response.data) ? response.data : response.data.solutions || [];
      console.log(`Found ${solutions.length} solutions`);
      
      const awsSolution = solutions.find(s => 
        s.externalUrl && s.externalUrl.includes('awssolutionfinder.solutions.cloudnestle.com')
      );
      
      if (awsSolution) {
        console.log('✅ AWS Solution Finder found:');
        console.log(`  - Name: ${awsSolution.name}`);
        console.log(`  - External URL: ${awsSolution.externalUrl}`);
        console.log(`  - Action Button Text: ${awsSolution.actionButtonText}`);
        return awsSolution;
      } else {
        console.log('❌ AWS Solution Finder not found in catalog');
        console.log('Available solutions:', solutions.map(s => s.name));
      }
    } else {
      console.log('❌ Failed to get catalog:', response.raw);
    }
  } catch (error) {
    console.log('❌ Catalog API error:', error.message);
  }
  
  return null;
}

async function testTokenGeneration() {
  console.log('\n🔍 STEP 2: Testing Token Generation API');
  
  const testCases = [
    // Without auth header
    {
      name: 'No Auth Header',
      headers: {},
      body: {
        user_email: TEST_USER.email,
        solution_id: TEST_USER.solution_id,
        access_tier: 'registered'
      }
    },
    // With dummy auth header
    {
      name: 'Dummy Auth Header',
      headers: { 'Authorization': 'Bearer dummy-token' },
      body: {
        user_email: TEST_USER.email,
        solution_id: TEST_USER.solution_id,
        access_tier: 'registered'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n  Testing: ${testCase.name}`);
    
    try {
      const response = await makeRequest(`${MARKETPLACE_API}/api/generate-solution-token`, {
        method: 'POST',
        headers: testCase.headers,
        body: testCase.body
      });
      
      console.log(`  Status: ${response.status}`);
      
      if (response.status === 200 && response.data) {
        console.log('  ✅ Token generated successfully:');
        console.log(`    - Token: ${response.data.token ? 'Present' : 'Missing'}`);
        console.log(`    - Redirect URL: ${response.data.redirect_url || 'Missing'}`);
        console.log(`    - Access Tier: ${response.data.access_tier}`);
        
        if (response.data.redirect_url) {
          const url = new URL(response.data.redirect_url);
          console.log(`    - URL Params: ${url.search}`);
        }
        
        return response.data;
      } else {
        console.log(`  ❌ Failed: ${response.raw}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  return null;
}

async function testTokenValidation(token) {
  console.log('\n🔍 STEP 3: Testing Token Validation');
  
  if (!token) {
    console.log('❌ No token to validate');
    return false;
  }
  
  try {
    const response = await makeRequest(`${MARKETPLACE_API}/api/validate-solution-token`, {
      method: 'POST',
      body: {
        token: token,
        action: 'search',
        solution_id: 'faiss'
      }
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200 && response.data) {
      console.log('✅ Token validation successful:');
      console.log(`  - Allowed: ${response.data.allowed}`);
      console.log(`  - User Email: ${response.data.user_email}`);
      console.log(`  - Access Tier: ${response.data.access_tier}`);
      console.log(`  - Quota Remaining: ${response.data.quota_remaining}`);
      return true;
    } else {
      console.log('❌ Token validation failed:', response.raw);
    }
  } catch (error) {
    console.log('❌ Validation error:', error.message);
  }
  
  return false;
}

async function testFAISSAPI(token) {
  console.log('\n🔍 STEP 4: Testing FAISS API with Token');
  
  if (!token) {
    console.log('❌ No token to test with FAISS');
    return;
  }
  
  try {
    const response = await makeRequest(`${FAISS_API}/query`, {
      method: 'POST',
      body: {
        query: 'test search',
        marketplace_token: token,
        marketplace: 'true'
      }
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ FAISS API accepts token');
    } else {
      console.log('❌ FAISS API rejected token:', response.raw);
    }
  } catch (error) {
    console.log('❌ FAISS API error:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting Marketplace Auth Flow Debug');
  console.log('=====================================');
  
  // Test catalog
  const solution = await testCatalogAPI();
  
  // Test token generation
  const tokenData = await testTokenGeneration();
  
  // Test token validation
  if (tokenData && tokenData.token) {
    await testTokenValidation(tokenData.token);
    await testFAISSAPI(tokenData.token);
  }
  
  console.log('\n📋 SUMMARY');
  console.log('==========');
  console.log(`Catalog API: ${solution ? '✅ Working' : '❌ Failed'}`);
  console.log(`Token Generation: ${tokenData ? '✅ Working' : '❌ Failed'}`);
  console.log(`Solution URL: ${solution?.externalUrl || 'Not found'}`);
  console.log(`Generated Token: ${tokenData?.token ? 'Present' : 'Missing'}`);
  console.log(`Redirect URL: ${tokenData?.redirect_url || 'Missing'}`);
  
  if (!tokenData || !tokenData.redirect_url) {
    console.log('\n🔧 LIKELY ISSUES:');
    console.log('- Token generation API not working properly');
    console.log('- Missing authentication in API call');
    console.log('- Solution not configured with correct external URL');
  }
}

main().catch(console.error);

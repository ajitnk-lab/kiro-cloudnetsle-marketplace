#!/usr/bin/env node

// Test the exact condition from CatalogPage
const https = require('https');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : {},
            raw: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
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

async function testCatalogCondition() {
  console.log('🔍 Testing Catalog Condition Logic');
  console.log('==================================');
  
  // Get the solution from catalog
  const catalogResponse = await makeRequest('https://y26tmcluvk.execute-api.us-east-1.amazonaws.com/prod/catalog');
  
  if (catalogResponse.status !== 200) {
    console.log('❌ Failed to get catalog:', catalogResponse.raw);
    return;
  }
  
  const solutions = Array.isArray(catalogResponse.data) ? catalogResponse.data : catalogResponse.data.solutions || [];
  const awsSolution = solutions.find(s => 
    s.externalUrl && s.externalUrl.includes('awssolutionfinder.solutions.cloudnestle.com')
  );
  
  if (!awsSolution) {
    console.log('❌ AWS Solution not found');
    return;
  }
  
  console.log('✅ Found AWS Solution:');
  console.log(`  - Name: ${awsSolution.name}`);
  console.log(`  - External URL: ${awsSolution.externalUrl}`);
  console.log(`  - Action Button Text: ${awsSolution.actionButtonText}`);
  
  // Test the condition from CatalogPage
  console.log('\n🔍 Testing Condition Logic:');
  
  const hasExternalUrl = !!awsSolution.externalUrl;
  console.log(`1. solution.externalUrl exists: ${hasExternalUrl}`);
  
  const containsFaiss = awsSolution.externalUrl.includes('awssolutionfinder.solutions.cloudnestle.com');
  console.log(`2. contains 'awssolutionfinder.solutions.cloudnestle.com': ${containsFaiss}`);
  
  console.log('\n🔍 Simulating User Object Scenarios:');
  
  const userScenarios = [
    {
      name: 'No user (null)',
      user: null
    },
    {
      name: 'User with profile.email',
      user: {
        userId: 'test-123',
        email: 'user@example.com',
        profile: {
          email: 'user@example.com',
          name: 'Test User'
        }
      }
    },
    {
      name: 'User with email only',
      user: {
        userId: 'test-123',
        email: 'user@example.com',
        profile: {
          name: 'Test User'
        }
      }
    },
    {
      name: 'User with neither',
      user: {
        userId: 'test-123',
        profile: {
          name: 'Test User'
        }
      }
    }
  ];
  
  for (const scenario of userScenarios) {
    console.log(`\n  Scenario: ${scenario.name}`);
    
    const user = scenario.user;
    const hasProfileEmail = !!(user?.profile?.email);
    const hasEmail = !!(user?.email);
    const emailCheck = !user?.profile?.email && !user?.email;
    const userEmail = user?.profile?.email || user?.email;
    
    console.log(`    - user?.profile?.email: ${hasProfileEmail ? user.profile.email : 'undefined'}`);
    console.log(`    - user?.email: ${hasEmail ? user.email : 'undefined'}`);
    console.log(`    - Condition (!user?.profile?.email && !user?.email): ${emailCheck}`);
    console.log(`    - userEmail result: ${userEmail || 'undefined'}`);
    
    if (emailCheck) {
      console.log(`    - Would show: "Please login first"`);
    } else {
      console.log(`    - Would proceed with API call using email: ${userEmail}`);
    }
  }
  
  console.log('\n🔍 Testing API Call:');
  
  const testEmail = 'test@example.com';
  const apiResponse = await makeRequest('https://y26tmcluvk.execute-api.us-east-1.amazonaws.com/prod/api/generate-solution-token', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer dummy-token'
    },
    body: {
      user_email: testEmail,
      solution_id: 'aws-solution-finder',
      access_tier: 'registered'
    }
  });
  
  console.log(`API Response Status: ${apiResponse.status}`);
  if (apiResponse.status === 200 && apiResponse.data) {
    console.log(`✅ API working - redirect_url: ${apiResponse.data.redirect_url}`);
  } else {
    console.log(`❌ API failed: ${apiResponse.raw}`);
  }
}

testCatalogCondition().catch(console.error);

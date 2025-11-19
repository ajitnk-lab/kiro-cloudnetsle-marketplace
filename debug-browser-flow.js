#!/usr/bin/env node

// Browser automation to debug the exact click flow
const puppeteer = require('puppeteer');

async function debugMarketplaceFlow() {
  console.log('🚀 Starting Browser Debug Flow');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log(`🖥️  BROWSER: ${msg.text()}`);
  });
  
  // Enable network monitoring
  page.on('request', request => {
    if (request.url().includes('generate-solution-token') || request.url().includes('catalog')) {
      console.log(`📡 REQUEST: ${request.method()} ${request.url()}`);
      if (request.postData()) {
        console.log(`📡 BODY: ${request.postData()}`);
      }
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('generate-solution-token') || response.url().includes('catalog')) {
      console.log(`📡 RESPONSE: ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    console.log('\n1️⃣ Going to marketplace...');
    await page.goto('https://d3uhuxbvqv0vtg.cloudfront.net/catalog', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log('\n2️⃣ Checking localStorage before login...');
    const beforeLogin = await page.evaluate(() => {
      return {
        authToken: localStorage.getItem('authToken'),
        user: localStorage.getItem('user'),
        authSession: localStorage.getItem('auth-session')
      };
    });
    console.log('Before login localStorage:', beforeLogin);
    
    console.log('\n3️⃣ Checking if login is required...');
    const needsLogin = await page.evaluate(() => {
      return !localStorage.getItem('authToken') || !localStorage.getItem('user');
    });
    
    if (needsLogin) {
      console.log('❌ User not logged in. Please login manually and press Enter to continue...');
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
    }
    
    console.log('\n4️⃣ Checking localStorage after login...');
    const afterLogin = await page.evaluate(() => {
      return {
        authToken: localStorage.getItem('authToken'),
        user: localStorage.getItem('user'),
        authSession: localStorage.getItem('auth-session')
      };
    });
    console.log('After login localStorage:', afterLogin);
    
    console.log('\n5️⃣ Looking for AWS Solution Finder button...');
    await page.waitForSelector('button', { timeout: 10000 });
    
    const buttons = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      return allButtons.map((btn, idx) => ({
        index: idx,
        text: btn.textContent.trim(),
        onclick: btn.onclick ? btn.onclick.toString() : null
      }));
    });
    
    console.log('Available buttons:', buttons);
    
    const startTrialButton = buttons.find(btn => 
      btn.text.includes('Start') || btn.text.includes('Trial') || btn.text.includes('Free')
    );
    
    if (!startTrialButton) {
      console.log('❌ Start Trial button not found');
      await browser.close();
      return;
    }
    
    console.log(`\n6️⃣ Found button: "${startTrialButton.text}" at index ${startTrialButton.index}`);
    
    console.log('\n7️⃣ Clicking the button and monitoring...');
    
    // Set up navigation listener
    let navigationPromise = new Promise(resolve => {
      page.on('framenavigated', frame => {
        if (frame === page.mainFrame()) {
          console.log(`🔄 NAVIGATION: ${frame.url()}`);
          resolve(frame.url());
        }
      });
    });
    
    // Click the button
    await page.click(`button:nth-of-type(${startTrialButton.index + 1})`);
    
    // Wait for either navigation or API call
    const result = await Promise.race([
      navigationPromise,
      new Promise(resolve => setTimeout(() => resolve('timeout'), 5000))
    ]);
    
    console.log(`\n8️⃣ Result: ${result}`);
    
    if (result && result.includes('awssolutionfinder')) {
      console.log('✅ Redirected to FAISS');
      const finalUrl = page.url();
      console.log(`Final URL: ${finalUrl}`);
      
      if (finalUrl.includes('token=')) {
        console.log('✅ Token found in URL');
      } else {
        console.log('❌ No token in URL - this is the problem!');
      }
    } else {
      console.log('❌ No redirect happened');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\nPress Enter to close browser...');
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
  
  await browser.close();
}

// Check if puppeteer is available
try {
  require('puppeteer');
  debugMarketplaceFlow().catch(console.error);
} catch (e) {
  console.log('❌ Puppeteer not installed. Installing...');
  const { execSync } = require('child_process');
  execSync('npm install puppeteer', { stdio: 'inherit' });
  console.log('✅ Puppeteer installed. Please run the script again.');
}

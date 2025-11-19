// Debug script to inject into CatalogPage
// Copy and paste this into browser console on the catalog page

console.log('🔍 DEBUG: Checking auth state...');

// Check localStorage directly
const authToken = localStorage.getItem('authToken');
const userStr = localStorage.getItem('user');
const authSession = localStorage.getItem('auth-session');

console.log('📱 localStorage contents:');
console.log('  authToken:', authToken ? 'Present' : 'Missing');
console.log('  user:', userStr ? 'Present' : 'Missing');
console.log('  auth-session:', authSession ? 'Present' : 'Missing');

if (userStr) {
  try {
    const user = JSON.parse(userStr);
    console.log('👤 Parsed user object:');
    console.log('  email:', user?.email);
    console.log('  profile.email:', user?.profile?.email);
    console.log('  role:', user?.role);
    console.log('  userId:', user?.userId);
  } catch (e) {
    console.log('❌ Error parsing user:', e.message);
  }
}

// Check React context (if available)
if (window.React) {
  console.log('⚛️ React context check - please manually inspect useAuth() result');
} else {
  console.log('⚛️ React not accessible from console');
}

// Override button click to add debugging
const buttons = document.querySelectorAll('button');
buttons.forEach((btn, idx) => {
  if (btn.textContent.includes('Start') || btn.textContent.includes('Trial')) {
    console.log(`🔘 Found button ${idx}: "${btn.textContent.trim()}"`);
    
    // Store original click handler
    const originalClick = btn.onclick;
    
    // Add debug wrapper
    btn.onclick = function(event) {
      console.log('🖱️ BUTTON CLICKED - Starting debug...');
      
      // Check auth state at click time
      const clickTimeUser = localStorage.getItem('user');
      console.log('📱 localStorage user at click time:', clickTimeUser ? 'Present' : 'Missing');
      
      if (clickTimeUser) {
        const user = JSON.parse(clickTimeUser);
        const hasEmail = !!(user?.profile?.email || user?.email);
        console.log('👤 User email available:', hasEmail);
        console.log('👤 User email value:', user?.profile?.email || user?.email);
      }
      
      // Call original handler if it exists
      if (originalClick) {
        console.log('🔄 Calling original click handler...');
        return originalClick.call(this, event);
      } else {
        console.log('❌ No original click handler found');
      }
    };
  }
});

console.log('✅ Debug injection complete. Click the Start Trial button now.');

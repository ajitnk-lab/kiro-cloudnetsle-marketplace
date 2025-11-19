# 🔄 FAISS Marketplace Integration - Updated User Flows

## 📋 **Flow Overview**

**Major Update**: Anonymous tracking is now the **default behavior** for all users.  
**No parameters needed** - every user starts with 3 demo searches.

---

## 🎯 **User Flow 1: Anonymous Demo User**

### **Entry Points**
- Direct: `https://awssolutionfinder.solutions.cloudnestle.com/`
- Marketing: Any link to FAISS solution
- Search: Google → FAISS landing page

### **User Journey**
```
1. 🌐 Visit FAISS Solution
   ↓
2. 🎯 Click "Try Free Demo" 
   ↓
3. 🔍 Make Search #1
   → Result: ✅ Success + "2 searches remaining"
   ↓
4. 🔍 Make Search #2  
   → Result: ✅ Success + "1 search remaining"
   ↓
5. 🔍 Make Search #3
   → Result: ✅ Success + "0 searches remaining"
   ↓
6. 🔍 Try Search #4
   → Result: ❌ "Demo complete! Register now for 10 daily searches!"
   ↓
7. 🎯 Click "Register" Button
   → Redirect: Marketplace registration
```

### **Technical Details**
- **Tracking**: IP-based fingerprinting (`anonymous_{ip}`)
- **Storage**: DynamoDB usage table
- **Limits**: 3 total searches (lifetime)
- **Reset**: Never (encourages registration)

---

## 🎯 **User Flow 2: Registered User**

### **Entry Points**
- Registration: `https://d3uhuxbvqv0vtg.cloudfront.net/register?return_to=faiss&solution_id=aws-finder`
- Login: `https://d3uhuxbvqv0vtg.cloudfront.net/login?return_to=faiss&solution_id=aws-finder`
- Direct: "Start Free Trial" button

### **Registration Journey**
```
1. 📝 Fill Registration Form
   → Special messaging: "Get 10 Free Daily Searches"
   ↓
2. 📧 Email Verification
   → Check inbox and click verify link
   ↓
3. ✅ Verification Complete
   → Auto-generate marketplace token
   ↓
4. 🔄 Auto-Redirect to FAISS
   → URL: faiss.com/?user_id=123&token=abc&tier=registered
   ↓
5. 🎯 Start Using FAISS
   → Get 10 searches per day
```

### **Daily Usage Journey**
```
1. 🔍 Make Searches 1-9
   → Result: ✅ Success + "X searches remaining today"
   ↓
2. 🔍 Make Search #10
   → Result: ✅ Success + "0 searches remaining today"
   ↓
3. 🔍 Try Search #11
   → Result: ❌ "Daily limit reached! Upgrade to Pro for unlimited searches!"
   ↓
4. 🎯 Click "Upgrade to Pro"
   → Redirect: Pro subscription page
```

### **Technical Details**
- **Authentication**: Marketplace token (1-hour expiry)
- **Tracking**: User ID + marketplace API calls
- **Limits**: 10 searches per day
- **Reset**: Daily at midnight UTC

---

## 🎯 **User Flow 3: Pro Subscriber**

### **Entry Points**
- Upgrade: From registered user limit prompt
- Direct: Pro subscription purchase
- Renewal: Existing Pro user login

### **Pro User Journey**
```
1. 💳 Complete Pro Payment
   → ₹749/month subscription
   ↓
2. ✅ Payment Confirmed
   → Account upgraded to Pro tier
   ↓
3. 🔄 Login to FAISS
   → Auto-redirect with Pro token
   ↓
4. 🚀 Unlimited Access
   → No search limits
   → Priority support
   → Export capabilities
```

### **Technical Details**
- **Authentication**: Pro-tier marketplace token
- **Tracking**: User ID + Pro tier validation
- **Limits**: Unlimited (float('inf'))
- **Features**: Export, priority support, advanced features

---

## 🔄 **Cross-Flow Transitions**

### **Anonymous → Registered**
```
Anonymous (3 searches) 
    ↓ [Register button]
Marketplace Registration
    ↓ [Email verification]
Registered (10/day)
```

### **Registered → Pro**
```
Registered (10/day limit)
    ↓ [Upgrade prompt]
Pro Payment Page
    ↓ [Payment complete]
Pro (unlimited)
```

### **Direct Pro Purchase**
```
FAISS Landing Page
    ↓ [Start Free Trial]
Marketplace Registration
    ↓ [Upgrade during signup]
Pro Payment
    ↓ [Payment complete]
Pro (unlimited)
```

---

## 🎯 **Button Behavior**

### **On FAISS Landing Page**

| Button | Destination | User Experience |
|--------|-------------|-----------------|
| **"Try Free Demo"** | `/search` | 3 demo searches → register prompt |
| **"Start Free Trial"** | Marketplace registration | Direct to 10/day plan |

### **After Limits Reached**

| User Tier | Button | Destination |
|-----------|--------|-------------|
| **Anonymous** | "Register Now" | Marketplace registration |
| **Registered** | "Upgrade to Pro" | Pro subscription page |

---

## 📊 **Conversion Funnel**

```
🌐 Website Visitors (100%)
    ↓
🎯 Try Demo (60%)
    ↓  
🔍 Complete 3 Searches (40%)
    ↓
📝 Register (15%)
    ↓
✅ Active Users (12%)
    ↓
💳 Upgrade to Pro (3%)
```

### **Key Conversion Points**
1. **Landing → Demo**: Clear value proposition
2. **Demo → Register**: Compelling upgrade message
3. **Register → Active**: Email verification + onboarding
4. **Active → Pro**: Usage-based upgrade prompts

---

## 🧪 **Testing Scenarios**

### **Scenario 1: New Anonymous User**
- Visit FAISS → Get 3 searches → Hit limit → Register prompt

### **Scenario 2: Returning Anonymous User**
- Same IP → Still blocked → Must register to continue

### **Scenario 3: Registered User**
- Login → Get token → 10 searches/day → Upgrade prompt

### **Scenario 4: Pro User**
- Login → Get Pro token → Unlimited searches

### **Scenario 5: Token Expiry**
- Expired token → Fallback to anonymous → 3 searches

---

## 🎯 **Success Metrics**

- **Demo Completion Rate**: % who use all 3 searches
- **Registration Conversion**: % who register after demo
- **Daily Active Users**: Registered users using service
- **Pro Conversion Rate**: % who upgrade to Pro
- **Revenue per User**: Monthly revenue from Pro users

---

**🚀 Status**: LIVE AND OPERATIONAL  
**📅 Last Updated**: November 8, 2025  
**🔄 Flow Version**: 2.0 (Default Anonymous Tracking)

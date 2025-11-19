# 🚀 Control Plane Architecture - MVP Implementation Plan

## 📋 **Changes Discussed & Decisions Made**

### **🏗️ Architecture Decisions**
1. **Control Plane vs Data Plane**: Marketplace = Control, Solutions = Data
2. **Token Model**: One-time permanent token per user-solution combination
3. **User Identity**: Email immutable (no changes allowed)
4. **Access Authority**: Marketplace is single source of truth
5. **Solution Statelessness**: Solutions store only token, validate everything via API

### **🔒 Security Decisions**
- **Token Delivery**: Keep URL parameters for MVP (simple, working)
- **Token Storage**: Solutions cache token in localStorage permanently
- **Validation**: Every request validated with marketplace API

### **📊 Data Flow**
```
Anonymous Limit → Register Link → Marketplace Registration → 
Token Generation → Redirect with Token → Solution Caches Token → 
Real-time API Validation for All Requests
```

---

## 🎯 **MVP Implementation Plan**

### **Phase 1: Marketplace Control Plane APIs (2-3 hours)**

#### **Task 1.1: User-Solution Entitlements Table**
```javascript
// New DynamoDB Table: user-solution-entitlements
{
  pk: "user#email@example.com",
  sk: "solution#faiss", 
  user_email: "email@example.com",
  solution_id: "faiss",
  access_tier: "registered|pro",
  token: "tok_permanent_abc123",
  created_at: "2025-11-08T17:00:00Z",
  status: "active"
}
```

#### **Task 1.2: Token Generation API**
```javascript
// POST /api/generate-solution-token
{
  "user_email": "user@example.com",
  "solution_id": "faiss",
  "access_tier": "registered"
}
// Response: permanent token for this user-solution combo
```

#### **Task 1.3: Token Validation API**
```javascript
// POST /api/validate-token
{
  "token": "tok_permanent_abc123",
  "action": "search",
  "solution_id": "faiss"
}
// Response: allowed/denied + remaining quota + user info
```

### **Phase 2: Registration Flow Integration (1-2 hours)**

#### **Task 2.1: Enhanced Registration**
- Capture `solution_id` parameter
- Auto-generate token during registration
- Store user-solution entitlement
- Redirect with token

#### **Task 2.2: Registration URL**
```
marketplace.com/register?solution_id=faiss&return_url=faiss.com/search
```

### **Phase 3: FAISS Integration (1-2 hours)**

#### **Task 3.1: Token Caching**
```javascript
// Store token permanently
localStorage.setItem('marketplace_token', token);
localStorage.setItem('user_email', email);
```

#### **Task 3.2: API Validation**
```javascript
// Before every search
const canSearch = await validateWithMarketplace(token, 'search');
if (canSearch.allowed) {
  executeSearch();
} else {
  showUpgradePrompt(canSearch.message);
}
```

#### **Task 3.3: Registration Link**
```javascript
// When anonymous limit reached
const registerUrl = `https://marketplace.com/register?solution_id=faiss&return_url=${currentUrl}`;
```

---

## ⚡ **Quick MVP Todo List**

### **🔧 Backend (Marketplace)**
- [ ] Create `user-solution-entitlements` DynamoDB table
- [ ] Build token generation Lambda function
- [ ] Build token validation Lambda function  
- [ ] Update registration flow to handle `solution_id`
- [ ] Add redirect logic with token in URL

### **🎨 Frontend (FAISS)**
- [ ] Add token parameter handling on page load
- [ ] Implement localStorage token caching
- [ ] Add marketplace API validation before searches
- [ ] Update registration link with solution_id
- [ ] Add upgrade prompts with marketplace links

### **🔗 Integration**
- [ ] Test full flow: anonymous → register → token → validation
- [ ] Test quota enforcement via API calls
- [ ] Test upgrade flow: registered → pro
- [ ] Verify token persistence across browser sessions

---

## 🚀 **Quick MVP Implementation (4-6 hours total)**

### **Hour 1-2: Marketplace Backend**
```bash
# 1. Create entitlements table
# 2. Deploy token generation API
# 3. Deploy validation API
# 4. Update registration Lambda
```

### **Hour 3-4: FAISS Frontend**
```bash
# 1. Add token handling JavaScript
# 2. Implement API validation calls
# 3. Update registration links
# 4. Test token caching
```

### **Hour 5-6: Integration & Testing**
```bash
# 1. End-to-end flow testing
# 2. Quota validation testing
# 3. Upgrade flow testing
# 4. Cross-browser testing
```

---

## 📊 **Success Criteria**

### **✅ MVP Complete When:**
1. **Anonymous user** hits limit → gets registration link with solution_id
2. **Registration** creates permanent token for user-solution combo
3. **Redirect** delivers token via URL to FAISS
4. **FAISS** caches token and validates every request with marketplace
5. **Quota enforcement** works in real-time via API calls
6. **Upgrade flow** works for registered → pro transition

### **🎯 Key Metrics:**
- **Zero local access decisions** in FAISS
- **100% API validation** for all requests
- **Permanent token storage** working
- **Real-time quota enforcement** active

---

## 🔄 **Post-MVP Enhancements**

1. **Security**: Implement POST-based token exchange
2. **Performance**: Add API response caching
3. **Analytics**: Track usage patterns via control plane
4. **Multi-Solution**: Extend to other solutions beyond FAISS
5. **Admin Dashboard**: Control plane management UI

---

**🎯 Goal**: Transform current working integration into proper control plane architecture  
**⏱️ Timeline**: 4-6 hours for complete MVP  
**🚀 Priority**: Maintain current functionality while adding architectural improvements

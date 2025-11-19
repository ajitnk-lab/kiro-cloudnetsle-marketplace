# 🏗️ Marketplace Control Plane Architecture

## 📋 **Architecture Overview**

**Model**: Control Plane vs Data Plane Architecture  
**Date**: November 8, 2025  
**Status**: Implementation Ready

---

## 🎯 **Control Plane vs Data Plane Model**

### **🎛️ Marketplace (Control Plane)**
- **Authority**: User access, quotas, billing, entitlements
- **Responsibility**: Authentication, authorization, usage limits
- **Single Source of Truth**: All access decisions
- **Components**: User management, token generation, validation APIs

### **⚙️ Solutions (Data Plane)**
- **Authority**: Business logic execution only
- **Responsibility**: Execute requests, serve results
- **Dependency**: Must validate every request with control plane
- **Components**: Application logic, user interfaces, data processing

---

## 🔄 **User Flow Architecture**

### **Registration & Token Generation**
```
Anonymous Limit Reached
        ↓
Register Link: marketplace.com/register?solution_id=faiss
        ↓
Marketplace: User registration + permanent token generation
        ↓
Redirect: faiss.com?token=permanent_xyz&user_email=user@example.com
        ↓
FAISS: Cache token permanently in localStorage
```

### **Request Validation Flow**
```
User Request → FAISS (data plane)
             ↓
FAISS → Marketplace API: "Can token X do action Y?"
             ↓
Marketplace → Response: "Yes/No + quota + user info"
             ↓
FAISS → Execute request OR show upgrade prompt
```

---

## 🗄️ **Database Architecture**

### **Control Plane Tables**

#### **user-solution-entitlements**
```javascript
{
  pk: "user#email@example.com",           // Partition key
  sk: "solution#faiss",                   // Sort key
  user_email: "email@example.com",        // User identifier
  solution_id: "faiss",                   // Solution identifier
  access_tier: "registered|pro",          // Access level
  token: "tok_permanent_abc123",          // Permanent token
  created_at: "2025-11-08T17:00:00Z",    // Creation timestamp
  updated_at: "2025-11-08T17:00:00Z",    // Last update
  status: "active|suspended|cancelled"    // Entitlement status
}
```

#### **usage-tracking** (Optional)
```javascript
{
  pk: "token#tok_permanent_abc123",       // Partition key
  sk: "date#2025-11-08",                 // Sort key (daily tracking)
  solution_id: "faiss",                   // Solution identifier
  usage_count: 5,                        // Daily usage count
  last_request: "2025-11-08T17:30:00Z",  // Last request timestamp
  quota_limit: 10                        // Daily quota limit
}
```

### **Data Plane Storage**
- **FAISS**: Only caches tokens in localStorage
- **No Access Logic**: Solutions store no entitlement data
- **Stateless**: All access decisions via API calls

---

## 🔌 **API Architecture**

### **Control Plane APIs**

#### **Token Generation**
```javascript
POST /api/generate-solution-token
{
  "user_email": "user@example.com",
  "solution_id": "faiss",
  "access_tier": "registered"
}

Response:
{
  "token": "tok_permanent_abc123",
  "expires_at": null,  // Permanent token
  "redirect_url": "https://faiss.com?token=tok_permanent_abc123&user_email=user@example.com"
}
```

#### **Token Validation**
```javascript
POST /api/validate-token
{
  "token": "tok_permanent_abc123",
  "action": "search",
  "solution_id": "faiss"
}

Response:
{
  "allowed": true,
  "user_email": "user@example.com",
  "access_tier": "registered",
  "quota_remaining": 7,
  "quota_resets_at": "2025-11-09T00:00:00Z"
}
```

### **Data Plane Integration**
- **SDK Pattern**: Solutions use marketplace SDK for validation
- **Real-time**: Every request validated before execution
- **Caching**: Optional response caching for performance
- **Fallback**: Fail closed if control plane unavailable

---

## 🔒 **Security Architecture**

### **Token Security**
- **Permanent Tokens**: One per user-solution combination
- **Scope Limited**: Token valid only for specific solution
- **Immutable Users**: Email addresses cannot change
- **Secure Storage**: localStorage in solutions (HTTPS only)

### **API Security**
- **Authentication**: All API calls authenticated
- **Authorization**: Token-based access control
- **Rate Limiting**: Per-token rate limits
- **Audit Logging**: All access attempts logged

### **Data Protection**
- **Encryption**: All data encrypted at rest and in transit
- **PII Handling**: Minimal PII storage in solutions
- **Compliance**: GDPR/privacy compliance via control plane

---

## 📊 **Scalability Architecture**

### **Horizontal Scaling**
- **Control Plane**: Auto-scaling Lambda functions
- **Data Plane**: Independent solution scaling
- **Database**: DynamoDB auto-scaling
- **CDN**: CloudFront for global distribution

### **Multi-Solution Support**
```javascript
// Easy addition of new solutions
{
  "solution_id": "new-solution",
  "pricing_tiers": ["free", "pro", "enterprise"],
  "quota_limits": {
    "free": 5,
    "pro": 100,
    "enterprise": "unlimited"
  }
}
```

### **Performance Optimization**
- **Caching**: API response caching
- **CDN**: Static asset distribution
- **Database**: Optimized query patterns
- **Monitoring**: Real-time performance metrics

---

## 🎯 **Implementation Phases**

### **Phase 1: Control Plane APIs (2-3 hours)**
1. Create user-solution-entitlements table
2. Build token generation Lambda
3. Build token validation Lambda
4. Update registration flow

### **Phase 2: Data Plane Integration (1-2 hours)**
1. Add token handling to FAISS
2. Implement permanent token caching
3. Add real-time API validation
4. Update registration links

### **Phase 3: Testing & Validation (1-2 hours)**
1. End-to-end flow testing
2. Quota enforcement validation
3. Performance testing
4. Security validation

---

## 📈 **Benefits of Control Plane Architecture**

### **✅ Business Benefits**
- **Scalability**: Easy addition of new solutions
- **Centralization**: Single user/billing management
- **Flexibility**: Per-solution pricing models
- **Analytics**: Centralized usage tracking
- **Revenue**: Unified subscription management

### **✅ Technical Benefits**
- **Separation of Concerns**: Clear responsibilities
- **Security**: Centralized access control
- **Maintainability**: Independent solution updates
- **Reliability**: Single source of truth
- **Performance**: Optimized for scale

### **✅ Developer Benefits**
- **Simplified Integration**: Standard SDK pattern
- **Reduced Complexity**: No access logic in solutions
- **Faster Development**: Reusable control plane
- **Better Testing**: Clear API contracts
- **Documentation**: Standardized patterns

---

## 🔄 **Migration Strategy**

### **From Current to Control Plane**
1. **Maintain Compatibility**: Keep existing flows working
2. **Add New APIs**: Build control plane APIs alongside
3. **Gradual Migration**: Move solutions one by one
4. **Validation**: Test each migration thoroughly
5. **Cleanup**: Remove old patterns after migration

### **Zero Downtime Migration**
- **Blue-Green Deployment**: Parallel environments
- **Feature Flags**: Gradual rollout control
- **Rollback Plan**: Quick reversion if needed
- **Monitoring**: Real-time migration tracking

---

**🏗️ Architecture Status**: Ready for Implementation  
**⏱️ Implementation Time**: 4-6 hours for complete MVP  
**🎯 Goal**: Scalable, enterprise-grade control plane architecture  
**📅 Target**: Control plane MVP completion within 1 day

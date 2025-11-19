# Marketplace API Endpoints

## 🔐 Authentication Endpoints

### `/auth/register` 
- **POST** - User registration
- **Function**: RegisterFunction
- **Access**: Public

## 👤 User Management

### `/user/profile`
- **GET** - Get current user profile  
- **PUT** - Update current user profile
- **Function**: ProfileFunction
- **Access**: Authenticated users

### `/user/{userId}`
- **GET** - Get specific user details
- **Function**: UserManagementFunction  
- **Access**: Authenticated users

## 🏢 Partner Operations

### `/partner/applications`
- **POST** - Submit partner application
- **GET** - Get user's partner applications
- **Function**: PartnerApplicationFunction
- **Access**: Authenticated users

### `/partner/applications/{applicationId}`
- **GET** - Get specific application details
- **PUT** - Update partner application
- **Function**: PartnerApplicationFunction
- **Access**: Application owner

### `/partner/solutions`
- **POST** - Create new solution (partners only)
- **GET** - Get partner's solutions
- **Function**: CatalogFunction
- **Access**: Partners

### `/partner/solutions/{solutionId}`
- **PUT** - Update solution
- **DELETE** - Delete solution  
- **Function**: CatalogFunction
- **Access**: Solution owner

## 🛍️ Catalog (Public)

### `/catalog`
- **GET** - Browse all solutions
- **Function**: CatalogFunction
- **Access**: Public

### `/catalog/search`
- **GET** - Search solutions
- **Function**: CatalogFunction
- **Access**: Public

### `/catalog/categories`
- **GET** - Get solution categories
- **Function**: CatalogFunction
- **Access**: Public

### `/catalog/{solutionId}`
- **GET** - Get solution details
- **Function**: CatalogFunction
- **Access**: Public

### `/catalog/upload-image`
- **POST** - Upload solution images
- **Function**: CatalogFunction
- **Access**: Partners

## 👑 Admin Operations

### `/admin/users`
- **GET** - List all users
- **Function**: UserManagementFunction
- **Access**: Admins only

### `/admin/users/{userId}`
- **PUT** - Update user (role changes, etc.)
- **Function**: UserManagementFunction
- **Access**: Admins only

### `/admin/applications`
- **GET** - Get pending partner applications
- **Function**: AdminFunction
- **Access**: Admins only

### `/admin/applications/{applicationId}`
- **PUT** - Approve/reject partner applications
- **Function**: AdminFunction
- **Access**: Admins only

### `/admin/solutions`
- **GET** - Get all solutions for moderation
- **Function**: AdminFunction
- **Access**: Admins only

### `/admin/solutions/{solutionId}`
- **PUT** - Moderate solutions (approve/reject)
- **Function**: AdminFunction
- **Access**: Admins only

## 💳 Payment Operations

### `/payments/initiate`
- **POST** - Start payment process
- **Function**: PaymentInitiateFunction
- **Access**: Authenticated users

### `/payments/status/{transactionId}`
- **GET** - Check payment status
- **Function**: PaymentStatusFunction
- **Access**: Transaction owner

## 🔑 Access Control Summary

| Role | Permissions |
|------|-------------|
| **Anonymous** | Browse catalog, search solutions |
| **Customer** | All anonymous + profile management, payments |
| **Partner** | All customer + solution CRUD, partner applications |
| **Admin** | All partner + user management, application approvals, solution moderation |

## 🚀 Usage Examples

### Register New User
```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

### Submit Partner Application
```bash
POST /partner/applications
Authorization: Bearer <jwt-token>
{
  "businessName": "Tech Solutions Inc",
  "description": "We build awesome software",
  "website": "https://techsolutions.com"
}
```

### Create Solution (Partner)
```bash
POST /partner/solutions  
Authorization: Bearer <jwt-token>
{
  "name": "AI Analytics Dashboard",
  "description": "Real-time business analytics",
  "category": "Analytics",
  "pricing": {
    "model": "subscription",
    "amount": 99,
    "currency": "USD"
  }
}
```

### Search Solutions
```bash
GET /catalog/search?q=analytics&category=Business&minPrice=0&maxPrice=100
```

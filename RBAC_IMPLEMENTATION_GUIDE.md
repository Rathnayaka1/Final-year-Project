# Role-Based Access Control (RBAC) Implementation Guide

## Overview
The Smart Service Center Navigator now includes a comprehensive Role-Based Access Control system that restricts access to admin dashboard features based on user roles.

## Roles and Permissions

### 1. **Admin** - Full System Access
- **Description:** Full access to all dashboard features
- **Features Accessible:**
  - Services Management
  - Service Centers Management
  - Inventory (Stocks)
  - Payments
  - Appointments
  - Customer Loyalty
  - Technicians Management

**Use Case:** System administrators and top-level operators who need complete control.

---

### 2. **Manager** - Inventory and Income Analysis
- **Description:** Manage inventory and view income analysis chart
- **Features Accessible:**
  - Inventory (Stocks)
  - Payments (Income Analysis)
  - Appointments (View only)

**Use Case:** Store managers responsible for inventory levels and financial reporting.

---

### 3. **Supervisor** - Technician Management
- **Description:** Assign technicians and manage appointments
- **Features Accessible:**
  - Technicians Management
  - Appointments Management

**Use Case:** Service coordinators who assign and track technician work.

---

### 4. **Cashier** - Payment Processing
- **Description:** View and process payments
- **Features Accessible:**
  - Payments
  - Appointments (View only)

**Use Case:** Front-desk staff handling customer payments and payment records.

---

## Demo Credentials

Use these credentials to test different roles:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@servicecenter.dev | Admin123! |
| Manager | manager@servicecenter.dev | Manager123! |
| Supervisor | supervisor@servicecenter.dev | Supervisor123! |
| Cashier | cashier@servicecenter.dev | Cashier123! |

---

## Technical Implementation

### Frontend Files

#### 1. **`admin-web/src/utils/rolePermissions.js`**
Centralized configuration file that defines all roles and their permissions.

```javascript
// Import permissions utility
import { hasPermission, getAccessibleFeatures } from './utils/rolePermissions';

// Check if user has permission
const canViewInventory = hasPermission(userRole, 'stocks');

// Get all features for a role
const features = getAccessibleFeatures('manager');
```

**Key Functions:**
- `hasPermission(userRole, feature)` - Returns boolean
- `hasAnyPermission(userRole, features)` - Returns boolean
- `hasAllPermissions(userRole, features)` - Returns boolean
- `getAccessibleFeatures(userRole)` - Returns array of features
- `getRoleDescription(userRole)` - Returns role description

#### 2. **`admin-web/src/components/ProtectedFeature.jsx`**
Component wrapper that prevents rendering of unauthorized features.

```jsx
import ProtectedFeature from './components/ProtectedFeature';

// Usage
<ProtectedFeature 
  userRole={auth.user.role} 
  feature="stocks"
>
  <StockManager {...props} />
</ProtectedFeature>
```

#### 3. **`admin-web/src/App.jsx`**
Updated main app component with:
- Role-based tab visibility
- ProtectedFeature wrappers
- Role display in header
- Dynamic initial tab selection

#### 4. **`admin-web/src/components/LoginForm.jsx`**
Enhanced login form with:
- Demo account buttons by role
- Role information display
- Role selection assistance

### Backend Files

#### 1. **`backend/src/models/User.js`**
Updated User schema with new roles:
```javascript
role: { 
  type: String, 
  enum: ['admin', 'manager', 'supervisor', 'cashier'], 
  default: 'cashier' 
}
```

#### 2. **`backend/src/services/bootstrapService.js`**
Creates demo users for each role during database initialization.

---

## Feature Access Matrix

| Feature | Admin | Manager | Supervisor | Cashier |
|---------|-------|---------|------------|---------|
| Services | ✓ | ✗ | ✗ | ✗ |
| Service Centers | ✓ | ✗ | ✗ | ✗ |
| Inventory | ✓ | ✓ | ✗ | ✗ |
| Payments | ✓ | ✓ | ✗ | ✓ |
| Appointments | ✓ | ✓ | ✓ | ✓ |
| Loyalty | ✓ | ✗ | ✗ | ✗ |
| Technicians | ✓ | ✗ | ✓ | ✗ |

---

## How to Add New Features

### Step 1: Add Feature to Role Permissions
Edit `admin-web/src/utils/rolePermissions.js`:

```javascript
export const ROLE_PERMISSIONS = {
  admin: {
    label: 'Administrator',
    description: 'Full access to all dashboard features',
    features: [
      'services',
      'serviceCenters',
      'stocks',
      'payments',
      'appointments',
      'customerLoyalty',
      'technicians',
      'newFeature'  // Add here
    ]
  },
  // ... other roles
};
```

### Step 2: Add Role Check to Component
Wrap your component with `ProtectedFeature`:

```jsx
{hasPermission(auth.user.role, 'newFeature') && (
  <button 
    className={`tab-button ${activeTab === 'newfeature' ? 'active' : ''}`}
    onClick={() => setActiveTab('newfeature')}
  >
    New Feature
  </button>
)}

<ProtectedFeature userRole={auth.user.role} feature="newFeature">
  {activeTab === 'newfeature' && <NewFeature {...props} />}
</ProtectedFeature>
```

---

## How to Add a New Role

### Step 1: Update Backend User Model
Edit `backend/src/models/User.js`:

```javascript
role: { 
  type: String, 
  enum: ['admin', 'manager', 'supervisor', 'cashier', 'newRole'], 
  default: 'newRole' 
}
```

### Step 2: Define Role Permissions
Edit `admin-web/src/utils/rolePermissions.js`:

```javascript
export const ROLE_PERMISSIONS = {
  // ... existing roles
  newRole: {
    label: 'New Role',
    description: 'Description of new role',
    features: ['feature1', 'feature2']
  }
};
```

### Step 3: Create Demo User
Edit `backend/src/services/bootstrapService.js`:

```javascript
const defaultAdmins = [
  // ... existing users
  {
    name: 'New Role User',
    email: 'newrole@servicecenter.dev',
    role: 'newRole',
    password: 'NewRole123!'
  }
];
```

---

## Authentication Flow

1. **Login**
   - User enters email and password
   - Backend validates credentials
   - JWT token generated with role included
   - Token stored in localStorage

2. **Access Control**
   - Frontend reads role from stored auth data
   - Tab list filtered to show only accessible features
   - Components wrapped with `ProtectedFeature` checks
   - Unauthorized access attempts show "access denied" message

3. **Token Verification**
   - Backend middleware verifies JWT on each request
   - Role extracted from token claims
   - Request allowed/denied based on authorization

---

## Security Considerations

1. **Frontend Protection:** UI elements hidden based on permissions
2. **Backend Protection:** Always verify authorization on API calls
3. **Token Validation:** Backend validates JWT signature and expiration
4. **Role Encoding:** Frontend role derived from secure JWT token
5. **Audit Trail:** Log access attempts for compliance

## Adding Backend Authorization

To add backend authorization checks (recommended for production):

```javascript
// In route handler or middleware
async function checkPermission(req, res, next) {
  const userRole = req.user.role; // From JWT token
  
  if (!hasPermission(userRole, 'stockManagement')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  next();
}

// Use in routes
router.post('/stocks', checkPermission, updateStockHandler);
```

---

## Testing

### Manual Testing Steps

1. **Test Admin Role:**
   - Login with admin@servicecenter.dev / Admin123!
   - Verify all tabs visible
   - Verify all features accessible

2. **Test Manager Role:**
   - Login with manager@servicecenter.dev / Manager123!
   - Verify only: Inventory, Payments, Appointments tabs visible
   - Try accessing Services tab (should not appear)

3. **Test Supervisor Role:**
   - Login with supervisor@servicecenter.dev / Supervisor123!
   - Verify only: Technicians, Appointments tabs visible
   - Try accessing Payments tab (should not appear)

4. **Test Cashier Role:**
   - Login with cashier@servicecenter.dev / Cashier123!
   - Verify only: Payments, Appointments tabs visible
   - Try accessing Inventory tab (should not appear)

---

## File Summary

### Created Files
- `admin-web/src/utils/rolePermissions.js` - RBAC Configuration
- `admin-web/src/components/ProtectedFeature.jsx` - Access control component

### Modified Files
- `admin-web/src/App.jsx` - Role-based UI implementation
- `admin-web/src/components/LoginForm.jsx` - Enhanced login UI
- `admin-web/src/index.css` - Role badge styling
- `backend/src/models/User.js` - New roles
- `backend/src/services/bootstrapService.js` - Demo users

---

## Future Enhancements

1. **Granular Permissions:** Implement feature-level permissions (read, write, delete)
2. **Dynamic Roles:** Allow admin to create custom roles
3. **Permission Auditing:** Log all access attempts and role changes
4. **Backend Authorization:** Add middleware checks for all API endpoints
5. **Role Inheritance:** Create role hierarchies
6. **Time-based Access:** Implement temporary role upgrades
7. **Department-based Roles:** Extend permissions by department

---

## Support

For issues or questions regarding RBAC implementation, refer to:
- `admin-web/src/utils/rolePermissions.js` for role definitions
- `admin-web/src/components/ProtectedFeature.jsx` for access control logic
- Backend User model and token payload structure

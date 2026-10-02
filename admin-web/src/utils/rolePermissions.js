/**
 * Role-Based Access Control (RBAC) Configuration
 * Defines permissions and accessible features for each role
 */

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SUPERVISOR: 'supervisor',
  CASHIER: 'cashier',
  RECEPTIONIST: 'receptionist'
};

export const ROLE_LABELS = {
  admin: 'Administrator',
  manager: 'Manager',
  supervisor: 'Supervisor',
  cashier: 'Cashier',
  receptionist: 'Receptionist'
};

/**
 * Feature permissions by role
 * Each role has an array of accessible features/tabs
 */
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
      'technicians'
    ]
  },
  manager: {
    label: 'Manager',
    description: 'Manage inventory and view income analysis',
    features: [
      'stocks',
      'payments',
      'appointments'
    ]
  },
  supervisor: {
    label: 'Supervisor',
    description: 'Assign technicians and manage appointments',
    features: [
      'technicians',
      'appointments'
    ]
  },
  cashier: {
    label: 'Cashier',
    description: 'View and process payments',
    features: [
      'payments',
      'appointments'
    ]
  },
  receptionist: {
    label: 'Receptionist',
    description: 'Manage appointments, customer information, and technician availability',
    features: [
      'appointments',
      'customerLoyalty',
      'technicians'
    ]
  }
};

/**
 * Check if a user role has permission to access a feature
 * @param {string} userRole - The user's role
 * @param {string} feature - The feature to check access for
 * @returns {boolean} - True if user can access the feature
 */
export function hasPermission(userRole, feature) {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) {
    return false;
  }
  return ROLE_PERMISSIONS[userRole].features.includes(feature);
}

/**
 * Check if a user role has any of the specified permissions
 * @param {string} userRole - The user's role
 * @param {string[]} features - Array of features to check
 * @returns {boolean} - True if user can access any of the features
 */
export function hasAnyPermission(userRole, features = []) {
  return features.some(feature => hasPermission(userRole, feature));
}

/**
 * Check if a user role has all of the specified permissions
 * @param {string} userRole - The user's role
 * @param {string[]} features - Array of features to check
 * @returns {boolean} - True if user can access all features
 */
export function hasAllPermissions(userRole, features = []) {
  return features.every(feature => hasPermission(userRole, feature));
}

/**
 * Get accessible features for a role
 * @param {string} userRole - The user's role
 * @returns {string[]} - Array of accessible features
 */
export function getAccessibleFeatures(userRole) {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) {
    return [];
  }
  return ROLE_PERMISSIONS[userRole].features;
}

/**
 * Get role description
 * @param {string} userRole - The user's role
 * @returns {string} - Role description
 */
export function getRoleDescription(userRole) {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) {
    return 'Unknown Role';
  }
  return ROLE_PERMISSIONS[userRole].description;
}

export default {
  ROLES,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getAccessibleFeatures,
  getRoleDescription
};

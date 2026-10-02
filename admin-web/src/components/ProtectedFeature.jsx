import React from 'react';
import { hasPermission } from '../utils/rolePermissions';

/**
 * ProtectedFeature Component
 * Renders content only if the user has permission to access the feature
 * 
 * @param {Object} props
 * @param {string} props.userRole - The user's role
 * @param {string} props.feature - The feature to protect
 * @param {React.ReactNode} props.children - Content to render if user has access
 * @param {React.ReactNode} props.fallback - Content to render if user doesn't have access (optional)
 */
export default function ProtectedFeature({ 
  userRole, 
  feature, 
  children, 
  fallback = null 
}) {
  if (!hasPermission(userRole, feature)) {
    return fallback || (
      <div className="access-denied">
        <p>⛔ You don't have permission to access this feature.</p>
      </div>
    );
  }

  return <>{children}</>;
}

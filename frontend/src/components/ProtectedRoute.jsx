import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, hasRole } from '../utils/auth';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;

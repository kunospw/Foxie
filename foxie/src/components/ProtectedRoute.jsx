import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-800">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-[#f06937]"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/" state={{ from: location }} replace />;
};

export default ProtectedRoute;
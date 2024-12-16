import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Import AuthContext

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />; // Redirect to login if not authenticated
  }

  return children; // Render protected content if authenticated
};

export default ProtectedRoute;

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Card, CardContent } from '../ui/card';

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="loading-spinner w-8 h-8"></div>
  </div>
);

const ProtectedRoute = ({ 
  children, 
  requireOnboarding = false, 
  requireThresholdKeys = false,
  fallback = null 
}) => {
  const { 
    isAuthenticated, 
    loading, 
    user, 
    isOnboardingComplete, 
    hasThresholdKeys 
  } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return fallback || <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check onboarding requirements
  if (requireOnboarding && !isOnboardingComplete()) {
    return <Navigate to="/profile-setup" replace />;
  }

  // Check threshold keys requirements
  if (requireThresholdKeys && !hasThresholdKeys()) {
    return <Navigate to="/getting-started" replace />;
  }

  // Render protected content
  return children;
};

export const OnboardingGate = ({ children }) => {
  const { isOnboardingComplete } = useAuth();
  
  if (!isOnboardingComplete()) {
    return (
      <div className="auth-container">
        <Card className="auth-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Complete Your Profile</h2>
              <p className="text-gray-600 mb-6">
                Please complete your profile setup to continue using Bonded.
              </p>
              <Navigate to="/profile-setup" replace />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
};

export const ThresholdKeysGate = ({ children }) => {
  const { hasThresholdKeys } = useAuth();
  
  if (!hasThresholdKeys()) {
    return (
      <div className="auth-container">
        <Card className="auth-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Security Setup Required</h2>
              <p className="text-gray-600 mb-6">
                Please set up your threshold keys for secure evidence management.
              </p>
              <Navigate to="/getting-started" replace />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
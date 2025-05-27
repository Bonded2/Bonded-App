import React, { createContext, useContext, useEffect } from 'react';
import useAuthStore from '../../store/auth';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const authStore = useAuthStore();

  useEffect(() => {
    // Initialize authentication on app start
    authStore.init();
  }, []);

  const value = {
    // Authentication state
    isAuthenticated: authStore.isAuthenticated,
    user: authStore.user,
    principal: authStore.principal,
    session: authStore.session,
    loading: authStore.loading,
    error: authStore.error,
    
    // Threshold key state
    thresholdKeys: authStore.thresholdKeys,
    
    // Authentication methods
    login: authStore.login,
    logout: authStore.logout,
    updateUser: authStore.updateUser,
    
    // Threshold key methods
    setupThresholdKeys: authStore.setupThresholdKeys,
    getThresholdKeys: authStore.getThresholdKeys,
    
    // Utility methods
    clearError: authStore.clearError,
    isOnboardingComplete: authStore.isOnboardingComplete,
    hasThresholdKeys: authStore.hasThresholdKeys,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
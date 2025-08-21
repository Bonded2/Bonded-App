import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "../../icons/ArrowBack";
import { EditProfileModal } from "../../components/EditProfileModal";
import icpUserService from "../../services/icpUserService";
import { CustomTextField } from "../../components/CustomTextField/CustomTextField";
import { SettingsLoadingSkeleton } from "../../components/LoadingSkeleton/LoadingSkeleton";
import "./style.css";
const AccountTopBar = ({ onBackClick }) => {
  return (
    <div className="account-top-bar">
      <div className="top-bar-content">
        <div onClick={onBackClick} className="back-button">
          <ArrowBack className="back-icon" />
        </div>
        <div className="top-bar-title">Your account</div>
      </div>
    </div>
  );
};
export const Account = () => {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnbondConfirm, setShowUnbondConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // OPTIMIZATION: Loading state
  const [userData, setUserData] = useState({
    fullName: "",
    email: "",
    dateOfBirth: "",
    nationality: null,
    currentCity: null,
    currentCountry: null
  });
  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  // OPTIMIZED: Load user data from ICP with loading states
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true); // Start loading
        
        // OPTIMIZATION: Start initialization and user fetch concurrently
        const [_, currentUser] = await Promise.all([
          icpUserService.initialize(),
          // Use timeout to prevent hanging
          Promise.race([
            icpUserService.getCurrentUser(true),
            new Promise(resolve => setTimeout(() => resolve(null), 5000)) // 5 second timeout
          ])
        ]);
        
        if (currentUser && currentUser.settings && currentUser.settings.profileMetadata) {
          const profileData = JSON.parse(currentUser.settings.profileMetadata);
          setUserData(profileData);
        } else {
          // If no profile data, show empty profile
          setUserData({
            fullName: "",
            email: "",
            dateOfBirth: "",
            nationality: null,
            currentCity: null,
            currentCountry: null
          });
        }
      } catch (error) {
        // If ICP data fails, show empty profile
        setUserData({
          fullName: "",
          email: "",
          dateOfBirth: "",
          nationality: null,
          currentCity: null,
          currentCountry: null
        });
      } finally {
        setIsLoading(false); // End loading regardless of success/failure
      }
    };
    loadUserData();
  }, []);
  const handleBackClick = () => {
    navigate('/timeline');
  };
  const handleEditProfile = () => {
    setShowEditModal(true);
  };
  const handleCloseEditModal = async () => {
    setShowEditModal(false);
    // Refresh user data from ICP
    try {
      const currentUser = await icpUserService.getCurrentUser(true);
      if (currentUser && currentUser.settings && currentUser.settings.profileMetadata) {
        const profileData = JSON.parse(currentUser.settings.profileMetadata);
        setUserData(profileData);
      }
    } catch (error) {
      // Handle error silently
    }
  };
  const handleDeleteAccount = async () => {
    if (showDeleteConfirm) {
      // Delete account first while user is still authenticated, then log out
      try {
        // Delete the account while still authenticated
        await icpUserService.deleteAccount();
        // Now log out the user
        await icpUserService.logout();
        // Navigate to home
        navigate('/');
      } catch (error) {
        // Failed to delete account - even if deletion fails, log out and navigate (for UX)
        try {
          await icpUserService.logout();
          navigate('/');
        } catch (logoutError) {
          // Failed to logout after delete error - continue with navigation
          navigate('/');
        }
      }
    } else {
      setShowDeleteConfirm(true);
      setShowUnbondConfirm(false);
    }
  };
  const handleUnbondPartner = () => {
    if (showUnbondConfirm) {
      // Actual unbonding logic would go here
      navigate('/');
    } else {
      setShowUnbondConfirm(true);
      setShowDeleteConfirm(false);
    }
  };
  const cancelAction = () => {
    setShowDeleteConfirm(false);
    setShowUnbondConfirm(false);
  };
  // Password change handlers
  const handleTogglePasswordForm = () => {
    setShowPasswordForm(!showPasswordForm);
    // Reset form on toggle
    if (!showPasswordForm) {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setPasswordErrors({});
      setPasswordSuccess(false);
    }
  };
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when typing
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };
  const validatePasswordForm = () => {
    const newErrors = {};
    // Simulate checking current password against stored password
    // In a real app, this would verify against backend/stored password
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }
    if (!passwordData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!validatePasswordForm()) {
      return;
    }
    // In a real app, this would call an API to change the password
    // Show success message
    setPasswordSuccess(true);
    // Reset form after successful submission
    setTimeout(() => {
      setShowPasswordForm(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setPasswordSuccess(false);
    }, 2000);
  };
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };
  // OPTIMIZATION: Show loading skeleton while data loads
  if (isLoading) {
    return (
      <div className="account-screen">
        <AccountTopBar onBackClick={handleBackClick} />
        <div className="account-content">
          <SettingsLoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="account-screen">
      <AccountTopBar onBackClick={handleBackClick} />
      <div className="account-content">
        <div className="account-section">
          <h2 className="section-title">Profile information</h2>
          <div className="profile-info">
            <p className="profile-label">Name</p>
            <p className="profile-value">{userData.fullName}</p>
          </div>
          <div className="profile-info">
            <p className="profile-label">Email</p>
            <p className="profile-value">{userData.email}</p>
          </div>
          {userData.dateOfBirth && (
            <div className="profile-info">
              <p className="profile-label">Date of Birth</p>
              <p className="profile-value">{formatDate(userData.dateOfBirth)}</p>
            </div>
          )}
          {userData.nationality && (
            <div className="profile-info">
              <p className="profile-label">Nationality</p>
              <p className="profile-value">{userData.nationality.label}</p>
            </div>
          )}
          {userData.currentCity && (
            <div className="profile-info">
              <p className="profile-label">Current City</p>
              <p className="profile-value">{typeof userData.currentCity === 'object' ? userData.currentCity.label : userData.currentCity}</p>
            </div>
          )}
          {userData.currentCountry && (
            <div className="profile-info">
              <p className="profile-label">Current Country</p>
              <p className="profile-value">{userData.currentCountry.label}</p>
            </div>
          )}
          <button className="edit-button" onClick={handleEditProfile}>Edit Profile</button>
        </div>
        <div className="account-divider"></div>
        <div className="account-section">
          <h2 className="section-title">Security</h2>
          <button 
            className="account-action-button"
            onClick={handleTogglePasswordForm}
          >
            {showPasswordForm ? "Cancel" : "Change Password"}
          </button>
          {showPasswordForm && (
            <form className="password-form" onSubmit={handlePasswordSubmit}>
              {passwordSuccess ? (
                <div className="success-message">
                  Password changed successfully!
                </div>
              ) : (
                <>
                  <div className="form-field">
                    <CustomTextField
                      label="Current Password"
                      name="currentPassword"
                      type="password"
                      placeholder="Enter your current password"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      supportingText={passwordErrors.currentPassword || " "}
                      className={passwordErrors.currentPassword ? "input-error" : ""}
                    />
                  </div>
                  <div className="form-field">
                    <CustomTextField
                      label="New Password"
                      name="newPassword"
                      type="password"
                      placeholder="Enter new password"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      supportingText={passwordErrors.newPassword || "Minimum 8 characters"}
                      className={passwordErrors.newPassword ? "input-error" : ""}
                    />
                  </div>
                  <div className="form-field">
                    <CustomTextField
                      label="Confirm New Password"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      supportingText={passwordErrors.confirmPassword || " "}
                      className={passwordErrors.confirmPassword ? "input-error" : ""}
                    />
                  </div>
                  <button type="submit" className="submit-button">
                    Update Password
                  </button>
                </>
              )}
            </form>
          )}
        </div>
        <div className="account-divider"></div>
        <div className="account-section">
          <h2 className="section-title">Partner connection</h2>
          <div className="partner-status">
            <p className="status-label">Status</p>
            <p className="status-value connected">Connected</p>
          </div>
          <div className="partner-info">
            <p className="profile-label">Partner name</p>
            <p className="profile-value">Jane Doe</p>
          </div>
        </div>
        <div className="account-divider"></div>
        <div className="account-section danger-section">
          <h2 className="section-title danger-title">Unbond from partner</h2>
          {!showUnbondConfirm ? (
            <button 
              className="danger-button" 
              onClick={handleUnbondPartner}
            >
              Unbond from partner
            </button>
          ) : (
            <>
              <p className="danger-description">
                If you do this both of you will lose all access to all your shared data permanently.
              </p>
              <div className="danger-actions">
                <button 
                  className="danger-confirm-button" 
                  onClick={handleUnbondPartner}
                >
                  Confirm unbond
                </button>
                <button 
                  className="danger-cancel-button" 
                  onClick={cancelAction}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
        <div className="account-divider"></div>
        <div className="account-section danger-section">
          <h2 className="section-title danger-title">Remove data or delete Account</h2>
          {!showDeleteConfirm ? (
            <button 
              className="danger-button" 
              onClick={handleDeleteAccount}
            >
              Delete account
            </button>
          ) : (
            <>
              <p className="danger-description">
                I would like to delete my account and all my data.
              </p>
              <div className="danger-actions">
                <button 
                  className="danger-confirm-button" 
                  onClick={handleDeleteAccount}
                >
                  Delete account
                </button>
                <button 
                  className="danger-cancel-button" 
                  onClick={cancelAction}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {showEditModal && <EditProfileModal onClose={handleCloseEditModal} />}
    </div>
  );
}; 
export default Account;

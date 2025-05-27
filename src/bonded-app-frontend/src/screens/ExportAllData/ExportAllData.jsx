import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExportEmailModal } from "../../components/ExportEmailModal";

export const ExportAllData = ({ onClose }) => {
  const navigate = useNavigate();
  const [exportFormat, setExportFormat] = useState("zip");
  const [dataToExport, setDataToExport] = useState({
    timeline: true,
    profileData: true,
    mediaFiles: true
  });
  const [paymentMethod, setPaymentMethod] = useState("creditCard");
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [exportInProgress, setExportInProgress] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [currentStep, setCurrentStep] = useState("options"); // options, payment, email, exporting, complete
  const [showEmailModal, setShowEmailModal] = useState(false);

  const handleBack = () => {
    if (currentStep === "payment") {
      setCurrentStep("options");
      return;
    }
    
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  const handleFormatChange = (format) => {
    setExportFormat(format);
  };

  const handleCheckboxChange = (key) => {
    setDataToExport({
      ...dataToExport,
      [key]: !dataToExport[key]
    });
  };

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
  };

  const handleProceedToPayment = () => {
    setCurrentStep("payment");
  };

  const handleProcessPayment = () => {
    // Start payment process
    setPaymentInProgress(true);
    
    // Simulate payment process - would be an actual payment gateway in production
    setTimeout(() => {
      setPaymentInProgress(false);
      // After payment succeeds, show email modal
      setShowEmailModal(true);
    }, 2000);
  };

  const handleCancelEmail = () => {
    // If user cancels email entry, go back to payment step
    setShowEmailModal(false);
  };

  const handleConfirmEmail = (email) => {
    // Save the email and move to export process
    setUserEmail(email);
    setShowEmailModal(false);
    setCurrentStep("exporting");
    startExport();
  };

  const startExport = () => {
    // Start export process
    setExportInProgress(true);
    
    // Simulate export process - would be an actual API call in production
    setTimeout(() => {
      setExportInProgress(false);
      setExportComplete(true);
      setCurrentStep("complete");
    }, 3000);
  };

  const handleLeaveApp = () => {
    // In a real app, this would clear user data and redirect to registration
    navigate("/");
  };

  return (
    <div className="export-all-data-screen">
      <div className="export-all-data-container">
        <div className="top-app-bar">
          <div className="frame-14">
            <div className="back-icon" onClick={handleBack}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="#FF704D"/>
              </svg>
            </div>
            <div className="header-title">Export all data</div>
          </div>
        </div>

        <div className="export-all-content">
          {currentStep === "options" && (
            <>
              <div className="section-title">Export format</div>
              
              <div className="format-options">
                <div 
                  className={`format-option ${exportFormat === 'zip' ? 'selected' : ''}`} 
                  onClick={() => handleFormatChange('zip')}
                >
                  <div className="format-circle">
                    {exportFormat === 'zip' && <div className="format-circle-inner"></div>}
                  </div>
                  <div className="format-label">ZIP</div>
                </div>
                
                <div 
                  className={`format-option ${exportFormat === 'pdf' ? 'selected' : ''}`}
                  onClick={() => handleFormatChange('pdf')}
                >
                  <div className="format-circle">
                    {exportFormat === 'pdf' && <div className="format-circle-inner"></div>}
                  </div>
                  <div className="format-label">PDF</div>
                </div>
              </div>

              <div className="section-title">Data to export</div>
              
              <div className="data-options">
                <div className="data-option">
                  <div 
                    className={`checkbox ${dataToExport.timeline ? 'checked' : ''}`}
                    onClick={() => handleCheckboxChange('timeline')}
                  >
                    {dataToExport.timeline && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 16.2L4.8 12L3.4 13.4L9 19L21 7L19.6 5.6L9 16.2Z" fill="#2C4CDF"/>
                      </svg>
                    )}
                  </div>
                  <div className="data-label">Timeline</div>
                </div>
                
                <div className="data-option">
                  <div 
                    className={`checkbox ${dataToExport.profileData ? 'checked' : ''}`}
                    onClick={() => handleCheckboxChange('profileData')}
                  >
                    {dataToExport.profileData && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 16.2L4.8 12L3.4 13.4L9 19L21 7L19.6 5.6L9 16.2Z" fill="#2C4CDF"/>
                      </svg>
                    )}
                  </div>
                  <div className="data-label">Profile Data</div>
                </div>
                
                <div className="data-option">
                  <div 
                    className={`checkbox ${dataToExport.mediaFiles ? 'checked' : ''}`}
                    onClick={() => handleCheckboxChange('mediaFiles')}
                  >
                    {dataToExport.mediaFiles && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 16.2L4.8 12L3.4 13.4L9 19L21 7L19.6 5.6L9 16.2Z" fill="#2C4CDF"/>
                      </svg>
                    )}
                  </div>
                  <div className="data-label">Media Files</div>
                </div>
              </div>

              <div className="price-info">
                <div className="price-tag">$5.99</div>
                <div className="price-description">One-time payment</div>
              </div>

              <div className="export-notice">
                <p>You are about to purchase and export all your data from Bonded. This will allow you to take your data with you. Once you leave, your account will be deactivated.</p>
              </div>
              
              <button 
                className="export-all-btn"
                onClick={handleProceedToPayment}
                disabled={!Object.values(dataToExport).some(v => v)}
              >
                <div className="btn-text">Proceed to Payment</div>
              </button>
            </>
          )}

          {currentStep === "payment" && (
            <>
              <div className="section-title">Payment method</div>
              
              <div className="payment-options">
                <div 
                  className={`payment-option ${paymentMethod === 'creditCard' ? 'selected' : ''}`} 
                  onClick={() => handlePaymentMethodChange('creditCard')}
                >
                  <div className="payment-circle">
                    {paymentMethod === 'creditCard' && <div className="payment-circle-inner"></div>}
                  </div>
                  <div className="payment-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z" fill="#FFFFFF"/>
                    </svg>
                  </div>
                  <div className="payment-label">Credit Card</div>
                </div>
                
                <div 
                  className={`payment-option ${paymentMethod === 'paypal' ? 'selected' : ''}`}
                  onClick={() => handlePaymentMethodChange('paypal')}
                >
                  <div className="payment-circle">
                    {paymentMethod === 'paypal' && <div className="payment-circle-inner"></div>}
                  </div>
                  <div className="payment-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.5 5.7C17.3 5.3 17.1 5 16.8 4.8C16.6 4.6 16.3 4.5 16 4.5H7C6.7 4.5 6.4 4.6 6.1 4.8C5.9 5 5.7 5.3 5.5 5.7C5.3 6.1 5.2 6.6 5.2 7.1C5.2 7.8 5.4 8.5 5.7 9.1C5.3 9.1 5 9.2 4.8 9.4C4.6 9.6 4.5 9.9 4.5 10.2V13.5C4.5 13.8 4.6 14 4.7 14.2C4.9 14.4 5.1 14.5 5.3 14.5H10.8L11.6 16.5H6.5V17.5H13.5V16.5H13.4L12.6 14.5H17.7C17.9 14.5 18.1 14.4 18.3 14.2C18.4 14 18.5 13.8 18.5 13.5V10.2C18.5 9.9 18.4 9.6 18.2 9.4C18 9.2 17.7 9.1 17.3 9.1C17.6 8.5 17.8 7.8 17.8 7.1C17.8 6.6 17.7 6.1 17.5 5.7ZM17.5 13.5H5.5V10.5H17.5V13.5ZM7 8.5C6.7 8.3 6.5 8 6.4 7.6C6.3 7.2 6.3 6.9 6.3 6.6C6.3 6.3 6.4 6 6.5 5.8C6.6 5.6 6.8 5.5 7 5.5H16C16.2 5.5 16.4 5.6 16.5 5.8C16.6 6 16.7 6.3 16.7 6.6C16.7 6.9 16.7 7.2 16.6 7.6C16.5 8 16.3 8.3 16 8.5H7Z" fill="#FFFFFF"/>
                    </svg>
                  </div>
                  <div className="payment-label">PayPal</div>
                </div>
              </div>

              <div className="payment-form">
                {paymentMethod === 'creditCard' && (
                  <>
                    <div className="form-group">
                      <label>Card Number</label>
                      <input type="text" placeholder="1234 5678 9012 3456" />
                    </div>
                    <div className="form-row">
                      <div className="form-group half">
                        <label>Expiry Date</label>
                        <input type="text" placeholder="MM/YY" />
                      </div>
                      <div className="form-group half">
                        <label>CVC</label>
                        <input type="text" placeholder="123" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Cardholder Name</label>
                      <input type="text" placeholder="John Doe" />
                    </div>
                  </>
                )}
                
                {paymentMethod === 'paypal' && (
                  <div className="paypal-info">
                    <p>You will be redirected to PayPal to complete your payment.</p>
                  </div>
                )}
              </div>

              <div className="payment-summary">
                <div className="summary-row">
                  <div className="summary-label">Export fee:</div>
                  <div className="summary-value">$5.99</div>
                </div>
                <div className="summary-row total">
                  <div className="summary-label">Total:</div>
                  <div className="summary-value">$5.99</div>
                </div>
              </div>
              
              <button 
                className={`export-all-btn ${paymentInProgress ? 'loading' : ''}`} 
                onClick={handleProcessPayment}
                disabled={paymentInProgress}
              >
                <div className="btn-text">
                  {paymentInProgress ? 'Processing...' : 'Pay & Export'}
                </div>
                {paymentInProgress && (
                  <div className="loading-spinner"></div>
                )}
              </button>
            </>
          )}

          {currentStep === "exporting" && (
            <div className="exporting-state">
              <div className="exporting-icon">
                <div className="big-spinner"></div>
              </div>
              <div className="exporting-text">Exporting your data...</div>
              <div className="exporting-subtext">This may take a few moments</div>
              {userEmail && (
                <div className="export-email-info">
                  <p>Your data will be sent to:</p>
                  <p className="export-email-address">{userEmail}</p>
                </div>
              )}
            </div>
          )}

          {currentStep === "complete" && (
            <div className="export-complete">
              <div className="complete-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="#B9FF46"/>
                </svg>
              </div>
              <div className="complete-text">Export complete!</div>
              <div className="complete-description">
                {userEmail ? (
                  <>Your data has been exported successfully and sent to <span className="email-highlight">{userEmail}</span>.</>
                ) : (
                  <>Your data has been exported successfully and is ready for download.</>
                )}
              </div>
              <button className="download-btn">
                <div className="btn-text">Download</div>
              </button>
              <button className="leave-app-btn" onClick={handleLeaveApp}>
                <div className="btn-text">Leave Bonded</div>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Email Modal */}
      {showEmailModal && (
        <ExportEmailModal 
          onClose={handleCancelEmail} 
          onConfirm={handleConfirmEmail}
        />
      )}
    </div>
  );
}; 
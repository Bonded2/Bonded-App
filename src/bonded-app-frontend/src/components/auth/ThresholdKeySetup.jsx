import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

const ThresholdKeySetup = () => {
  const { setupThresholdKeys, getThresholdKeys, thresholdKeys, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  
  const [setupStep, setSetupStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [keyConfig, setKeyConfig] = useState({
    threshold: 2,
    totalShares: 3,
  });
  const [generatedKeys, setGeneratedKeys] = useState(null);
  const [understanding, setUnderstanding] = useState({
    concept: false,
    security: false,
    responsibility: false,
  });

  useEffect(() => {
    const checkExistingKeys = async () => {
      const keys = await getThresholdKeys();
      if (keys && keys.is_active) {
        navigate('/timeline');
      }
    };
    
    checkExistingKeys();
  }, []);

  useEffect(() => {
    const stepProgress = {
      1: 25,
      2: 50,
      3: 75,
      4: 100,
    };
    setProgress(stepProgress[setupStep] || 0);
  }, [setupStep]);

  const handleUnderstandingChange = (key, value) => {
    setUnderstanding(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const canProceedFromStep1 = () => {
    return Object.values(understanding).every(Boolean);
  };

  const handleGenerateKeys = async () => {
    try {
      clearError();
      const keys = await setupThresholdKeys(keyConfig.threshold, keyConfig.totalShares);
      setGeneratedKeys(keys);
      setSetupStep(4);
    } catch (err) {
      console.error('Key generation failed:', err);
    }
  };

  const handleComplete = () => {
    navigate('/timeline');
  };

  const renderStep1 = () => (
    <div className="w-full">
      <h2 className="font-trocchi text-2xl font-normal text-primary mb-2 text-center">Threshold Key Security</h2>
      <p className="text-white text-center mb-6">Learn how threshold cryptography protects your evidence</p>

      <div className="space-y-4">
        <div className="bg-white/10 border border-white/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <div className="flex-1">
              <h3 className="font-rethink text-white font-semibold mb-2">What are Threshold Keys?</h3>
              <p className="text-white text-sm mb-3">
                Threshold cryptography splits your encryption key into multiple shares. You need a minimum number 
                of shares (the "threshold") to decrypt your data, providing security even if some shares are compromised.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="concept"
                  checked={understanding.concept}
                  onChange={(e) => handleUnderstandingChange('concept', e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-white accent-white focus:ring-2 focus:ring-white/20"
                />
                <label htmlFor="concept" className="text-white font-rethink font-medium cursor-pointer">
                  I understand the concept of threshold cryptography
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 border border-white/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <div className="flex-1">
              <h3 className="font-rethink text-white font-semibold mb-2">Enhanced Security</h3>
              <p className="text-white text-sm mb-3">
                With 2-of-3 threshold keys, an attacker would need to compromise at least 2 key shares 
                to access your data. This is significantly more secure than traditional single-key systems.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="security"
                  checked={understanding.security}
                  onChange={(e) => handleUnderstandingChange('security', e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-white accent-white focus:ring-2 focus:ring-white/20"
                />
                <label htmlFor="security" className="text-white font-rethink font-medium cursor-pointer">
                  I understand the security benefits
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 border border-white/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <div className="w-2 h-2 bg-black rounded-full"></div>
            </div>
            <div className="flex-1">
              <h3 className="font-rethink text-white font-semibold mb-2">Your Responsibility</h3>
              <p className="text-white text-sm mb-3">
                You are responsible for securely storing your key shares. If you lose access to enough shares, 
                your encrypted evidence cannot be recovered. Bonded cannot recover lost keys.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="responsibility"
                  checked={understanding.responsibility}
                  onChange={(e) => handleUnderstandingChange('responsibility', e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-white accent-white focus:ring-2 focus:ring-white/20"
                />
                <label htmlFor="responsibility" className="text-white font-rethink font-medium cursor-pointer">
                  I understand my responsibility for key management
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="w-full">
      <h2 className="font-trocchi text-2xl font-normal text-primary mb-2 text-center">Key Configuration</h2>
      <p className="text-white text-center mb-6">Configure your threshold key parameters</p>

      <div className="space-y-6">
        <div className="bg-white/10 border border-white/50 rounded-lg p-6">
          <h3 className="font-rethink text-white font-semibold mb-4 text-center">Recommended Configuration</h3>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="text-center p-6 border-2 border-primary rounded-lg bg-primary/10">
              <div className="text-4xl font-bold text-primary mb-2">{keyConfig.threshold}</div>
              <div className="text-white font-rethink font-medium">Required Shares</div>
            </div>
            <div className="text-center p-6 border-2 border-white rounded-lg bg-white/10">
              <div className="text-4xl font-bold text-white mb-2">{keyConfig.totalShares}</div>
              <div className="text-white font-rethink font-medium">Total Shares</div>
            </div>
          </div>

          <p className="text-white text-center font-rethink">
            You'll need {keyConfig.threshold} out of {keyConfig.totalShares} key shares to access your evidence
          </p>
        </div>

        <div className="bg-white/10 border border-white/50 rounded-lg p-4">
          <h4 className="font-rethink text-white font-semibold mb-3">Why 2-of-3?</h4>
          <ul className="text-white space-y-2 font-rethink">
            <li className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <span>Protects against single point of failure</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <span>Allows recovery if one share is lost</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <span>Prevents unauthorized access with single share</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <span>Balanced security and usability</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="w-full">
      <h2 className="font-trocchi text-2xl font-normal text-primary mb-2 text-center">Key Distribution</h2>
      <p className="text-white text-center mb-6">Understanding how your keys will be managed</p>

      <div className="space-y-6">
        <div className="bg-white/10 border border-white/50 rounded-lg p-6">
          <h3 className="font-rethink text-white font-semibold mb-6 text-center">Key Share Distribution</h3>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 border border-white/30 rounded-lg bg-white/5">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <div className="font-rethink text-white font-semibold">Local Device Storage</div>
                <div className="text-white/80 font-rethink">Encrypted on your current device</div>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 border border-white/30 rounded-lg bg-white/5">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <div className="font-rethink text-white font-semibold">Internet Computer Storage</div>
                <div className="text-white/80 font-rethink">Securely stored on the IC blockchain</div>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 border border-white/30 rounded-lg bg-white/5">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <div className="font-rethink text-white font-semibold">Recovery Share</div>
                <div className="text-white/80 font-rethink">For account recovery (future feature)</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-400/20 border border-yellow-400 rounded-lg p-4">
          <h4 className="font-rethink text-white font-semibold mb-3">Important Notes</h4>
          <ul className="text-white space-y-2 font-rethink">
            <li className="flex items-start space-x-2">
              <span className="w-1 h-1 bg-yellow-400 rounded-full mt-3 flex-shrink-0"></span>
              <span>Key generation happens locally in your browser</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1 h-1 bg-yellow-400 rounded-full mt-3 flex-shrink-0"></span>
              <span>Only encrypted shares are transmitted to IC</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1 h-1 bg-yellow-400 rounded-full mt-3 flex-shrink-0"></span>
              <span>Bonded never sees your complete encryption key</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1 h-1 bg-yellow-400 rounded-full mt-3 flex-shrink-0"></span>
              <span>Loss of device requires recovery process</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="w-full">
      <div className="text-center">
        {generatedKeys ? (
          <div className="w-20 h-20 mx-auto mb-6 bg-primary rounded-full flex items-center justify-center">
            <div className="w-8 h-8 text-white">✓</div>
          </div>
        ) : (
          <div className="w-20 h-20 mx-auto mb-6 bg-primary rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <h2 className="font-trocchi text-2xl font-normal text-primary mb-2">
          {generatedKeys ? 'Keys Generated Successfully' : 'Generating Keys...'}
        </h2>
        <p className="text-white text-center mb-6">
          {generatedKeys 
            ? 'Your threshold keys have been created and distributed'
            : 'Please wait while we generate your threshold keys'
          }
        </p>
      </div>

      {generatedKeys && (
        <div className="space-y-6">
          <div className="bg-white/10 border border-white/50 rounded-lg p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              <h3 className="font-rethink text-white font-semibold">Setup Complete</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-white/80 font-rethink">Threshold:</span>
                <div className="font-rethink text-white font-semibold">{generatedKeys.threshold} of {generatedKeys.total_shares}</div>
              </div>
              <div className="space-y-1">
                <span className="text-white/80 font-rethink">Active Shares:</span>
                <div className="font-rethink text-white font-semibold">{generatedKeys.key_shares.length}</div>
              </div>
              <div className="space-y-1">
                <span className="text-white/80 font-rethink">Created:</span>
                <div className="font-rethink text-white font-semibold">
                  {new Date(generatedKeys.created_at * 1000).toLocaleDateString()}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-white/80 font-rethink">Status:</span>
                <div className="font-rethink text-primary font-semibold">Active</div>
              </div>
            </div>
          </div>

          <div className="bg-white/10 border border-white/50 rounded-lg p-4">
            <h4 className="font-rethink text-white font-semibold mb-4">Next Steps</h4>
            <ul className="text-white space-y-3 font-rethink">
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Your evidence vault is now secure and ready to use</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Start uploading evidence manually or via automated collection</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Set up relationships with partners for shared evidence</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Configure advanced AI filtering options</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex justify-center items-center min-h-screen w-screen max-w-full py-5 box-border overflow-y-auto absolute top-0 left-0 right-0 bottom-0 bg-secondary">
      <div className="relative w-full max-w-[600px] flex flex-col items-center px-5 py-10 box-border border-none mx-auto">
        <img
          className="h-[70px] w-[173px] mb-5"
          alt="Bonded logo blue"
          src="/images/bonded-logo-blue.svg"
        />

        <div className="w-full mb-6">
          <div className="bg-white/20 rounded-full h-2 mb-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-white font-rethink">
            <span>Setup Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
        </div>

        {error && (
          <div className="w-full mb-6 p-3 bg-yellow-400/20 border border-yellow-400 rounded-lg">
            <p className="text-sm text-yellow-400 text-center font-rethink">{error}</p>
          </div>
        )}

        {setupStep === 1 && renderStep1()}
        {setupStep === 2 && renderStep2()}
        {setupStep === 3 && renderStep3()}
        {setupStep === 4 && renderStep4()}

        <div className="flex justify-between w-full mt-8 pt-6">
          {setupStep > 1 && setupStep < 4 && (
            <button
              className="px-6 py-3 bg-transparent border border-primary text-primary rounded-lg font-trocchi text-sm cursor-pointer transition-colors duration-200 hover:bg-primary/10"
              onClick={() => setSetupStep(setupStep - 1)}
              disabled={loading}
            >
              Back
            </button>
          )}

          {setupStep < 3 && (
            <button
              className="ml-auto px-8 py-3 bg-primary text-white border-none rounded-lg font-trocchi text-sm cursor-pointer transition-colors duration-200 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setSetupStep(setupStep + 1)}
              disabled={setupStep === 1 && !canProceedFromStep1()}
            >
              Next
            </button>
          )}

          {setupStep === 3 && (
            <button
              className="ml-auto px-8 py-3 bg-primary text-white border-none rounded-lg font-trocchi text-sm cursor-pointer transition-colors duration-200 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleGenerateKeys}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating...</span>
                </div>
              ) : (
                'Generate Keys'
              )}
            </button>
          )}

          {setupStep === 4 && generatedKeys && (
            <button
              className="ml-auto px-8 py-3 bg-primary text-white border-none rounded-lg font-trocchi text-sm cursor-pointer transition-colors duration-200 hover:bg-primary/90"
              onClick={handleComplete}
            >
              Complete Setup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThresholdKeySetup;
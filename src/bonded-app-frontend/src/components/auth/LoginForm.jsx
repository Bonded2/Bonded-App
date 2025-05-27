import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

const CustomTextField = ({ 
  label, 
  placeholder, 
  type = "text", 
  value, 
  onChange, 
  supportingText, 
  required = false, 
  className = "",
  error = false
}) => {
  const [focused, setFocused] = useState(false);
  
  return (
    <div className={`flex flex-col w-full mb-4 ${className}`}>
      <div className="relative w-full">
        <label className="block font-rethink text-base font-semibold text-white mb-2 transition-colors duration-200">
          {label}
          {required && <span className="text-secondary ml-0.5">*</span>}
        </label>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full h-12 bg-white/10 border border-white/30 rounded-lg px-4 font-rethink text-base text-white font-bold placeholder-white/70 outline-none transition-all duration-200 ${
            focused ? 'border-accent shadow-[0_0_0_2px_rgba(185,255,70,0.3)] bg-white/15' : ''
          } ${
            error ? 'border-red-400 bg-red-400/10' : ''
          }`}
          required={required}
          style={{ fontSize: '16px' }} // Prevents zoom on iOS
        />
      </div>
      {supportingText && (
        <div className={`font-rethink text-xs mt-1 pl-0.5 ${error ? 'text-red-400' : 'text-white'}`}>
          {supportingText}
        </div>
      )}
    </div>
  );
};

const LoginForm = () => {
  const { login, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState("ii");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleEmailLogin = (e) => {
    e.preventDefault();
    console.log("Logging in with email:", email);
    // TODO: Implement email login when backend supports it
    navigate("/timeline");
  };

  const handleICPLogin = async () => {
    try {
      clearError();
      await login();
    } catch (err) {
      console.error('ICP login failed:', err);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen w-screen max-w-full py-5 box-border overflow-y-auto absolute top-0 left-0 right-0 bottom-0 bg-secondary">
      <div className="relative w-full max-w-[380px] flex flex-col items-center px-5 py-10 box-border border-none mx-auto">
        <img
          className="h-[70px] w-[173px] mb-5"
          alt="Bonded logo blue"
          src="/images/bonded-logo-blue.svg"
        />

        <h1 className="font-trocchi text-2xl font-normal leading-[1.3em] text-primary mb-5 text-center">
          Welcome back
        </h1>

        <div className="flex justify-center mb-6 border border-primary rounded-lg overflow-hidden">
          <button
            className={`flex-1 px-3 py-2.5 bg-transparent border-none cursor-pointer font-trocchi text-sm transition-colors duration-300 text-center ${
              loginMethod === "email" 
                ? "bg-primary text-white" 
                : "text-primary"
            }`}
            onClick={() => setLoginMethod("email")}
          >
            Email & Password
          </button>
          <button
            className={`flex-1 px-3 py-2.5 bg-transparent border-none cursor-pointer font-trocchi text-sm transition-colors duration-300 text-center border-l border-primary ${
              loginMethod === "ii" 
                ? "bg-primary text-white" 
                : "text-primary"
            }`}
            onClick={() => setLoginMethod("ii")}
          >
            Internet Identity
          </button>
        </div>

        <div className="w-full overflow-hidden">
          {loginMethod === "email" && (
            <div className="w-full flex flex-col items-center animate-slideInRight">
              <form onSubmit={handleEmailLogin} className="flex flex-col items-center w-full">
                <CustomTextField
                  label="Email"
                  placeholder="Enter your email address"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  required={true}
                  className="w-full"
                />

                <CustomTextField
                  label="Password"
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  required={true}
                  className="w-full"
                />

                <button 
                  type="submit" 
                  className="flex justify-center items-center w-full h-12 bg-primary text-white border-none rounded-[19px] font-trocchi text-sm cursor-pointer transition-colors duration-200 mt-4 box-border hover:bg-primary/90"
                >
                  <div className="flex items-center justify-center gap-2 h-full">
                    <div className="font-trocchi text-sm font-normal leading-[1.714em] tracking-[0.007em] text-center text-white">
                      Login
                    </div>
                  </div>
                </button>
              </form>
            </div>
          )}

          {loginMethod === "ii" && (
            <div className="w-full flex flex-col items-center animate-slideInRight">
              <button 
                className="flex justify-center items-center gap-2.5 w-full h-12 px-4 py-2 bg-primary text-white border-none rounded-lg cursor-pointer transition-all duration-200 mb-4 font-trocchi text-sm hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg"
                onClick={handleICPLogin}
                disabled={loading}
                aria-label="Login with Internet Identity"
              >
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <img
                      src="/images/icp-logo-button.svg"
                      alt="Internet Computer"
                      className="w-auto h-6"
                    />
                    Login with Internet Identity
                  </>
                )}
              </button>
              <p className="text-xs text-white text-center mt-2">
                You will be redirected to the Internet Identity service to authenticate.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="w-full mt-4 p-3 bg-yellow-400/20 border border-yellow-400 rounded-lg">
            <p className="text-sm text-yellow-400 text-center">{error}</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-white/70">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
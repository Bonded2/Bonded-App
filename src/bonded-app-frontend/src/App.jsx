import React, { useEffect, Suspense, lazy } from "react";
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";

// CRITICAL PATH: Only load absolutely essential components immediately
import { Splash } from "./screens/Splash/Splash";

// LAZY LOAD: ALL other components to minimize initial bundle
const Login = lazy(() => import("./screens/Login/Login").then(m => ({ default: m.Login })));
const Register = lazy(() => import("./screens/Register").then(m => ({ default: m.Register })));
const GettingStarted = lazy(() => import("./screens/GettingStarted").then(m => ({ default: m.GettingStarted })));
const Verify = lazy(() => import("./screens/Verify").then(m => ({ default: m.Verify })));
const MoreInfo = lazy(() => import("./screens/MoreInfo").then(m => ({ default: m.MoreInfo })));
const TimelineCreated = lazy(() => import("./screens/TimelineCreated").then(m => ({ default: m.TimelineCreated })));
const Account = lazy(() => import("./screens/Account/Account").then(m => ({ default: m.Account })));
const Privacy = lazy(() => import("./screens/Privacy/Privacy").then(m => ({ default: m.Privacy })));
const FAQ = lazy(() => import("./screens/FAQ/FAQ").then(m => ({ default: m.FAQ })));
const ExportTimeline = lazy(() => import("./screens/ExportTimeline").then(m => ({ default: m.ExportTimeline })));
const TimestampFolder = lazy(() => import("./screens/TimestampFolder").then(m => ({ default: m.TimestampFolder })));
const ImagePreview = lazy(() => import("./screens/ImagePreview").then(m => ({ default: m.ImagePreview })));
const ExportAllData = lazy(() => import("./screens/ExportAllData").then(m => ({ default: m.ExportAllData })));
const MediaImport = lazy(() => import("./screens/MediaImport").then(m => ({ default: m.MediaImport })));
const ProfileSetup = lazy(() => import("./screens/ProfileSetup/ProfileSetup").then(m => ({ default: m.ProfileSetup })));
const AISettings = lazy(() => import("./screens/AISettings/AISettings").then(m => ({ default: m.AISettings })));
const PartnerInvite = lazy(() => import("./screens/PartnerInvite/PartnerInvite").then(m => ({ default: m.PartnerInvite })));
const AcceptInvite = lazy(() => import("./screens/AcceptInvite/AcceptInvite").then(m => ({ default: m.AcceptInvite })));
const Capture = lazy(() => import("./routes/SettingsContentRow/screens/Capture").then(m => ({ default: m.Capture })));

// LAZY LOAD: PWA components (not critical for initial load)
const PWAInstallPrompt = lazy(() => import("./components/PWAInstallPrompt/PWAInstallPrompt").then(m => ({ default: m.PWAInstallPrompt })));
const OfflineStatusBar = lazy(() => import("./components/OfflineStatusBar/OfflineStatusBar").then(m => ({ default: m.OfflineStatusBar })));
const GeoMetadataProvider = lazy(() => import("./features/geolocation/GeoMetadataProvider").then(m => ({ default: m.default })));

// Ultra-fast loading screen for instant feedback
const FastLoadingScreen = () => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '18px',
    fontWeight: '300',
    zIndex: 9999
  }}>
    <div style={{
      textAlign: 'center'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid rgba(255,255,255,0.3)',
        borderTop: '3px solid white',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 16px'
      }}></div>
      Loading...
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorDetails: null };
  }
  
  static getDerivedStateFromError(error) {
    // Check if this is a field validation error that should be ignored
    if (error && error.message && (
      error.message.includes('invalid field') ||
      error.message.includes('Field validation') ||
      error.message.includes('SuppressedError') ||
      error.name === 'SuppressedError'
    )) {
      console.warn('🔧 ErrorBoundary: Ignoring field validation error');
      return { hasError: false };
    }
    
    return { hasError: true, errorDetails: error };
  }
  
  componentDidCatch(error, errorInfo) {
    // Check if this is a field validation error
    if (error && error.message && (
      error.message.includes('invalid field') ||
      error.message.includes('Field validation') ||
      error.message.includes('SuppressedError') ||
      error.name === 'SuppressedError'
    )) {
      console.warn('🔧 ErrorBoundary: Field validation error caught and ignored');
      // Reset the error state to allow the component to continue
      this.setState({ hasError: false, errorDetails: null });
      return;
    }
    
    // For development debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          padding: '20px',
          textAlign: 'center',
          flexDirection: 'column'
        }}>
          <h1>Something went wrong</h1>
          <p>Please refresh the page to continue.</p>
          {process.env.NODE_ENV === 'development' && this.state.errorDetails && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary>Error Details (Development)</summary>
              <pre style={{ 
                fontSize: '12px', 
                background: '#f5f5f5', 
                padding: '10px', 
                borderRadius: '4px',
                maxWidth: '500px',
                overflow: 'auto' 
              }}>
                {this.state.errorDetails.toString()}
              </pre>
            </details>
          )}
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// OPTIMIZED: No blocking operations
const quickLoader = async () => null;

const router = createBrowserRouter([
  {
    path: "/",
    element: <Splash />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/login",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <Login />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/register",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <Register />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/partner-invite",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <PartnerInvite />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/accept-invite",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <AcceptInvite />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/profile-setup",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <ProfileSetup />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/getting-started",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <GettingStarted />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/verify",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <Verify />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/more-info",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <MoreInfo />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/timeline",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <TimelineCreated />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/timeline-created",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <TimelineCreated />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/settings",
    element: <Navigate to="/ai-settings" replace />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/account",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <Account />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/privacy",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <Privacy />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/faq",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <FAQ />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/export-timeline",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <ExportTimeline onClose={() => {}} />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/timestamp-folder/:date",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <TimestampFolder />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/image-preview/:itemId",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <ImagePreview />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/export-all-data",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <ExportAllData />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/media-import",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <MediaImport />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/ai-settings",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <AISettings />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  // Advanced AI Tools routes (lazy loaded)
  {
    path: "/advanced-tools",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <div>Advanced AI Tools</div>
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/story-maker",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <div>StoryMaker Tool</div>
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
  {
    path: "/capture",
    element: (
      <Suspense fallback={<FastLoadingScreen />}>
        <Capture />
      </Suspense>
    ),
    errorElement: <ErrorBoundary />,
    loader: quickLoader,
  },
]);

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
  
  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOffline ? (
    <Suspense fallback={null}>
      <OfflineStatusBar />
    </Suspense>
  ) : null;
};

export const App = () => {
  useEffect(() => {
    // ULTRA-OPTIMIZED: Minimal background initialization
    const initializeApp = async () => {
      // Background service worker registration (non-blocking)
      if ('serviceWorker' in navigator) {
        setTimeout(() => {
          navigator.serviceWorker.register('/service-worker.js').catch(() => {
            // Silent failure for service worker registration
          });
        }, 2000); // Delay even more to not interfere with initial load
      }

      // Initialize Local Vault system (T1.05) in background
      setTimeout(async () => {
        try {
          const { localVault } = await import('./services/localVault.js');
          await localVault.initialize();
          console.log('✅ T1.05 Local Vault initialized in background');
        } catch (error) {
          console.warn('⚠️ Local Vault initialization failed:', error);
        }
      }, 1000); // Initialize after initial app load
    };

    // Minimal initialization
    initializeApp();
  }, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={<FastLoadingScreen />}>
        <GeoMetadataProvider>
          <div className="app">
            <RouterProvider router={router} />
            <Suspense fallback={null}>
              <PWAInstallPrompt />
            </Suspense>
            <OfflineIndicator />
          </div>
        </GeoMetadataProvider>
      </Suspense>
    </ErrorBoundary>
  );
};

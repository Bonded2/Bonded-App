import React, { useEffect } from "react";
import { RouterProvider, createBrowserRouter, redirect, Navigate } from "react-router-dom";
import { Splash } from "./screens/Splash/Splash";
import { Login } from "./screens/Login/Login";
import { Register } from "./screens/Register";
import { GettingStarted } from "./screens/GettingStarted";
import { Verify } from "./screens/Verify";
import { MoreInfo } from "./screens/MoreInfo";
import { TimelineCreated } from "./screens/TimelineCreated";
import { Capture } from "./routes/SettingsContentRow/screens/Capture";
import { Account } from "./screens/Account/Account";
import { Privacy } from "./screens/Privacy/Privacy";
import { FAQ } from "./screens/FAQ/FAQ";
import { ExportTimeline } from "./screens/ExportTimeline";
import { TimestampFolder } from "./screens/TimestampFolder";
import { ImagePreview } from "./screens/ImagePreview";
import { ExportAllData } from "./screens/ExportAllData";
import { MediaImport } from "./screens/MediaImport";
import { ProfileSetup } from "./screens/ProfileSetup/ProfileSetup";
import { AISettings } from "./screens/AISettings/AISettings";
import { PartnerInvite } from "./screens/PartnerInvite/PartnerInvite";
import { AcceptInvite } from "./screens/AcceptInvite/AcceptInvite";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt/PWAInstallPrompt";
import { resetToFirstTimeUser } from "./utils/firstTimeUserReset";
import GeoMetadataProvider from "./features/geolocation/GeoMetadataProvider";
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
  }
  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong. Please try refreshing the page.</h1>;
    }
    return this.props.children;
  }
}
// OPTIMIZED Loader function - non-blocking and concurrent
const enforceFirstTimeUserLoader = async () => {
  try {
    // OPTIMIZATION: Start initialization but don't block navigation
    const icpCanisterService = (await import('./services/icpCanisterService.js')).default;
    
    // Non-blocking initialization with timeout
    Promise.race([
      icpCanisterService.initialize(),
      new Promise(resolve => setTimeout(resolve, 2000)) // 2 second max wait
    ]).catch(() => {
      // Ignore errors - components will handle auth individually
    });
    
    // Don't block navigation - return immediately
    return null;
  } catch (error) {
    // ICP authentication check failed - allow navigation to continue
    return null;
  }
};
const router = createBrowserRouter([
  {
    path: "/",
    element: <Splash />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/login",
    element: <Login />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/register",
    element: <Register />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/partner-invite",
    element: <PartnerInvite />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/accept-invite",
    element: <AcceptInvite />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/profile-setup",
    element: <ProfileSetup />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/getting-started",
    element: <GettingStarted />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/verify",
    element: <Verify />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/more-info",
    element: <MoreInfo />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/timeline",
    element: <TimelineCreated />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/timeline-created",
    element: <TimelineCreated />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/settings",
    element: <Navigate to="/ai-settings" replace />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/account",
    element: <Account />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/privacy",
    element: <Privacy />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/faq",
    element: <FAQ />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/export-timeline",
    element: <ExportTimeline onClose={() => {}} />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/timestamp-folder/:date",
    element: <TimestampFolder />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/image-preview/:itemId",
    element: <ImagePreview />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/export-all-data",
    element: <ExportAllData />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/media-import",
    element: <MediaImport />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/ai-settings",
    element: <AISettings />,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  // Advanced AI Tools routes (placeholders for future implementation)
  {
    path: "/advanced-tools",
    element: <div>Advanced AI Tools</div>,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/story-maker",
    element: <div>StoryMaker Tool</div>,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/application-maker",
    element: <div>ApplicationMaker Tool</div>,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/status-assessor",
    element: <div>Status Assessor Tool</div>,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  },
  {
    path: "/impermanent-access",
    element: <div>Impermanent Access Tool</div>,
    errorElement: <ErrorBoundary />,
    loader: enforceFirstTimeUserLoader,
  }
]);
// Component for offline detection
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
  if (!isOffline) return null;
  return (
    <div className="offline-indicator">
      You are currently offline. Some features may be unavailable.
    </div>
  );
};
export const App = () => {
  // Initialize ICP service on app load instead of using sessionStorage
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize ICP canister service instead of relying on sessionStorage
        const icpCanisterService = (await import('./services/icpCanisterService.js')).default;
        await icpCanisterService.initialize();
        
        // Let the app flow naturally - no forced redirects based on session storage
      } catch (error) {
        // Failed to initialize ICP service on app load
        // Continue - individual components will handle authentication
      }
    };
    initializeApp();
    // Listen for service worker messages
    const handleServiceWorkerMessage = async (event) => {
      if (event.data && event.data.type === 'TRIGGER_DAILY_PROCESSING') {
        try {
          // Import and trigger evidence processing
          const { evidenceProcessor } = await import('./services/index.js');
          const result = await evidenceProcessor.processDailyEvidence();
          if (result.success) {
          } else {
          }
        } catch (error) {
        }
      }
    };
    // Register service worker message listener
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, []);
  return (
    <ErrorBoundary>
      <GeoMetadataProvider>
        <OfflineIndicator />
        <RouterProvider router={router} />
        <PWAInstallPrompt />
      </GeoMetadataProvider>
    </ErrorBoundary>
  );
};

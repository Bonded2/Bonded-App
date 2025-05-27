import React, { useEffect } from "react";
import { RouterProvider, createBrowserRouter, redirect, Navigate } from "react-router-dom";
import AuthProvider from "./components/auth/AuthProvider";
import ProtectedRoute, { OnboardingGate, ThresholdKeysGate } from "./components/auth/ProtectedRoute";
import LoginForm from "./components/auth/LoginForm";
import ProfileSetupForm from "./components/profile/ProfileSetupForm";
import ThresholdKeySetup from "./components/auth/ThresholdKeySetup";
import Dashboard from "./components/dashboard/Dashboard";
import { Splash } from "./components/screens/Splash";
import { Register } from "./components/screens/Register";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt/PWAInstallPrompt";
import GeoMetadataProvider from "./features/geolocation/GeoMetadataProvider";

// Import existing screens that we'll gradually migrate
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
import { PartnerInvite } from "./screens/PartnerInvite/PartnerInvite";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">Please refresh the page to continue.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Splash />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/login",
    element: <LoginForm />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/profile-setup",
    element: (
      <ProtectedRoute>
        <ProfileSetupForm />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/getting-started",
    element: (
      <ProtectedRoute requireOnboarding={true}>
        <ThresholdKeySetup />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute requireOnboarding={true} requireThresholdKeys={true}>
        <Dashboard />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/timeline",
    element: (
      <ProtectedRoute requireOnboarding={true} requireThresholdKeys={true}>
        <Dashboard />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  // Legacy routes - gradually migrate these
  {
    path: "/splash",
    element: <Splash />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/register",
    element: <Register />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/partner-invite",
    element: (
      <ProtectedRoute>
        <PartnerInvite />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/verify",
    element: (
      <ProtectedRoute>
        <Verify />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/more-info",
    element: (
      <ProtectedRoute>
        <MoreInfo />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/timeline-created",
    element: (
      <ProtectedRoute>
        <TimelineCreated />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <Capture />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/account",
    element: (
      <ProtectedRoute>
        <Account />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/privacy",
    element: (
      <ProtectedRoute>
        <Privacy />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/faq",
    element: <FAQ />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/export-timeline",
    element: (
      <ProtectedRoute>
        <ExportTimeline onClose={() => {}} />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/timestamp-folder/:date",
    element: (
      <ProtectedRoute>
        <TimestampFolder />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/image-preview/:itemId",
    element: (
      <ProtectedRoute>
        <ImagePreview />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/export-all-data",
    element: (
      <ProtectedRoute>
        <ExportAllData />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/media-import",
    element: (
      <ProtectedRoute>
        <MediaImport />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  // Future AI Tools routes
  {
    path: "/advanced-tools",
    element: (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Advanced AI Tools</h1>
            <p className="text-gray-600">Coming soon in Sprint 3</p>
          </div>
        </div>
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/story-maker",
    element: (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">StoryMaker Tool</h1>
            <p className="text-gray-600">AI-powered story generation from evidence - Coming in Sprint 3</p>
          </div>
        </div>
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/application-maker",
    element: (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">ApplicationMaker Tool</h1>
            <p className="text-gray-600">Automated application generation - Coming in Sprint 3</p>
          </div>
        </div>
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/status-assessor",
    element: (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Status Assessor Tool</h1>
            <p className="text-gray-600">AI relationship status assessment - Coming in Sprint 3</p>
          </div>
        </div>
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/impermanent-access",
    element: (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Impermanent Access Tool</h1>
            <p className="text-gray-600">Temporary evidence sharing - Coming in Sprint 3</p>
          </div>
        </div>
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
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
    <div className="fixed top-0 left-0 right-0 p-2 bg-primary text-white text-center text-sm z-50 shadow-elevation-2dp animate-slideDown">
      You are currently offline. Some features may be unavailable.
    </div>
  );
};

export const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <GeoMetadataProvider>
          <OfflineIndicator />
          <RouterProvider router={router} />
          <PWAInstallPrompt />
        </GeoMetadataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};
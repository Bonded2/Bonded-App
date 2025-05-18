import React from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
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
import { MediaScannerDemo } from "./screens/MediaScannerDemo";
import { ProfileSetup } from "./screens/ProfileSetup/ProfileSetup";
import { PartnerInvite } from "./screens/PartnerInvite/PartnerInvite";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt/PWAInstallPrompt";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.log(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong. Please try refreshing the page.</h1>;
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
    element: <Login />,
    errorElement: <ErrorBoundary />,
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
  },
  {
    path: "/profile-setup",
    element: <ProfileSetup />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/getting-started",
    element: <GettingStarted />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/verify",
    element: <Verify />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/more-info",
    element: <MoreInfo />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/timeline",
    element: <TimelineCreated />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/timeline-created",
    element: <TimelineCreated />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/settings",
    element: <Capture />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/account",
    element: <Account />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/privacy",
    element: <Privacy />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/faq",
    element: <FAQ />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/export-timeline",
    element: <ExportTimeline onClose={() => {}} />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/timestamp-folder/:date",
    element: <TimestampFolder />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/image-preview/:itemId",
    element: <ImagePreview />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/export-all-data",
    element: <ExportAllData />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/media-scanner",
    element: <MediaScannerDemo />,
    errorElement: <ErrorBoundary />,
  },
  // Advanced AI Tools routes (placeholders for future implementation)
  {
    path: "/advanced-tools",
    element: <div>Advanced AI Tools</div>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/story-maker",
    element: <div>StoryMaker Tool</div>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/application-maker",
    element: <div>ApplicationMaker Tool</div>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/status-assessor",
    element: <div>Status Assessor Tool</div>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/impermanent-access",
    element: <div>Impermanent Access Tool</div>,
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
    <div className="offline-indicator">
      You are currently offline. Some features may be unavailable.
    </div>
  );
};

export const App = () => {
  return (
    <ErrorBoundary>
      <OfflineIndicator />
      <RouterProvider router={router} />
      <PWAInstallPrompt />
    </ErrorBoundary>
  );
};

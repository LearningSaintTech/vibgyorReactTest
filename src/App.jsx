import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';

// Enhanced Services
import enhancedSocketService from './services/enhancedSocketService';

// Enhanced Components
import LoadingSpinner from './components/UI/LoadingSpinner';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';

// Enhanced Pages
import LoginPage from './pages/Auth/LoginPage';
import ProfilePage from './pages/Profile/ProfilePage';
import EnhancedChatPage from './pages/EnhancedChatPage';
import SocialPage from './pages/Social/SocialPage';
import StatusPage from './pages/Status/StatusPage';
import MessageRequestsPage from './pages/Messages/MessageRequestsPage';
import FollowRequestsPage from './pages/Social/FollowRequestsPage';
import CallPage from './pages/Call/CallPage';
import SettingsPage from './pages/Settings/SettingsPage';
import DashboardPage from './pages/Dashboard/DashboardPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Enhanced App Layout with modern design
const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Socket Connector - handles real-time connections */}
      <SocketConnector />
      
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700">
          <Sidebar />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Navbar */}
          <Navbar />
          
          {/* Page Content */}
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

// Enhanced Socket Connection Component
const SocketConnector = () => {
  const { isAuthenticated, user, loading } = useAuth();
  
  // Don't render anything while auth is loading
  if (loading) {
    return null;
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('accessToken');
      enhancedSocketService.connect(token);
    } else {
      enhancedSocketService.disconnect();
    }

    // Handle tab close and page unload events
    const handleBeforeUnload = (event) => {
      console.log('[APP] 🚪 Tab closing or page unloading - disconnecting socket');
      // Force disconnect when tab is closed or page is unloaded
      enhancedSocketService.disconnect();
      
      // For some browsers, we need to use sendBeacon for reliable cleanup
      if (navigator.sendBeacon) {
        const token = localStorage.getItem('accessToken');
        if (token) {
          // Send a beacon to notify server of disconnection
          const baseURL = import.meta.env.VITE_API_URL || 'https://vibgyornode.onrender.com';
          // sendBeacon works better with FormData
          const formData = new FormData();
          formData.append('token', token);
          navigator.sendBeacon(`${baseURL}/user/status/offline`, formData);
        }
      }
    };

    const handlePageHide = (event) => {
      console.log('[APP] 📱 Page hidden - disconnecting socket');
      // Page is being hidden (mobile browsers, tab switching)
      enhancedSocketService.disconnect();
    };

    const handleVisibilityChange = () => {
      // Handle tab visibility changes
      if (document.hidden) {
        console.log('[APP] 👁️ Tab hidden - user might be switching tabs');
        // Tab is hidden - could be minimized or switched to another tab
        // We don't disconnect here as user might come back
      } else {
        console.log('[APP] 👁️ Tab visible again - checking connection');
        // Tab is visible again - ensure connection is active
        if (isAuthenticated && user && !enhancedSocketService.isConnected) {
          const token = localStorage.getItem('accessToken');
          enhancedSocketService.connect(token);
        }
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Cleanup
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      enhancedSocketService.disconnect();
    };
  }, [isAuthenticated, user]);

  return null;
};

// App Content Component
const AppContent = () => {
  return (
    <Router>
      <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <AppLayout>
                <ProfilePage />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/chat" element={
            <ProtectedRoute>
              <AppLayout>
                <EnhancedChatPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/chat/:chatId" element={
            <ProtectedRoute>
              <AppLayout>
                <EnhancedChatPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/social" element={
            <ProtectedRoute>
              <AppLayout>
                <SocialPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/follow-requests" element={
            <ProtectedRoute>
              <AppLayout>
                <FollowRequestsPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/message-requests" element={
            <ProtectedRoute>
              <AppLayout>
                <MessageRequestsPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/status" element={
            <ProtectedRoute>
              <AppLayout>
                <StatusPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/call/:callId" element={
            <ProtectedRoute>
              <CallPage />
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute>
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import MainLayout from './layouts/MainLayout';

import Dashboard from './pages/Dashboard';
import EmployeeDirectory from './pages/EmployeeDirectory';
import Attendance from './pages/Attendance';
import AttendanceLogs from './pages/AttendanceLogs';
import Leave from './pages/Leave';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Organization from './pages/Organization';
import Login from './pages/Login';
import Setup from './pages/Setup';
import RegisterOrganization from './pages/RegisterOrganization';
import LandingPage from './pages/LandingPage';
import SuperAdmin from './pages/SuperAdmin';
import Upgrade from './pages/Upgrade';
import { VerifyAccount } from './pages/VerifyAccount';
import { SuspendedPage } from './components/subscription';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';

const AppContent: React.FC = () => {
  const { user, isLoading, isConfigured, setConfigured, login, logout } = useAuth();
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const [currentPath, setCurrentPath] = useState('dashboard');
  const [navParams, setNavParams] = useState<any>(null);
  
  // Public Pages State
  const [showLanding, setShowLanding] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [blogRoute, setBlogRoute] = useState<{ type: 'list' | 'post'; slug?: string } | null>(null);

  // Parse blog route from hash
  const parseBlogRoute = (hash: string) => {
    if (hash === '#/blog' || hash === '#/blog/') {
      return { type: 'list' as const };
    }
    const match = hash.match(/^#\/blog\/(.+)$/);
    if (match && match[1]) {
      return { type: 'post' as const, slug: match[1] };
    }
    return null;
  };

  // Check URL for verification token and blog routes on mount
  useEffect(() => {
    // Check for blog route first
    const blogMatch = parseBlogRoute(window.location.hash);
    if (blogMatch) {
      setBlogRoute(blogMatch);
      return;
    }

    let token: string | null = null;

    // 1. Check Search Params (Standard: /?token=...)
    token = new URLSearchParams(window.location.search).get('token');

    // 2. Check Hash Params (Fallback: /#/?token=...)
    if (!token && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1];
      token = new URLSearchParams(hashQuery).get('token');
    }

    // 3. Check PocketBase default format: /_/#/auth/confirm-verification/{TOKEN}
    if (!token && window.location.hash.includes('/auth/confirm-verification/')) {
      const match = window.location.hash.match(/\/auth\/confirm-verification\/([^/?#]+)/);
      if (match && match[1]) {
        token = match[1];
      }
    }

    if (token) {
      setVerificationToken(token);
      // Clean URL to prevent re-triggering and look cleaner
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Listen for hash changes (blog navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const blogMatch = parseBlogRoute(hash);
      if (blogMatch) {
        setBlogRoute(blogMatch);
      } else if (!hash || hash === '#' || hash === '#/') {
        setBlogRoute(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (path: string, params?: any) => {
    if (path === 'attendance-quick-office') {
      setCurrentPath('attendance');
      setNavParams({ autoStart: 'OFFICE' });
    } else if (path === 'attendance-quick-factory') {
      setCurrentPath('attendance');
      setNavParams({ autoStart: 'FACTORY' });
    } else if (path === 'attendance-finish') {
      setCurrentPath('attendance');
      setNavParams({ autoStart: 'FINISH' });
    } else {
      setCurrentPath(path);
      setNavParams(params || null);
    }
  };

  if (!isConfigured) {
    return <Setup onComplete={() => setConfigured(true)} />;
  }

  // Priority 0: Public Blog (accessible regardless of auth)
  if (blogRoute) {
    if (blogRoute.type === 'post' && blogRoute.slug) {
      return <BlogPostPage slug={blogRoute.slug} onBack={() => { window.location.hash = '/blog'; }} />;
    }
    return <BlogPage onBack={() => { window.history.pushState(null, '', window.location.pathname); setBlogRoute(null); }} />;
  }

  // Priority 1: Verification Flow
  if (verificationToken) {
    return <VerifyAccount token={verificationToken} onFinished={() => { setVerificationToken(null); setShowLanding(false); setShowRegister(false); }} />;
  }

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  // Priority 2: Public Landing/Login/Register
  if (!user) {
    if (showRegister) {
      return <RegisterOrganization onBack={() => { setShowRegister(false); setShowLanding(true); }} onSuccess={login} />;
    }
    if (!showLanding) {
      return <Login onLoginSuccess={login} onRegisterClick={() => setShowRegister(true)} onBackToLanding={() => setShowLanding(true)} />;
    }
    return (
      <LandingPage
        onLoginClick={() => setShowLanding(false)}
        onRegisterClick={() => { setShowLanding(false); setShowRegister(true); }}
      />
    );
  }

  // Check if Super Admin
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  // Priority 2.5: Check if organization is suspended (show lockout screen)
  // Wait for subscription to load before checking
  if (!isSuperAdmin && !isSubscriptionLoading && subscription?.isBlocked) {
    return <SuspendedPage onLogout={logout} />;
  }

  // Priority 3: Authenticated App
  const renderContent = () => {
    // Super Admin has a dedicated dashboard
    if (isSuperAdmin && (currentPath === 'dashboard' || currentPath === 'super-admin')) {
      return <SuperAdmin user={user} onNavigate={handleNavigate} />;
    }

    switch (currentPath) {
      case 'dashboard': return <Dashboard user={user} onNavigate={handleNavigate} />;
      case 'super-admin': return <SuperAdmin user={user} onNavigate={handleNavigate} />;
      case 'upgrade':
        if (user.role === 'ADMIN' || user.role === 'HR') {
          return <Upgrade onBack={() => handleNavigate('dashboard')} />;
        }
        return <Dashboard user={user} onNavigate={handleNavigate} />;
      case 'profile': return <Settings user={user} onBack={() => handleNavigate('dashboard')} />;
      case 'employees': return <EmployeeDirectory user={user} />;
      case 'attendance':
        return <Attendance
          user={user}
          autoStart={navParams?.autoStart}
          onFinish={() => handleNavigate('dashboard')}
        />;
      case 'attendance-logs': return <AttendanceLogs user={user} viewMode="MY" />;
      case 'attendance-audit': return <AttendanceLogs user={user} viewMode="AUDIT" />;
      case 'leave': return <Leave user={user} autoOpen={navParams?.autoOpen} />;
      case 'settings': return <Settings user={user} />;
      case 'reports': return <Reports user={user} />;
      case 'organization': return <Organization />;
      default: return <Dashboard user={user} onNavigate={handleNavigate} />;
    }
  };

  if (currentPath === 'attendance') {
    return renderContent();
  }

  return (
    <MainLayout currentPath={currentPath} onNavigate={handleNavigate}>
      {renderContent()}
    </MainLayout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ThemeProvider>
          <AppContent />
          <Analytics />
        </ThemeProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
};

export default App;

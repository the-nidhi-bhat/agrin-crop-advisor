import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { SignedOutGate } from './components/auth/SignedOutGate';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AuthPage } from './pages/AuthPage';
import { HealthPage } from './pages/HealthPage';
import { LandingPage } from './pages/HomePage';
import { ScanPage } from './pages/ScanPage';
import { SettingsPage } from './pages/SettingsPage';

function RequireSignedIn() {
  const { user, signedOut } = useAuth();
  if (signedOut && !user) {
    return <SignedOutGate />;
  }
  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<AuthPage mode="signin" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/forgot" element={<AuthPage mode="forgot" />} />
          <Route element={<RequireSignedIn />}>
            <Route element={<AppLayout />}>
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
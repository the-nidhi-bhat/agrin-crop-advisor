import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { SignedOutGate } from './components/auth/SignedOutGate';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AuthPage } from './pages/AuthPage';
import { HealthPage } from './pages/HealthPage';
import { HomePage } from './pages/HomePage';
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
          <Route path="/signin" element={<AuthPage mode="signin" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/forgot" element={<AuthPage mode="forgot" />} />
          <Route element={<RequireSignedIn />}>
            <Route element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<HomePage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
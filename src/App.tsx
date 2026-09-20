import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AuthProvider } from './hooks/useAuth';
import { HealthPage } from './pages/HealthPage';
import { HomePage } from './pages/HomePage';
import { ScanPage } from './pages/ScanPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<HomePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
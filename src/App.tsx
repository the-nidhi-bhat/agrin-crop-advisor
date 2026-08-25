import React from 'react';
import { AuthProvider } from './hooks/useAuth';
import { Home } from './pages/Home';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#FDFBF7] text-gray-900 font-sans">
        <Home />
      </div>
    </AuthProvider>
  );
}

export default App;

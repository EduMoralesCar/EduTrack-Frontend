import React, { useState } from 'react';
import { api } from './services/api';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  // Try to load user session from local storage immediately on startup
  const [currentUser, setCurrentUser] = useState(() => {
    return api.auth.getCurrentUser();
  });

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <>
      {currentUser ? (
        <Dashboard user={currentUser} onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}

export default App;

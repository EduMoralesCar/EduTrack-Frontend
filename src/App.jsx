import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  // Try to load user session from local storage immediately on startup
  const [currentUser, setCurrentUser] = useState(() => {
    return api.auth.getCurrentUser();
  });

  useEffect(() => {
    if (api.auth.isAuthenticated()) {
      api.auth.me().then(user => {
        if (user) {
          setCurrentUser(user);
        }
      }).catch(err => {
        console.error("Error refreshing session profile:", err);
      });
    }
  }, []);

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

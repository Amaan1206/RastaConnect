import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import { supabase } from './supabaseClient';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const mapSessionUser = (user) => {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name || user.email,
    };
  };

  useEffect(() => {
    let isMounted = true;
    let hasInitializedSession = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      if (session) {
        setIsLoggedIn(true);
        setCurrentUser(mapSessionUser(session.user));
        setAuthToken(session.access_token);
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setAuthToken(null);
        navigate('/login');
      }
      hasInitializedSession = true;
      setIsSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session) {
        setIsLoggedIn(true);
        setCurrentUser(mapSessionUser(session.user));
        setAuthToken(session.access_token);
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setAuthToken(null);
        if (hasInitializedSession) {
          navigate('/login');
        }
      }
      setIsSessionLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setAuthToken(null);
    navigate('/login');
  };

  if (isSessionLoading) {
    return (
      <div className="app-container">
        <main className="main-content">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/auth';

  return (
    <div className="app-container">
      {isLoggedIn && !isAuthRoute && (
        <Navbar currentUser={currentUser} handleLogout={handleLogout} />
      )}
      <main className="main-content">
        <Outlet context={{ currentUser, setCurrentUser, authToken, setAuthToken, isLoggedIn, setIsLoggedIn }} />
      </main>
    </div>
  );
}

export default App;

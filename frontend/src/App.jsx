import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import { supabase } from './supabaseClient';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const navigate = useNavigate();

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

    const syncSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (session) {
        setCurrentUser(mapSessionUser(session.user));
        setAuthToken(session.access_token);
      } else {
        setCurrentUser(null);
        setAuthToken(null);
        navigate('/login');
      }
    };

    syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setCurrentUser(mapSessionUser(session.user));
        setAuthToken(session.access_token);
      } else {
        setCurrentUser(null);
        setAuthToken(null);
        navigate('/login');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setAuthToken(null);
    navigate('/login');
  };

  return (
    <div className="app-container">
      <Navbar currentUser={currentUser} handleLogout={handleLogout} />
      <main className="main-content">
        <Outlet context={{ currentUser, setCurrentUser, authToken, setAuthToken }} />
      </main>
    </div>
  );
}

export default App;

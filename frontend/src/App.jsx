import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import { supabase } from './supabaseClient';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import './App.css';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: "G-35VCLZXMJ0"
};

const firebaseApp = initializeApp(firebaseConfig);
const messaging = getMessaging(firebaseApp);

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

  // Register FCM token when user is logged in
  useEffect(() => {
    if (!isLoggedIn || !authToken) return;

    const registerFCM = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const fcmToken = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
        if (fcmToken) {
          await fetch('/api/profile/fcm-token', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({ fcmToken })
          });
          console.log('FCM token registered');
        }
      } catch (err) {
        console.error('FCM registration error:', err.message);
      }
    };

    registerFCM();
  }, [isLoggedIn, authToken]);

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

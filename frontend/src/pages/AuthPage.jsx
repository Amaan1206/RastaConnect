// RastaConnect/frontend/src/pages/AuthPage.jsx
import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function AuthPage() {
  const { setCurrentUser, setAuthToken } = useOutletContext();
  const navigate = useNavigate();

  // State for forms
  const [registerFullName, setRegisterFullName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerMessage, setRegisterMessage] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');

  // Handler functions (no changes)
  const handleRegister = async (e) => { e.preventDefault(); setRegisterMessage(''); try { const { error } = await supabase.auth.signUp({ email: registerEmail, password: registerPassword }); if (error) throw new Error(error.message); setRegisterMessage('Registration successful. Check your email to confirm your account.'); } catch (error) { setRegisterMessage(error.message); }};
  const handleLogin = async (e) => { e.preventDefault(); setLoginMessage(''); try { const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword }); if (error) throw new Error(error.message); const { data: { session }, error: sessionError } = await supabase.auth.getSession(); if (sessionError) throw new Error(sessionError.message); if (!session) throw new Error('No active session found.'); setAuthToken(session.access_token); setCurrentUser({ id: session.user.id, email: session.user.email, fullName: session.user.user_metadata?.full_name || session.user.email }); navigate('/'); } catch (error) { setLoginMessage(error.message); }};

  return (
    <div className="auth-page-container">
      <div className="auth-forms-wrapper">
        <div className="card">
          <h2>Register</h2>
          <form onSubmit={handleRegister}>
            <input type="text" placeholder="Full Name" value={registerFullName} onChange={(e) => setRegisterFullName(e.target.value)} required />
            <input type="email" placeholder="Email Address" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required />
            <button type="submit">Register</button>
          </form>
          {registerMessage && <p className="info-message">{registerMessage}</p>}
        </div>
        <div className="card">
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Email Address" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
            <button type="submit">Login</button>
          </form>
          {loginMessage && <p className="info-message">{loginMessage}</p>}
        </div>
      </div>
    </div>
  );
}

export default AuthPage;

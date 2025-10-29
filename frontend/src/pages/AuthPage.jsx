// RastaConnect/frontend/src/pages/AuthPage.jsx
import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

function AuthPage() {
  const { setCurrentUser } = useOutletContext();
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
  const handleRegister = async (e) => { e.preventDefault(); setRegisterMessage(''); try { const response = await fetch('/api/users/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: registerFullName, email: registerEmail, password: registerPassword }), }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setRegisterMessage(data.message); } catch (error) { setRegisterMessage(error.message); }};
  const handleLogin = async (e) => { e.preventDefault(); setLoginMessage(''); try { const response = await fetch('/api/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: loginEmail, password: loginPassword }), }); const data = await response.json(); if (!response.ok) throw new Error(data.message); localStorage.setItem('token', data.token); localStorage.setItem('user', JSON.stringify(data.user)); setCurrentUser(data.user); navigate('/'); } catch (error) { setLoginMessage(error.message); }};

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
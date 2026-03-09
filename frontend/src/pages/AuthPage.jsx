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
    <>
      <style>{`
        main.main-content {
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .ac-auth-page {
          background: #c2cbd3;
          color: #313851;
          min-height: 100vh;
          font-family: 'Space Grotesk', sans-serif;
          display: flex;
          flex-direction: column;
        }
        .ac-auth-page * {
          box-sizing: border-box;
          font-family: 'Space Grotesk', sans-serif;
        }
        .ac-auth-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          overflow: hidden;
          background: #c2cbd3;
        }
        .ac-auth-col {
          width: 100%;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .ac-auth-left {
          background: #c2cbd3;
        }
        .ac-auth-right {
          background: rgba(49, 56, 81, 0.05);
          position: relative;
          overflow: hidden;
        }
        .ac-auth-inner {
          width: 100%;
          max-width: 448px;
          margin: 0 auto;
        }
        .ac-auth-heading {
          margin-bottom: 40px;
        }
        .ac-auth-title {
          margin: 0 0 12px 0;
          color: #313851;
          font-size: 36px;
          font-weight: 700;
          line-height: 1.1;
        }
        .ac-auth-subtitle {
          margin: 0;
          color: rgba(49, 56, 81, 0.8);
          font-size: 16px;
          line-height: 1.5;
        }
        .ac-auth-badge {
          display: inline-block;
          margin-bottom: 16px;
          padding: 4px 16px;
          border-radius: 9999px;
          background: rgba(49, 56, 81, 0.1);
          color: #313851;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          line-height: 1.2;
        }
        .ac-form-block {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .ac-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ac-label {
          color: rgba(49, 56, 81, 0.8);
          font-size: 16px;
          font-weight: 400;
          line-height: 1.5;
        }
        .ac-input-wrap {
          position: relative;
        }
        .ac-input-wrap > span.material-symbols-outlined {
          display: none;
        }
        .ac-input {
          width: 100%;
          padding: 16px;
          padding-left: 16px;
          padding-right: 16px;
          border-radius: 12px;
          border: 1px solid rgba(49, 56, 81, 0.2);
          background: rgba(255, 255, 255, 0.5);
          color: #313851;
          font-size: 16px;
          line-height: 1.5;
          outline: none;
          transition: all 0.2s ease;
          box-shadow: none;
        }
        .ac-input::placeholder {
          color: rgba(49, 56, 81, 0.5);
        }
        .ac-input:focus {
          border-color: transparent;
          box-shadow: 0 0 0 2px #313851;
        }
        .ac-login-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 14px;
        }
        .ac-remember {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #313851;
          cursor: pointer;
        }
        .ac-remember-box {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid rgba(49, 56, 81, 0.2);
          background: rgba(255, 255, 255, 0.5);
          accent-color: #313851;
          cursor: pointer;
        }
        .ac-link {
          color: #313851;
          font-weight: 700;
          text-decoration: none;
        }
        .ac-link:hover {
          text-decoration: underline;
        }
        .ac-btn {
          width: 100%;
          padding: 16px 0;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #313851;
          font-size: 24px;
          font-weight: 700;
          line-height: 1.2;
          border-radius: 12px;
          transition: all 0.2s ease;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.3);
          cursor: pointer;
        }
        .ac-btn:hover {
          transform: translateY(-2px);
        }
        .ac-btn:active {
          transform: translateY(0);
        }
        .ac-terms {
          margin: 0;
          color: rgba(49, 56, 81, 0.8);
          font-size: 14px;
          line-height: 1.4;
        }
        .ac-info {
          margin-top: 16px;
          padding: 14px 16px;
          border-radius: 10px;
          border: 1px solid rgba(49, 56, 81, 0.2);
          background: rgba(255, 255, 255, 0.35);
          color: #313851;
          font-size: 14px;
          line-height: 1.45;
        }
        @media (min-width: 768px) {
          .ac-auth-col {
            padding: 48px;
          }
        }
        @media (min-width: 1024px) {
          .ac-auth-main {
            flex-direction: row;
          }
          .ac-auth-col {
            width: 50%;
            padding: 64px;
          }
          .ac-auth-right {
            border-left: 1px solid rgba(49, 56, 81, 0.1);
          }
          .ac-auth-right .ac-auth-heading {
            text-align: left;
          }
        }
      `}</style>
      <div className="ac-auth-page">
        <main className="ac-auth-main">
          <div className="ac-auth-col ac-auth-left">
            <div className="ac-auth-inner">
              <div className="ac-auth-heading">
                <h1 className="ac-auth-title">Welcome Back</h1>
                <p className="ac-auth-subtitle">Join the rhythm of the community. Log in to your space.</p>
              </div>
              <div className="ac-form-block">
                <div className="ac-field">
                  <label className="ac-label">Email Address</label>
                  <div className="ac-input-wrap">
                    <input className="ac-input" type="email" placeholder="Enter your email address" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="ac-field">
                  <label className="ac-label">Password</label>
                  <div className="ac-input-wrap">
                    <input className="ac-input" type="password" placeholder="Enter your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  </div>
                </div>
                <div className="ac-login-row">
                  <label className="ac-remember">
                    <input className="ac-remember-box" type="checkbox" />
                    <span>Remember me</span>
                  </label>
                  <a className="ac-link" href="#">Forgot password?</a>
                </div>
                <button className="ac-btn" type="button" onClick={handleLogin}>Login to Account</button>
              </div>
              {loginMessage && <p className="ac-info">{loginMessage}</p>}
            </div>
          </div>
          <div className="ac-auth-col ac-auth-right">
            <div className="ac-auth-inner">
              <div className="ac-auth-heading" style={{ textAlign: 'center' }}>
                <span className="ac-auth-badge">New here?</span>
                <h2 className="ac-auth-title">Create Account</h2>
                <p className="ac-auth-subtitle">Start your journey with the world&apos;s most vibrant community.</p>
              </div>
              <div className="ac-form-block">
                <div className="ac-field">
                  <label className="ac-label">Full Name</label>
                  <div className="ac-input-wrap">
                    <input className="ac-input" type="text" placeholder="Enter your full name" value={registerFullName} onChange={(e) => setRegisterFullName(e.target.value)} required />
                  </div>
                </div>
                <div className="ac-field">
                  <label className="ac-label">Email Address</label>
                  <div className="ac-input-wrap">
                    <input className="ac-input" type="email" placeholder="Enter your email address" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="ac-field">
                  <label className="ac-label">Password</label>
                  <div className="ac-input-wrap">
                    <input className="ac-input" type="password" placeholder="Create a password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required />
                  </div>
                </div>
                <p className="ac-terms">
                  By registering, you agree to our <a className="ac-link" href="#">Terms of Service</a> and <a className="ac-link" href="#">Privacy Policy</a>.
                </p>
                <button className="ac-btn" type="button" onClick={handleRegister}>Register Now</button>
              </div>
              {registerMessage && <p className="ac-info">{registerMessage}</p>}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default AuthPage;

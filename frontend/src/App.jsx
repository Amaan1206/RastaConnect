import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  useEffect(() => { const token = localStorage.getItem('token'); const user = localStorage.getItem('user'); if (token && user) { setCurrentUser(JSON.parse(user)); } }, []);
  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setCurrentUser(null); navigate('/'); };
  return ( <div className="app-container"> <Navbar currentUser={currentUser} handleLogout={handleLogout} /> <main className="main-content"> <Outlet context={{ currentUser, setCurrentUser }} /> </main> </div> );
}
export default App;
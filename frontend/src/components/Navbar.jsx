import React from 'react';
import { NavLink } from 'react-router-dom';

function Navbar({ currentUser, handleLogout }) {
  if (!currentUser) return null;

  const headerStyle = {
    backgroundColor: '#DFE6E9',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    padding: '0 24px',
    height: '80px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100
  };

  const logoStyle = {
    color: '#313851',
    fontWeight: 700,
    fontSize: '30px',
    lineHeight: 1,
    letterSpacing: '-0.02em',
    textDecoration: 'none'
  };

  const navStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '36px',
    margin: '0 auto'
  };

  const navLinkStyle = ({ isActive }) => ({
    color: isActive ? '#313851' : 'rgba(49, 56, 81, 0.7)',
    textDecoration: 'none',
    fontWeight: isActive ? 700 : 500,
    fontSize: '0.875rem',
    padding: '6px 0 8px',
    borderBottom: isActive ? '2px solid #313851' : '2px solid transparent',
    lineHeight: 1.2
  });

  const logoutButtonStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: '#313851',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    padding: '10px 16px',
    fontWeight: 700,
    cursor: 'pointer',
    lineHeight: 1.2,
    fontFamily: "'Space Grotesk', sans-serif"
  };

  const rightStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: '90px'
  };

  const leftStyle = {
    minWidth: '170px'
  };

  return (
    <>
      <style>{`
        .main-header nav a::after,
        .main-header nav a:hover::after,
        .main-header nav a.active::after {
          display: none !important;
          content: none !important;
        }
      `}</style>
      <header className="main-header" style={headerStyle}>
        <div style={leftStyle}>
          <NavLink to="/" className="logo" style={logoStyle}>RastaConnect</NavLink>
        </div>
        <nav style={navStyle}>
          <NavLink to="/" style={navLinkStyle}>Home</NavLink>
          <NavLink to="/my-rides" style={navLinkStyle}>My Rides</NavLink>
          <NavLink to="/my-vehicles" style={navLinkStyle}>My Vehicles</NavLink>
          <NavLink to="/profile" style={navLinkStyle}>Profile</NavLink>
        </nav>
        <div style={rightStyle}>
          <button onClick={handleLogout} className="logout-button" style={logoutButtonStyle}>Logout</button>
        </div>
      </header>
    </>
  );
}
export default Navbar;

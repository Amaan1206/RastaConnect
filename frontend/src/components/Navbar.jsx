import React from 'react';
import { Link, NavLink } from 'react-router-dom';

function Navbar({ currentUser, handleLogout }) {
  return ( <header className="main-header"> <Link to="/" className="logo">RastaConnect</Link> <nav> <NavLink to="/">Home</NavLink> {currentUser && <NavLink to="/my-rides">My Rides</NavLink>} {currentUser && <NavLink to="/my-vehicles">My Vehicles</NavLink>} {/* --- NEW --- */} {currentUser && <NavLink to="/profile">Profile</NavLink>} {currentUser ? ( <button onClick={handleLogout} className="logout-button">Logout</button> ) : ( <NavLink to="/login">Login / Register</NavLink> )} </nav> </header> );
}
export default Navbar;
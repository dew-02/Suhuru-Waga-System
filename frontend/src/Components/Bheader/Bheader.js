import React, { useState } from "react";
import "./Bheader.css";
import { Link, useNavigate } from "react-router-dom";
import logo from "./logo.jpeg";

function Nav() {
  const navigate = useNavigate();
  const storedUser = localStorage.getItem("user");
  const userData = storedUser ? JSON.parse(storedUser) : null;

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/mainhome");
  };

  return (
    <nav className="navbarrr">
      <div className="navbar-left">
        <img src={logo} alt="Logo" className="navbar-logo" />
        <div className="navbar-logo-text">
          <span className="navbar-logo-primary">Suhuru Waga</span>
        </div>
      </div>

      <ul className="navbar-links">
        <li><Link to="/bfinalhome" className="activer">Home</Link></li>
        <li><Link to="/addbuy" className="activer">Register</Link></li>
        
        <li><Link to="/cropads" className="activer">Advertisments</Link></li>
        <li><Link to="/confirmorder" className="activer">Orders</Link></li>
        <li><Link to="/bpaydisplay" className="activer">Payment</Link></li>
         <li><Link to="/UserDetails" className="activer">Profile</Link></li>
          <li><Link to="/bprofiles" className="activer">Buyer</Link></li>
          <li><Link to="/Features" className="activer">Features</Link></li>
      </ul>

      <div className="navbar-right">
        {userData ? (
          <>
            <span className="navbar-username">Hello, {userData.fullname}</span>
            <button className="dashboard-button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/Login" className="dashboard-button">LogIn</Link>
        )}
      </div>
    </nav>
  );
}

export default Nav;
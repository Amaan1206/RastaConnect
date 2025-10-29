// RastaConnect/backend/routes/my-rides.js
const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const router = express.Router();

// GET rides offered by the logged-in user
router.get('/offered', auth, (req, res) => { const driverId = req.user.id; const sql = `SELECT id, origin, destination, departureTime, availableSeats, price, status FROM rides WHERE driverId = ?`; db.all(sql, [driverId], (err, rows) => { if (err) { return res.status(500).json({ message: "Database error.", error: err.message }); } res.status(200).json({ rides: rows }); }); });

// --- UPDATED: GET rides booked by the logged-in user ---
router.get('/booked', auth, (req, res) => {
  const passengerId = req.user.id;
  // This query now also JOINS the vehicles table to get vehicle details
  const sql = `
    SELECT 
      r.id as rideId, 
      r.origin, r.destination, r.departureTime, r.price,
      u.fullName as driverName,
      b.id as bookingId, b.status as bookingStatus,
      v.make as vehicleMake,
      v.model as vehicleModel,
      v.color as vehicleColor,
      v.registrationNumber as vehicleRegistration
    FROM bookings b
    JOIN rides r ON b.rideId = r.id
    JOIN users u ON r.driverId = u.id
    JOIN vehicles v ON r.vehicleId = v.id
    WHERE b.passengerId = ? AND b.status = 'confirmed'
  `;
  db.all(sql, [passengerId], (err, rows) => {
    if (err) { return res.status(500).json({ message: "Database error.", error: err.message }); }
    res.status(200).json({ rides: rows });
  });
});

module.exports = router;
const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', (req, res) => {
  const sql = `
    SELECT r.id, r.origin, r.destination, r.departureTime, r.availableSeats, r.price, u.fullName as driverName 
    FROM rides r 
    JOIN users u ON r.driverId = u.id 
    WHERE r.status = 'active' AND r.availableSeats > 0`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("!!! DATABASE ERROR fetching rides:", err.message);
      return res.status(500).json({ message: "Database error.", error: err.message });
    }
    res.status(200).json({ rides: rows });
  });
});

router.post('/', auth, (req, res) => {
  const driverId = req.user.id;
  const { origin, destination, departureTime, availableSeats, price, vehicleId } = req.body;
  if (!vehicleId) { return res.status(400).json({ message: "Please select a vehicle for the ride." }); }
  const sql = `INSERT INTO rides (driverId, origin, destination, departureTime, availableSeats, price, status, vehicleId) VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`;
  db.run(sql, [driverId, origin, destination, departureTime, availableSeats, price, vehicleId], function(err) {
    if (err) { return res.status(500).json({ message: "Database error.", error: err.message }); }
    res.status(201).json({ message: "Ride offered successfully!", rideId: this.lastID });
  });
});

router.delete('/:rideId', auth, (req, res) => {
  const rideId = req.params.rideId;
  const driverId = req.user.id;
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    const checkSql = `SELECT driverId FROM rides WHERE id = ?`;
    db.get(checkSql, [rideId], (err, ride) => {
      if (err || !ride || ride.driverId !== driverId) { db.run('ROLLBACK'); return res.status(403).json({ message: 'Forbidden: You are not the driver of this ride.' }); }
      const updateRideSql = `UPDATE rides SET status = 'canceled' WHERE id = ?`;
      db.run(updateRideSql, [rideId], (err) => {
        if (err) { db.run('ROLLBACK'); return res.status(500).json({ message: 'Failed to cancel ride.' }); }
        const updateBookingsSql = `UPDATE bookings SET status = 'canceled' WHERE rideId = ?`;
        db.run(updateBookingsSql, [rideId], (err) => {
          if (err) { db.run('ROLLBACK'); return res.status(500).json({ message: 'Failed to cancel associated bookings.' }); }
          db.run('COMMIT');
          res.status(200).json({ message: 'Ride and all associated bookings have been canceled.' });
        });
      });
    });
  });
});

router.post('/:rideId/book', auth, (req, res) => {
  const rideId = req.params.rideId;
  const passengerId = req.user.id;
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    const checkRideSql = `SELECT availableSeats, driverId FROM rides WHERE id = ? AND status = 'active'`;
    db.get(checkRideSql, [rideId], (err, ride) => {
      if (err) { db.run('ROLLBACK'); return res.status(500).json({ message: 'Database error checking ride.' }); }
      if (!ride) { db.run('ROLLBACK'); return res.status(404).json({ message: 'Ride not found or is no longer active.' }); }
      if (ride.driverId === passengerId) { db.run('ROLLBACK'); return res.status(400).json({ message: "You cannot book your own ride." }); }
      if (ride.availableSeats < 1) { db.run('ROLLBACK'); return res.status(400).json({ message: 'No seats available on this ride.' }); }
      const updateRideSql = `UPDATE rides SET availableSeats = availableSeats - 1 WHERE id = ?`;
      db.run(updateRideSql, [rideId], (err) => {
        if (err) { db.run('ROLLBACK'); return res.status(500).json({ message: 'Failed to update ride seats.' }); }
        const insertBookingSql = `INSERT INTO bookings (rideId, passengerId) VALUES (?, ?)`;
        db.run(insertBookingSql, [rideId, passengerId], function(err) {
          if (err) { db.run('ROLLBACK'); return res.status(500).json({ message: 'Failed to create booking.' }); }
          db.run('COMMIT');
          res.status(201).json({ message: 'Ride booked successfully!', bookingId: this.lastID });
        });
      });
    });
  });
});

module.exports = router;
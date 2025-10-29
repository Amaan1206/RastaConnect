// RastaConnect/backend/routes/vehicles.js
const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const router = express.Router();

// GET a user's registered vehicles
router.get('/', auth, (req, res) => {
    const sql = "SELECT * FROM vehicles WHERE ownerId = ?";
    db.all(sql, [req.user.id], (err, vehicles) => {
        if (err) { return res.status(500).json({ message: 'Database error.'}); }
        res.json({ vehicles });
    });
});

// POST - Add a new vehicle
router.post('/', auth, (req, res) => {
    const { type, make, model, color, registrationNumber } = req.body;
    const ownerId = req.user.id;
    const sql = `INSERT INTO vehicles (ownerId, type, make, model, color, registrationNumber) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [ownerId, type, make, model, color, registrationNumber.toUpperCase()], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ message: 'This registration number is already registered.' });
            }
            return res.status(500).json({ message: 'Database error.' });
        }
        res.status(201).json({ message: 'Vehicle added successfully!', vehicleId: this.lastID });
    });
});

module.exports = router;
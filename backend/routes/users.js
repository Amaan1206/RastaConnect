const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const router = express.Router();
const JWT_SECRET = 'your_super_secret_key_123';

router.post('/register', async (req, res) => { /* ... existing register code ... */ const { fullName, email, password } = req.body; if (!fullName || !email || !password) { return res.status(400).json({ message: 'Please enter all fields' }); } const salt = await bcrypt.genSalt(10); const hashedPassword = await bcrypt.hash(password, salt); const sql = `INSERT INTO users (fullName, email, password) VALUES (?, ?, ?)`; db.run(sql, [fullName, email, hashedPassword], function(err) { if (err) { if (err.message.includes('UNIQUE constraint failed')) { return res.status(400).json({ message: "User with this email already exists." }); } return res.status(500).json({ message: "Database error.", error: err.message }); } const newUser = { id: this.lastID, fullName, email }; res.status(201).json({ message: "User registered successfully!", user: newUser }); }); });

router.post('/login', (req, res) => { 
    const { email, password } = req.body; 
    const sql = `SELECT * FROM users WHERE email = ?`; 
    db.get(sql, [email], async (err, user) => { 
        if (err || !user) { return res.status(401).json({ message: "Invalid email or password." }); } 
        const isMatch = await bcrypt.compare(password, user.password); 
        if (!isMatch) { return res.status(401).json({ message: "Invalid email or password." }); } 

        const payload = { user: { id: user.id, email: user.email, fullName: user.fullName, } }; 

        // --- UPDATED: Token now expires in 30 days ---
        jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }, (err, token) => { 
            if (err) throw err; 
            res.status(200).json({ 
                message: "Login successful!", 
                token: token, 
                user: { id: user.id, fullName: user.fullName, email: user.email } 
            }); 
        }); 
    }); 
});

module.exports = router;
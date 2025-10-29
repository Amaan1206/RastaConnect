const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const router = express.Router();
const otpStore = {};

// Get current user's profile
router.get('/', auth, (req, res) => {
  const sql = "SELECT id, fullName, email, phoneNumber, phoneVerified, panNumber, panVerified, gender, age, talkativeness, musicPreference FROM users WHERE id = ?";
  db.get(sql, [req.user.id], (err, user) => { if (err || !user) { return res.status(404).json({ message: 'User not found.' }); } res.json(user); });
});

// --- NEW: Update User Profile ---
router.put('/', auth, (req, res) => {
    const { fullName, gender, age, talkativeness, musicPreference } = req.body;
    const userId = req.user.id;

    const sql = `UPDATE users SET 
        fullName = ?, 
        gender = ?, 
        age = ?, 
        talkativeness = ?, 
        musicPreference = ?
        WHERE id = ?`;

    db.run(sql, [fullName, gender, age, talkativeness, musicPreference, userId], (err) => {
        if (err) { return res.status(500).json({ message: 'Database error updating profile.'}); }
        res.status(200).json({ message: 'Profile updated successfully.' });
    });
});

// OTP Endpoints (no changes)
router.post('/send-otp', auth, (req, res) => { const { phoneNumber } = req.body; const userId = req.user.id; const otp = Math.floor(1000 + Math.random() * 9000).toString(); otpStore[userId] = { otp, phoneNumber }; console.log(`\n\n!!!! OTP for user ${userId} (${phoneNumber}): ${otp} !!!!\n\n`); const sql = "UPDATE users SET phoneNumber = ? WHERE id = ?"; db.run(sql, [phoneNumber, userId], (err) => { if (err) { return res.status(500).json({ message: 'Database error updating phone number.' }); } res.status(200).json({ message: 'OTP sent successfully.', otp: otp }); }); });
router.post('/verify-otp', auth, (req, res) => { const { otp } = req.body; const userId = req.user.id; if (!otpStore[userId] || otpStore[userId].otp !== otp) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); } const sql = "UPDATE users SET phoneVerified = 1 WHERE id = ?"; db.run(sql, [userId], (err) => { if (err) { return res.status(500).json({ message: 'Database error verifying phone.' }); } delete otpStore[userId]; res.status(200).json({ message: 'Phone number verified successfully.' }); }); });
router.post('/verify-pan', auth, (req, res) => { const { panNumber } = req.body; const userId = req.user.id; if (!panNumber || panNumber.length !== 10) { return res.status(400).json({ message: 'Invalid PAN format. Must be 10 characters.' }); } if (panNumber.includes('1234')) { const sql = "UPDATE users SET panNumber = ?, panVerified = 1 WHERE id = ?"; db.run(sql, [panNumber, userId], (err) => { if (err) { return res.status(500).json({ message: 'Database error.' }); } res.status(200).json({ message: 'PAN verified successfully.' }); }); } else { res.status(400).json({ message: 'PAN could not be verified.' }); } });

module.exports = router;
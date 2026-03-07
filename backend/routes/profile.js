const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const auth = require('../middleware/auth');
const router = express.Router();
const otpStore = {};
const phoneVerificationStatus = {};
const panVerificationStatus = {};
const panNumberStore = {};
const profilePreferences = {};

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://swxocqjjfyfhwacioanc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eG9jcWpqZnlmaHdhY2lvYW5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwODAyMCwiZXhwIjoyMDg4Mzg0MDIwfQ.RG37CMiXXWd-iauAPYWLOGsn2vPQOmA2neGNdCsvupo'
);

// Get current user's profile
router.get('/', auth, async (req, res) => {
  const userId = req.user.id;
  const { data: user, error } = await supabase
    .from('users')
    .select('id, full_name, email, phone')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ message: 'Database error fetching profile.' });
  }

  let profileUser = user;

  if (!profileUser) {
    const fallbackEmail = req.user.email || '';
    const fallbackFullName =
      req.user.user_metadata?.fullName || fallbackEmail || 'User';

    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert([{ id: userId, full_name: fallbackFullName, email: fallbackEmail }])
      .select('id, full_name, email, phone')
      .single();

    if (createError) {
      return res.status(500).json({ message: 'Database error fetching profile.' });
    }

    profileUser = createdUser;
  }

  const preferences = profilePreferences[userId] || {};
  return res.json({
    id: profileUser.id,
    fullName: profileUser.full_name,
    email: profileUser.email,
    phoneNumber: profileUser.phone || '',
    phoneVerified: Boolean(phoneVerificationStatus[userId]),
    panNumber: panNumberStore[userId] || '',
    panVerified: Boolean(panVerificationStatus[userId]),
    gender: preferences.gender || '',
    age: preferences.age || '',
    talkativeness: preferences.talkativeness || 'Sometimes',
    musicPreference: preferences.musicPreference || 'Any',
  });
});

// Update User Profile
router.put('/', auth, async (req, res) => {
  const { fullName, gender, age, talkativeness, musicPreference } = req.body;
  const userId = req.user.id;
  const fallbackEmail = req.user.email || '';
  const nextFullName =
    fullName || req.user.user_metadata?.full_name || fallbackEmail || 'User';

  const { error } = await supabase
    .from('users')
    .upsert(
      [{ id: userId, full_name: nextFullName, email: fallbackEmail }],
      { onConflict: 'id' }
    );

  if (error) { return res.status(500).json({ message: 'Database error updating profile.' }); }

  profilePreferences[userId] = {
    gender: gender || '',
    age: age || '',
    talkativeness: talkativeness || 'Sometimes',
    musicPreference: musicPreference || 'Any',
  };

  return res.status(200).json({ message: 'Profile updated successfully.' });
});

// OTP Endpoints
router.post('/send-otp', auth, async (req, res) => {
  const { phoneNumber } = req.body;
  const userId = req.user.id;
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  otpStore[userId] = { otp, phoneNumber };
  phoneVerificationStatus[userId] = false;
  console.log(`\n\n!!!! OTP for user ${userId} (${phoneNumber}): ${otp} !!!!\n\n`);

  const { error } = await supabase
    .from('users')
    .update({ phone: phoneNumber })
    .eq('id', userId);

  if (error) {
    return res.status(500).json({ message: 'Database error updating phone number.' });
  }

  return res.status(200).json({ message: 'OTP sent successfully.', otp });
});

router.post('/verify-otp', auth, async (req, res) => {
  const { otp } = req.body;
  const userId = req.user.id;

  if (!otpStore[userId] || otpStore[userId].otp !== otp) {
    return res.status(400).json({ message: 'Invalid or expired OTP.' });
  }

  phoneVerificationStatus[userId] = true;
  delete otpStore[userId];
  return res.status(200).json({ message: 'Phone number verified successfully.' });
});

router.post('/verify-pan', auth, async (req, res) => {
  const { panNumber } = req.body;
  const userId = req.user.id;

  if (!panNumber || panNumber.length !== 10) {
    return res.status(400).json({ message: 'Invalid PAN format. Must be 10 characters.' });
  }

  if (panNumber.includes('1234')) {
    panNumberStore[userId] = panNumber;
    panVerificationStatus[userId] = true;
    return res.status(200).json({ message: 'PAN verified successfully.' });
  }

  return res.status(400).json({ message: 'PAN could not be verified.' });
});

module.exports = router;

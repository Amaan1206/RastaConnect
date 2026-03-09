const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');
const auth = require('../middleware/auth');
const router = express.Router();
const otpStore = {};
const phoneVerificationStatus = {};
const panVerificationStatus = {};
const panNumberStore = {};
const upload = multer({ storage: multer.memoryStorage() });

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://swxocqjjfyfhwacioanc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eG9jcWpqZnlmaHdhY2lvYW5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwODAyMCwiZXhwIjoyMDg4Mzg0MDIwfQ.RG37CMiXXWd-iauAPYWLOGsn2vPQOmA2neGNdCsvupo'
);

router.get('/', auth, async (req, res) => {
  const userId = req.user.id;
  const { data: user, error } = await supabase
    .from('users')
    .select('id, full_name, email, phone, age, gender, talkativeness, music_preference, phone_verified, face_verified, date_of_birth, smoking_allowed, pet_friendly, total_rides, average_rating')
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
      .select('id, full_name, email, phone, age, gender, talkativeness, music_preference, phone_verified, face_verified, date_of_birth, smoking_allowed, pet_friendly, total_rides, average_rating')
      .single();

    if (createError) {
      return res.status(500).json({ message: 'Database error fetching profile.' });
    }

    profileUser = createdUser;
  }

  return res.json({
    id: profileUser.id,
    fullName: profileUser.full_name,
    email: profileUser.email,
    phoneNumber: profileUser.phone || '',
    phoneVerified: Boolean(profileUser.phone_verified),
    panNumber: panNumberStore[userId] || '',
    panVerified: Boolean(panVerificationStatus[userId]),
    faceVerified: Boolean(profileUser.face_verified),
    dateOfBirth: profileUser.date_of_birth || '',
    smokingAllowed: Boolean(profileUser.smoking_allowed),
    petFriendly: Boolean(profileUser.pet_friendly),
    totalRides: profileUser.total_rides || 0,
    averageRating: profileUser.average_rating || 0,
    gender: profileUser.gender || '',
    age: profileUser.age || '',
    talkativeness: profileUser.talkativeness || 'Sometimes',
    musicPreference: profileUser.music_preference || 'Any',
  });
});

router.put('/', auth, async (req, res) => {
  const { fullName, gender, age, talkativeness, musicPreference, dateOfBirth, smokingAllowed, petFriendly } = req.body;
  const userId = req.user.id;
  const fallbackEmail = req.user.email || '';
  const nextFullName =
    fullName || req.user.user_metadata?.full_name || fallbackEmail || 'User';

  const { error } = await supabase
    .from('users')
    .upsert(
      [{
        id: userId,
        full_name: nextFullName,
        email: fallbackEmail,
        age: age || '',
        gender: gender || '',
        talkativeness: talkativeness || 'Sometimes',
        music_preference: musicPreference || 'Any',
        date_of_birth: dateOfBirth || null,
        smoking_allowed: Boolean(smokingAllowed),
        pet_friendly: Boolean(petFriendly)
      }],
      { onConflict: 'id' }
    );

  if (error) { return res.status(500).json({ message: 'Database error updating profile.' }); }
  return res.status(200).json({ message: 'Profile updated successfully.' });
});

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
  const { error: phoneUpdateError } = await supabase.from('users').update({ phone_verified: true }).eq('id', userId);
  console.log('phone_verified update error:', phoneUpdateError);
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

router.post('/upload-face', auth, (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.log('MULTER ERROR:', err.message);
      return res.status(500).json({ message: 'File upload error: ' + err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const file = req.files && req.files[0];
    const userId = req.user.id;

    if (!file) {
      return res.status(400).json({ message: 'Image file is required.' });
    }

    console.log('Calling face service with file:', file.originalname, file.size, file.mimetype);

    const form = new FormData();
    form.append('image', file.buffer, {
      filename: file.originalname || 'face.jpg',
      contentType: file.mimetype || 'image/jpeg'
    });

    const faceResponse = await fetch('https://rastaconnect-face-service.onrender.com/extract-embedding', {
      method: 'POST',
      headers: form.getHeaders(),
      body: form
    });

    let faceData = null;
    try {
      faceData = await faceResponse.json();
    } catch (_parseError) {
      faceData = null;
    }

    console.log('Face service status:', faceResponse.status);
    console.log('Face service data:', JSON.stringify(faceData));

    if (faceResponse.status === 400) {
      return res.status(400).json({ message: 'No face detected in image.' });
    }

    if (!faceResponse.ok) {
      return res.status(500).json({ message: 'Face service error.' });
    }

    const embedding = Array.isArray(faceData) ? faceData : faceData?.embedding;

    if (!Array.isArray(embedding) || embedding.length !== 512) {
      return res.status(500).json({ message: 'Invalid embedding returned by face service.' });
    }

    const { error } = await supabase
      .from('users')
      .update({ face_embedding: embedding })
      .eq('id', userId);

    if (error) {
      return res.status(500).json({ message: 'Database error updating face embedding.' });
    }

    return res.status(200).json({ message: 'Face registered successfully' });
  } catch (error) {
    console.log('UPLOAD FACE ERROR:', error.message, error.stack);
    return res.status(500).json({ message: error.message });
  }
});

router.get('/face-embedding', auth, async (req, res) => {
  const userId = req.user.id;
  const { data, error } = await supabase
    .from('users')
    .select('face_embedding')
    .eq('id', userId)
    .single();

  if (error) {
    return res.status(500).json({ message: 'Database error fetching face embedding.' });
  }

  let embedding = data?.face_embedding;

  // pgvector returns string like "[0.1,0.2,...]" - parse it
  if (typeof embedding === 'string') {
    try {
      embedding = JSON.parse(embedding);
    } catch {
      return res.status(500).json({ message: 'Failed to parse stored embedding.' });
    }
  }

  if (!Array.isArray(embedding) || embedding.length === 0) {
    return res.status(404).json({ message: 'No face embedding stored yet.' });
  }

  return res.status(200).json({ embedding });
});

router.put('/verify-face', auth, async (req, res) => {
  const userId = req.user.id;
  const { error } = await supabase
    .from('users')
    .update({ face_verified: true })
    .eq('id', userId);

  if (error) {
    return res.status(500).json({ message: 'Database error updating face verification.' });
  }

  return res.status(200).json({ message: 'Face verified successfully' });
});

router.post('/verify-face-match', auth, async (req, res) => {
  try {
    const { embedding1, embedding2 } = req.body;
    console.log('e1 length:', Array.isArray(embedding1) ? embedding1.length : typeof embedding1);
    console.log('e2 length:', Array.isArray(embedding2) ? embedding2.length : typeof embedding2);

    const response = await fetch('https://rastaconnect-face-service.onrender.com/verify-face', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embedding1, embedding2 })
    });

    const data = await response.json();
    console.log('Render verify response:', response.status, JSON.stringify(data));
    return res.status(response.status).json(data);
  } catch (error) {
    console.log('VERIFY MATCH ERROR:', error.message);
    return res.status(500).json({ message: error.message });
  }
});

router.post('/extract-embedding', auth, (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) return res.status(500).json({ message: 'File upload error: ' + err.message });
    next();
  });
}, async (req, res) => {
  try {
    const file = req.files && req.files[0];
    if (!file) return res.status(400).json({ message: 'Image file is required.' });

    const form = new FormData();
    form.append('image', file.buffer, {
      filename: file.originalname || 'face.jpg',
      contentType: file.mimetype || 'image/jpeg'
    });

    const faceResponse = await fetch('https://rastaconnect-face-service.onrender.com/extract-embedding', {
      method: 'POST',
      headers: form.getHeaders(),
      body: form
    });

    const faceData = await faceResponse.json();
    if (faceResponse.status === 400) return res.status(400).json({ message: 'No face detected.' });
    if (!faceResponse.ok) return res.status(500).json({ message: 'Face service error.' });

    const embedding = Array.isArray(faceData) ? faceData : faceData?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== 512) {
      return res.status(500).json({ message: 'Invalid embedding from face service.' });
    }

    return res.status(200).json({ embedding });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete('/delete-account', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('user_id', userId);
    await supabase.from('rides').update({ status: 'cancelled' }).eq('user_id', userId);
    await supabase.from('users').delete().eq('id', userId);
    await supabase.auth.admin.deleteUser(userId);
    return res.status(200).json({ message: 'Account deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
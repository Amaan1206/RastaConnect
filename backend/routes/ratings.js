const express = require('express');
const supabase = require('../utils/supabaseClient');
const auth = require('../middleware/auth');
const router = express.Router();

// POST - Submit a rating
router.post('/', auth, async (req, res) => {
  try {
    const raterId = req.user.id;
    const { rideId, ratedId, rating, comment } = req.body;

    if (!rideId || !ratedId || !rating) {
      return res.status(400).json({ message: 'rideId, ratedId and rating are required.' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }
    if (raterId === ratedId) {
      return res.status(400).json({ message: 'You cannot rate yourself.' });
    }

    // Check ride is completed
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('status')
      .eq('id', rideId)
      .maybeSingle();

    if (rideError || !ride) return res.status(404).json({ message: 'Ride not found.' });
    if (ride.status !== 'completed') return res.status(400).json({ message: 'Ride is not completed yet.' });

    // Insert rating
    const { error: insertError } = await supabase
      .from('ratings')
      .insert([{ ride_id: rideId, rater_id: raterId, rated_id: ratedId, rating, comment: comment || '' }]);

    if (insertError) {
      if (insertError.code === '23505') return res.status(400).json({ message: 'You have already rated this ride.' });
      return res.status(500).json({ message: 'Database error.', error: insertError.message });
    }

    // Recalculate average rating for rated user
    const { data: allRatings, error: ratingsError } = await supabase
      .from('ratings')
      .select('rating')
      .eq('rated_id', ratedId);

    if (!ratingsError && allRatings) {
      const avg = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
      await supabase
        .from('users')
        .update({ average_rating: Math.round(avg * 100) / 100 })
        .eq('id', ratedId);
    }

    return res.status(201).json({ message: 'Rating submitted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET - Check if current user has already rated someone for a ride
router.get('/check', auth, async (req, res) => {
  try {
    const raterId = req.user.id;
    const { rideId, ratedId } = req.query;

    const { data, error } = await supabase
      .from('ratings')
      .select('id')
      .eq('ride_id', rideId)
      .eq('rater_id', raterId)
      .eq('rated_id', ratedId)
      .maybeSingle();

    if (error) return res.status(500).json({ message: 'Database error.' });
    return res.status(200).json({ alreadyRated: Boolean(data) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET - Get all ratings for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('id, rating, comment, created_at, rater_id, users!ratings_rater_id_fkey(full_name)')
      .eq('rated_id', req.params.userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ message: 'Database error.' });
    return res.status(200).json({ ratings: data || [] });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;

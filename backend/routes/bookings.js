const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const auth = require('../middleware/auth');
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://swxocqjjfyfhwacioanc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eG9jcWpqZnlmaHdhY2lvYW5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwODAyMCwiZXhwIjoyMDg4Mzg0MDIwfQ.RG37CMiXXWd-iauAPYWLOGsn2vPQOmA2neGNdCsvupo'
);

router.get('/', auth, async (req, res) => {
  const userId = req.user.id;
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    return res.status(500).json({ message: 'Database error.', error: error.message });
  }

  const bookings = (data || []).map((booking) => ({
    id: booking.id,
    rideId: booking.ride_id,
    passengerId: booking.user_id,
    seats: booking.seats,
    status: booking.status,
    created_at: booking.created_at,
  }));

  return res.status(200).json({ bookings });
});

router.post('/', auth, async (req, res) => {
  const passengerId = req.user.id;
  const { rideId, seats } = req.body;

  const payload = {
    ride_id: rideId,
    user_id: passengerId,
    seats: Number(seats) > 0 ? Number(seats) : 1,
    status: 'confirmed',
  };

  const { data, error } = await supabase
    .from('bookings')
    .insert([payload])
    .select('id')
    .single();

  if (error) {
    return res.status(500).json({ message: 'Database error.', error: error.message });
  }

  return res.status(201).json({ message: 'Booking created successfully.', bookingId: data.id });
});

router.delete('/:bookingId', auth, async (req, res) => {
  const bookingId = req.params.bookingId;
  const passengerId = req.user.id;

  const { data: booking, error: checkError } = await supabase
    .from('bookings')
    .select('ride_id')
    .eq('id', bookingId)
    .eq('user_id', passengerId)
    .eq('status', 'confirmed')
    .maybeSingle();

  if (checkError || !booking) {
    return res.status(403).json({ message: 'Forbidden: Booking not found or you are not the passenger.' });
  }

  const { error: updateBookingError } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);

  if (updateBookingError) {
    return res.status(500).json({ message: 'Failed to cancel booking.' });
  }

  const { data: ride, error: fetchRideError } = await supabase
    .from('rides')
    .select('available_seats')
    .eq('id', booking.ride_id)
    .maybeSingle();

  if (fetchRideError || !ride) {
    return res.status(500).json({ message: 'Failed to update ride seats.' });
  }

  const { error: updateRideError } = await supabase
    .from('rides')
    .update({ available_seats: (ride.available_seats || 0) + 1 })
    .eq('id', booking.ride_id);

  if (updateRideError) {
    return res.status(500).json({ message: 'Failed to update ride seats.' });
  }

  return res.status(200).json({ message: 'Booking canceled successfully.' });
});

module.exports = router;

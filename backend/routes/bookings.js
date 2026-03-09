const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const auth = require('../middleware/auth');
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://swxocqjjfyfhwacioanc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eG9jcWpqZnlmaHdhY2lvYW5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwODAyMCwiZXhwIjoyMDg4Mzg0MDIwfQ.RG37CMiXXWd-iauAPYWLOGsn2vPQOmA2neGNdCsvupo'
);

const toPassengerProfile = (user) => {
  return {
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    age: user?.age || '',
    gender: user?.gender || '',
    talkativeness: user?.talkativeness || '',
    music_preference: user?.music_preference || '',
  };
};

// GET all bookings for current user
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

// GET all bookings for a specific ride (driver only)
router.get('/ride/:rideId', auth, async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const ownerId = req.user.id;
    console.log('Fetching bookings for ride:', rideId, 'owner:', ownerId);

    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('id, user_id')
      .eq('id', rideId)
      .maybeSingle();

    if (rideError) {
      console.log('Ride error:', rideError);
      return res.status(500).json({ message: 'Database error.', error: rideError.message });
    }

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' });
    }

    if (ride.user_id !== ownerId) {
      return res.status(403).json({ message: 'Forbidden: You are not the owner of this ride.' });
    }

    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, ride_id, user_id, seats, status, created_at, pickup_location, drop_location, passenger_price, driver_price')
      .eq('ride_id', rideId);

    if (bookingsError) {
      console.log('Bookings error:', bookingsError);
      return res.status(500).json({ message: 'Database error.', error: bookingsError.message });
    }

    if (!bookingsData || bookingsData.length === 0) {
      return res.status(200).json({ bookings: [] });
    }

    const passengerIds = [...new Set(bookingsData.map((b) => b.user_id).filter(Boolean))];
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, phone, age, gender, talkativeness, music_preference')
      .in('id', passengerIds);

    if (usersError) {
      console.log('Users error:', usersError);
      return res.status(500).json({ message: 'Database error.', error: usersError.message });
    }

    const usersById = new Map((usersData || []).map((u) => [u.id, u]));
    const bookings = bookingsData.map((booking) => {
      const passenger = toPassengerProfile(usersById.get(booking.user_id));
      return {
        id: booking.id,
        ride_id: booking.ride_id,
        user_id: booking.user_id,
        seats: booking.seats,
        status: booking.status,
        created_at: booking.created_at,
        pickup_location: booking.pickup_location || '',
        drop_location: booking.drop_location || '',
        passenger_price: booking.passenger_price ?? null,
        driver_price: booking.driver_price ?? null,
        full_name: passenger.full_name,
        email: passenger.email,
        phone: passenger.phone,
        age: passenger.age,
        gender: passenger.gender,
        talkativeness: passenger.talkativeness,
        music_preference: passenger.music_preference,
      };
    });

    return res.status(200).json({ bookings });
  } catch (err) {
    console.log('CAUGHT ERROR:', err);
    return res.status(500).json({ message: err.message });
  }
});

// POST - Create a new booking
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
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ message: 'Database error.', error: error.message });
  }

  const { data: passenger, error: passengerError } = await supabase
    .from('users')
    .select('id, full_name, email, phone, age, gender, talkativeness, music_preference')
    .eq('id', passengerId)
    .maybeSingle();

  if (passengerError) {
    return res.status(500).json({ message: 'Database error.', error: passengerError.message });
  }

  return res.status(201).json({
    message: 'Booking created successfully.',
    bookingId: data.id,
    booking: data,
    passenger: toPassengerProfile(passenger),
  });
});

// DELETE - Cancel a booking
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

// PUT - Driver confirms a pending booking
router.put('/:bookingId/confirm', auth, async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const driverId = req.user.id;

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, ride_id, status, user_id')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchError || !booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.status !== 'pending') return res.status(400).json({ message: 'Booking is not pending.' });

    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('user_id, available_seats')
      .eq('id', booking.ride_id)
      .maybeSingle();

    if (rideError || !ride) return res.status(404).json({ message: 'Ride not found.' });
    if (ride.user_id !== driverId) return res.status(403).json({ message: 'Forbidden: You are not the driver.' });

    const { error: updateBookingError } = await supabase
      .from('bookings')
      .update({ status: 'confirmed', passenger_price: booking.passenger_price })
      .eq('id', bookingId);

    if (updateBookingError) return res.status(500).json({ message: 'Failed to confirm booking.' });

    const { error: updateSeatError } = await supabase
      .from('rides')
      .update({ available_seats: ride.available_seats - 1 })
      .eq('id', booking.ride_id);

    if (updateSeatError) return res.status(500).json({ message: 'Failed to update seats.' });

    return res.status(200).json({ message: 'Booking confirmed.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// PUT - Driver rejects a pending booking
router.put('/:bookingId/reject', auth, async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const driverId = req.user.id;

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, ride_id, status')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchError || !booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.status !== 'pending') return res.status(400).json({ message: 'Booking is not pending.' });

    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('user_id')
      .eq('id', booking.ride_id)
      .maybeSingle();

    if (rideError || !ride) return res.status(404).json({ message: 'Ride not found.' });
    if (ride.user_id !== driverId) return res.status(403).json({ message: 'Forbidden: You are not the driver.' });

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (updateError) return res.status(500).json({ message: 'Failed to reject booking.' });

    return res.status(200).json({ message: 'Booking rejected.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;

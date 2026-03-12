const express = require('express');
const supabase = require('../utils/supabaseClient');
const auth = require('../middleware/auth');
const mailer = require('../utils/mailer');
const { notifyUser } = require('../utils/notify');
const router = express.Router();

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

    // Send booking confirmation email to passenger
    try {
      const { data: passenger } = await supabase.from('users').select('email, full_name').eq('id', booking.user_id).maybeSingle();
      const { data: driver } = await supabase.from('users').select('full_name').eq('id', driverId).maybeSingle();
      const { data: rideDetails } = await supabase.from('rides').select('pickup_address, dropoff_address, departure_time, vehicles(make, model, plate_number)').eq('id', booking.ride_id).maybeSingle();
      if (passenger?.email) {
        mailer.sendBookingConfirmation(passenger.email, {
          passengerName: passenger.full_name || 'Passenger',
          driverName: driver?.full_name || 'Driver',
          origin: rideDetails?.pickup_address || '',
          destination: rideDetails?.dropoff_address || '',
          departureTime: rideDetails?.departure_time || '',
          vehicleMake: rideDetails?.vehicles?.make || '',
          vehicleModel: rideDetails?.vehicles?.model || '',
          vehiclePlate: rideDetails?.vehicles?.plate_number || '',
          price: booking.passenger_price || 0
        }).catch(e => console.error('Booking confirmation email error:', e.message));
      }
    } catch (emailErr) {
      console.error('Email send error (non-blocking):', emailErr.message);
    }

    // Push notification to passenger
    try {
      const { data: rd } = await supabase.from('rides').select('pickup_address, dropoff_address').eq('id', booking.ride_id).maybeSingle();
      notifyUser(supabase, booking.user_id, 'Booking Confirmed \u2705', `Your ride from ${rd?.pickup_address || 'origin'} to ${rd?.dropoff_address || 'destination'} is confirmed!`);
    } catch (pushErr) {
      console.error('Push notification error (non-blocking):', pushErr.message);
    }

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

    // Send cancellation email to passenger
    try {
      const { data: passenger } = await supabase.from('users').select('email, full_name').eq('id', booking.user_id).maybeSingle();
      const { data: rideDetails } = await supabase.from('rides').select('pickup_address, dropoff_address, departure_time').eq('id', booking.ride_id).maybeSingle();
      if (passenger?.email) {
        mailer.sendBookingCancellation(passenger.email, {
          passengerName: passenger.full_name || 'Passenger',
          origin: rideDetails?.pickup_address || '',
          destination: rideDetails?.dropoff_address || '',
          departureTime: rideDetails?.departure_time || ''
        }).catch(e => console.error('Booking rejection email error:', e.message));
      }
    } catch (emailErr) {
      console.error('Email send error (non-blocking):', emailErr.message);
    }

    // Push notification to passenger
    try {
      const { data: rd } = await supabase.from('rides').select('pickup_address, dropoff_address').eq('id', booking.ride_id).maybeSingle();
      notifyUser(supabase, booking.user_id, 'Booking Rejected \u274C', `Your booking request for ${rd?.pickup_address || 'origin'} to ${rd?.dropoff_address || 'destination'} was not accepted`);
    } catch (pushErr) {
      console.error('Push notification error (non-blocking):', pushErr.message);
    }

    return res.status(200).json({ message: 'Booking rejected.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// POST - Generate a share link for a booking (passenger only)
router.post('/:bookingId/share-link', auth, async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const userId = req.user.id;

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError || !booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.user_id !== userId) return res.status(403).json({ message: 'Forbidden: You are not the passenger of this booking.' });

    // Check if share link already exists
    const { data: existing } = await supabase
      .from('ride_share_links')
      .select('token')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({ token: existing.token });
    }

    // Create new share link
    const token = crypto.randomUUID();
    const { error: insertError } = await supabase
      .from('ride_share_links')
      .insert([{ booking_id: bookingId, token }]);

    if (insertError) return res.status(500).json({ message: 'Failed to create share link.' });

    return res.status(201).json({ token });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET - Fetch ride details via share token (public, no auth)
router.get('/share/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const { data: shareLink, error: linkError } = await supabase
      .from('ride_share_links')
      .select('booking_id')
      .eq('token', token)
      .maybeSingle();

    if (linkError || !shareLink) return res.status(404).json({ message: 'Share link not found.' });

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('status, ride_id')
      .eq('id', shareLink.booking_id)
      .maybeSingle();

    if (bookingError || !booking) return res.status(404).json({ message: 'Booking not found.' });

    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('pickup_address, dropoff_address, departure_time, user_id, vehicle_id, users(full_name, face_verified), vehicles(make, model, color, plate_number)')
      .eq('id', booking.ride_id)
      .maybeSingle();

    if (rideError || !ride) return res.status(404).json({ message: 'Ride not found.' });

    return res.status(200).json({
      driverName: ride.users?.full_name || 'Driver',
      driverFaceVerified: Boolean(ride.users?.face_verified),
      vehicleMake: ride.vehicles?.make || '',
      vehicleModel: ride.vehicles?.model || '',
      vehicleColor: ride.vehicles?.color || '',
      vehiclePlate: ride.vehicles?.plate_number || '',
      origin: ride.pickup_address || '',
      destination: ride.dropoff_address || '',
      departureTime: ride.departure_time || '',
      bookingStatus: booking.status || ''
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// PUT - Passenger marks their booking as completed
router.put('/:bookingId/passenger-complete', auth, async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const userId = req.user.id;

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, status')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError || !booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.user_id !== userId) return res.status(403).json({ message: 'Forbidden: You are not the passenger of this booking.' });
    if (booking.status !== 'confirmed') return res.status(400).json({ message: 'Only confirmed bookings can be marked as completed.' });

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ passenger_completed: true })
      .eq('id', bookingId);

    if (updateError) return res.status(500).json({ message: 'Failed to update booking.' });

    // Increment total_rides for the passenger
    const { data: user } = await supabase.from('users').select('total_rides').eq('id', userId).maybeSingle();
    await supabase.from('users').update({ total_rides: (user?.total_rides || 0) + 1 }).eq('id', userId);

    return res.status(200).json({ success: true, message: 'Journey marked as completed' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;

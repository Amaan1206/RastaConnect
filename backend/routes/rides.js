const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const auth = require('../middleware/auth');
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://swxocqjjfyfhwacioanc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eG9jcWpqZnlmaHdhY2lvYW5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwODAyMCwiZXhwIjoyMDg4Mzg0MDIwfQ.RG37CMiXXWd-iauAPYWLOGsn2vPQOmA2neGNdCsvupo'
);

const toLegacyRideStatus = (status) => {
  if (status === 'cancelled') return 'canceled';
  if (status === 'scheduled' || status === 'in_progress') return 'active';
  return status;
};

router.get('/', async (req, res) => {
  const { data: rides, error } = await supabase
    .from('rides')
    .select('id, user_id, vehicle_id, pickup_address, dropoff_address, departure_time, available_seats, price, status')
    .eq('status', 'scheduled')
    .gt('available_seats', 0);

  if (error) {
    console.error('!!! DATABASE ERROR fetching rides:', error.message);
    return res.status(500).json({ message: 'Database error.', error: error.message });
  }

  const driverIds = [...new Set((rides || []).map((ride) => ride.user_id).filter(Boolean))];
  let usersById = {};

  if (driverIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', driverIds);

    if (usersError) {
      console.error('!!! DATABASE ERROR fetching driver names:', usersError.message);
      return res.status(500).json({ message: 'Database error.', error: usersError.message });
    }

    usersById = (users || []).reduce((acc, user) => {
      acc[user.id] = user.full_name;
      return acc;
    }, {});
  }

  const formattedRides = (rides || []).map((ride) => ({
    id: ride.id,
    origin: ride.pickup_address,
    destination: ride.dropoff_address,
    departureTime: ride.departure_time,
    availableSeats: ride.available_seats,
    price: ride.price,
    status: toLegacyRideStatus(ride.status),
    driverName: usersById[ride.user_id] || 'Driver',
    vehicleId: ride.vehicle_id,
  }));

  return res.status(200).json({ rides: formattedRides });
});

router.post('/', auth, async (req, res) => {
  const driverId = req.user.id;
  const { origin, destination, departureTime, availableSeats, price, vehicleId } = req.body;
  if (!vehicleId) { return res.status(400).json({ message: 'Please select a vehicle for the ride.' }); }

  const { data, error } = await supabase
    .from('rides')
    .insert([{
      user_id: driverId,
      vehicle_id: vehicleId,
      pickup_address: origin,
      dropoff_address: destination,
      departure_time: departureTime,
      available_seats: Number(availableSeats),
      price: Number(price),
      status: 'scheduled',
    }])
    .select('id')
    .single();

  if (error) { return res.status(500).json({ message: 'Database error.', error: error.message }); }
  return res.status(201).json({ message: 'Ride offered successfully!', rideId: data.id });
});

router.delete('/:rideId', auth, async (req, res) => {
  const rideId = req.params.rideId;
  const driverId = req.user.id;

  const { data: ride, error: checkError } = await supabase
    .from('rides')
    .select('user_id')
    .eq('id', rideId)
    .maybeSingle();

  if (checkError || !ride || ride.user_id !== driverId) {
    return res.status(403).json({ message: 'Forbidden: You are not the driver of this ride.' });
  }

  const { error: updateRideError } = await supabase
    .from('rides')
    .update({ status: 'cancelled' })
    .eq('id', rideId);

  if (updateRideError) {
    return res.status(500).json({ message: 'Failed to cancel ride.' });
  }

  const { error: updateBookingsError } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('ride_id', rideId);

  if (updateBookingsError) {
    return res.status(500).json({ message: 'Failed to cancel associated bookings.' });
  }

  return res.status(200).json({ message: 'Ride and all associated bookings have been canceled.' });
});

router.post('/:rideId/book', auth, async (req, res) => {
  const rideId = req.params.rideId;
  const passengerId = req.user.id;

  const { data: ride, error: checkRideError } = await supabase
    .from('rides')
    .select('available_seats, user_id, status')
    .eq('id', rideId)
    .maybeSingle();

  if (checkRideError) {
    return res.status(500).json({ message: 'Database error checking ride.' });
  }
  if (!ride || ride.status !== 'scheduled') {
    return res.status(404).json({ message: 'Ride not found or is no longer active.' });
  }
  if (ride.user_id === passengerId) {
    return res.status(400).json({ message: 'You cannot book your own ride.' });
  }
  if (ride.available_seats < 1) {
    return res.status(400).json({ message: 'No seats available on this ride.' });
  }

  const updatedSeats = ride.available_seats - 1;
  const { error: updateRideError } = await supabase
    .from('rides')
    .update({ available_seats: updatedSeats })
    .eq('id', rideId);

  if (updateRideError) {
    return res.status(500).json({ message: 'Failed to update ride seats.' });
  }

  const { data: booking, error: insertBookingError } = await supabase
    .from('bookings')
    .insert([{ ride_id: rideId, user_id: passengerId, seats: 1, status: 'confirmed' }])
    .select('id')
    .single();

  if (insertBookingError) {
    await supabase.from('rides').update({ available_seats: ride.available_seats }).eq('id', rideId);
    return res.status(500).json({ message: 'Failed to create booking.' });
  }

  return res.status(201).json({ message: 'Ride booked successfully!', bookingId: booking.id });
});

module.exports = router;

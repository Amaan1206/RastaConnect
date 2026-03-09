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
    .select('*, users(full_name, phone, age, gender, talkativeness, music_preference, face_verified), vehicles(*), bookings(*)')
    .eq('status', 'scheduled')
    .gt('available_seats', 0);

  if (error) {
    console.error('!!! DATABASE ERROR fetching rides:', error.message);
    return res.status(500).json({ message: 'Database error.', error: error.message });
  }

  const formattedRides = (rides || []).map((ride) => {
    const relatedBookings = Array.isArray(ride.bookings) ? ride.bookings : [];
    const hasActiveBooking = relatedBookings.some(
      (booking) => booking.status === 'confirmed' || booking.status === 'active'
    );

    const driverDetails = hasActiveBooking
      ? {
          full_name: ride.users?.full_name || '',
          phone: ride.users?.phone || '',
          age: ride.users?.age ?? '',
          gender: ride.users?.gender ?? '',
          talkativeness: ride.users?.talkativeness ?? '',
          music_preference: ride.users?.music_preference ?? '',
          face_verified: Boolean(ride.users?.face_verified),
        }
      : null;

    const vehicleDetails = hasActiveBooking
      ? {
          make: ride.vehicles?.make || '',
          model: ride.vehicles?.model || '',
          color: ride.vehicles?.color || '',
          plate_number: ride.vehicles?.plate_number || '',
          capacity: ride.vehicles?.capacity ?? null,
        }
      : null;

    return {
      id: ride.id,
      origin: ride.pickup_address,
      destination: ride.dropoff_address,
      departureTime: ride.departure_time,
      availableSeats: ride.available_seats,
      price: ride.price,
      status: toLegacyRideStatus(ride.status),
      driverName: hasActiveBooking ? (ride.users?.full_name || 'Driver') : 'Driver',
      driverFaceVerified: Boolean(ride.users?.face_verified),
      vehicleId: ride.vehicle_id,
      driver: driverDetails,
      vehicle: vehicleDetails,
    };
  });

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
  const { pickup_location, drop_location, passenger_price } = req.body;

  const { data: ride, error: checkRideError } = await supabase
    .from('rides')
    .select('available_seats, user_id, status, price')
    .eq('id', rideId)
    .maybeSingle();

  if (checkRideError) return res.status(500).json({ message: 'Database error checking ride.' });
  if (!ride || ride.status !== 'scheduled') return res.status(404).json({ message: 'Ride not found or is no longer active.' });
  if (ride.user_id === passengerId) return res.status(400).json({ message: 'You cannot book your own ride.' });
  if (ride.available_seats < 1) return res.status(400).json({ message: 'No seats available on this ride.' });

  const driverPrice = ride.price;
  const offeredPrice = Number(passenger_price);
  const status = offeredPrice === driverPrice ? 'confirmed' : 'pending';

  // Only deduct seat if confirmed immediately
  if (status === 'confirmed') {
    const { error: updateRideError } = await supabase
      .from('rides')
      .update({ available_seats: ride.available_seats - 1 })
      .eq('id', rideId);
    if (updateRideError) return res.status(500).json({ message: 'Failed to update ride seats.' });
  }

  const { data: booking, error: insertBookingError } = await supabase
    .from('bookings')
    .insert([{
      ride_id: rideId,
      user_id: passengerId,
      seats: 1,
      status,
      pickup_location: pickup_location || '',
      drop_location: drop_location || '',
      passenger_price: offeredPrice,
      driver_price: driverPrice
    }])
    .select('id')
    .single();

  if (insertBookingError) {
    if (status === 'confirmed') {
      await supabase.from('rides').update({ available_seats: ride.available_seats }).eq('id', rideId);
    }
    return res.status(500).json({ message: 'Failed to create booking.' });
  }

  return res.status(201).json({
    message: status === 'confirmed' ? 'Ride booked successfully!' : 'Booking request sent! Waiting for driver confirmation.',
    bookingId: booking.id,
    status
  });
});

// PUT - Complete a ride (driver only)
router.put('/:rideId/complete', auth, async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const driverId = req.user.id;

    const { data: ride, error } = await supabase
      .from('rides')
      .select('user_id, status')
      .eq('id', rideId)
      .maybeSingle();

    if (error || !ride) return res.status(404).json({ message: 'Ride not found.' });
    if (ride.user_id !== driverId) return res.status(403).json({ message: 'Forbidden.' });
    if (ride.status === 'completed') return res.status(400).json({ message: 'Ride already completed.' });

    await supabase.from('rides').update({ status: 'completed' }).eq('id', rideId);

    // Update driver total_rides count
    const { data: driverData } = await supabase
      .from('users')
      .select('total_rides')
      .eq('id', driverId)
      .maybeSingle();

    await supabase
      .from('users')
      .update({ total_rides: (driverData?.total_rides || 0) + 1 })
      .eq('id', driverId);

    return res.status(200).json({ message: 'Ride marked as completed.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});
module.exports = router;

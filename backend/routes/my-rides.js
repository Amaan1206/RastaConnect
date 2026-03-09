// RastaConnect/backend/routes/my-rides.js
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

// GET rides offered by the logged-in user
router.get('/offered', auth, async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('rides')
    .select('id, pickup_address, dropoff_address, departure_time, available_seats, price, status, user_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) { return res.status(500).json({ message: 'Database error.', error: error.message }); }

  const rides = (data || []).map((ride) => ({
    id: ride.id,
    origin: ride.pickup_address,
    destination: ride.dropoff_address,
    departureTime: ride.departure_time,
    availableSeats: ride.available_seats,
    price: ride.price,
    status: toLegacyRideStatus(ride.status),
    userId: ride.user_id,
  }));

  return res.status(200).json({ rides });
});

// GET rides booked by the logged-in user
router.get('/booked', auth, async (req, res) => {
  const userId = req.user.id;

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, ride_id, status')
    .eq('user_id', userId)
    .neq('status', 'cancelled');

  if (bookingsError) { return res.status(500).json({ message: 'Database error.', error: bookingsError.message }); }
  if (!bookings || bookings.length === 0) { return res.status(200).json({ rides: [] }); }

  const rideIds = [...new Set(bookings.map((booking) => booking.ride_id).filter(Boolean))];

  const { data: rides, error: ridesError } = await supabase
    .from('rides')
    .select('id, pickup_address, dropoff_address, departure_time, price, user_id, vehicle_id')
    .in('id', rideIds);

  if (ridesError) { return res.status(500).json({ message: 'Database error.', error: ridesError.message }); }

  const ridesById = (rides || []).reduce((acc, ride) => {
    acc[ride.id] = ride;
    return acc;
  }, {});

  const driverIds = [...new Set((rides || []).map((ride) => ride.user_id).filter(Boolean))];
  const vehicleIds = [...new Set((rides || []).map((ride) => ride.vehicle_id).filter(Boolean))];

  let usersById = {};
  if (driverIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', driverIds);

    if (usersError) { return res.status(500).json({ message: 'Database error.', error: usersError.message }); }

    usersById = (users || []).reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
  }

  let vehiclesById = {};
  if (vehicleIds.length > 0) {
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, make, model, color, plate_number')
      .in('id', vehicleIds);

    if (vehiclesError) { return res.status(500).json({ message: 'Database error.', error: vehiclesError.message }); }

    vehiclesById = (vehicles || []).reduce((acc, vehicle) => {
      acc[vehicle.id] = vehicle;
      return acc;
    }, {});
  }

  const formattedBookings = bookings
    .map((booking) => {
      const ride = ridesById[booking.ride_id];
      if (!ride) return null;

      const driver = usersById[ride.user_id];
      const vehicle = vehiclesById[ride.vehicle_id];

      return {
        bookingId: booking.id,
        bookingStatus: booking.status,
        rideId: ride.id,
        origin: ride.pickup_address,
        destination: ride.dropoff_address,
        departureTime: ride.departure_time,
        price: ride.price,
        driverName: driver?.full_name || 'Driver',
        vehicleMake: vehicle?.make || '',
        vehicleModel: vehicle?.model || '',
        vehicleColor: vehicle?.color || '',
        vehicleRegistration: vehicle?.plate_number || '',
        rideStatus: ride.status,
        driverId: ride.user_id,
      };
    })
    .filter(Boolean);

  return res.status(200).json({ rides: formattedBookings });
});

module.exports = router;

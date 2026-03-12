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
    .select('*, rides(status, user_id, pickup_address, dropoff_address, departure_time, price, users(full_name), vehicles(make, model, color, plate_number))')
    .eq('user_id', userId)
    .neq('status', 'cancelled');

  if (bookingsError) { return res.status(500).json({ message: 'Database error.', error: bookingsError.message }); }
  if (!bookings || bookings.length === 0) { return res.status(200).json({ rides: [] }); }

  const formattedBookings = bookings
    .map((booking) => {
      const ride = booking.rides;
      if (!ride) return null;

      return {
        bookingId: booking.id,
        rideId: booking.ride_id,
        bookingStatus: booking.status,
        rideStatus: ride.status,
        passengerCompleted: Boolean(booking.passenger_completed),
        driverId: ride.user_id,
        origin: ride.pickup_address,
        destination: ride.dropoff_address,
        departureTime: ride.departure_time,
        price: booking.passenger_price || ride.price,
        driverName: ride.users?.full_name || 'Driver',
        vehicleMake: ride.vehicles?.make || '',
        vehicleModel: ride.vehicles?.model || '',
        vehicleColor: ride.vehicles?.color || '',
        vehicleRegistration: ride.vehicles?.plate_number || '',
      };
    })
    .filter(Boolean);

  return res.status(200).json({ rides: formattedBookings });
});

module.exports = router;

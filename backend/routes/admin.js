const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://swxocqjjfyfhwacioanc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eG9jcWpqZnlmaHdhY2lvYW5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwODAyMCwiZXhwIjoyMDg4Mzg0MDIwfQ.RG37CMiXXWd-iauAPYWLOGsn2vPQOmA2neGNdCsvupo'
);

router.use(auth, adminAuth);

router.get('/stats', async (_req, res) => {
  const [
    totalUsersResult,
    totalRidesResult,
    totalBookingsResult,
    completedRidesResult,
    bannedUsersResult,
    verifiedUsersResult
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('rides').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('id', { count: 'exact', head: true }),
    supabase.from('rides').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_banned', true),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('face_verified', true)
  ]);

  if (
    totalUsersResult.error ||
    totalRidesResult.error ||
    totalBookingsResult.error ||
    completedRidesResult.error ||
    bannedUsersResult.error ||
    verifiedUsersResult.error
  ) {
    return res.status(500).json({ message: 'Database error fetching stats.' });
  }

  return res.status(200).json({
    totalUsers: Number(totalUsersResult.count || 0),
    totalRides: Number(totalRidesResult.count || 0),
    totalBookings: Number(totalBookingsResult.count || 0),
    completedRides: Number(completedRidesResult.count || 0),
    bannedUsers: Number(bannedUsersResult.count || 0),
    verifiedUsers: Number(verifiedUsersResult.count || 0)
  });
});

router.get('/users', async (req, res) => {
  const search = (req.query.search || '').toString().trim();
  let query = supabase
    .from('users')
    .select('id, full_name, email, phone, role, is_banned, ban_reason, face_verified, phone_verified, average_rating, total_rides, created_at')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ message: 'Database error fetching users.' });
  }

  return res.status(200).json({ users: data || [] });
});

router.get('/users/:userId', async (req, res) => {
  const userId = req.params.userId;

  const [userResult, ridesResult, bookingsResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).maybeSingle(),
    supabase.from('rides').select('*').eq('user_id', userId).order('departure_time', { ascending: false }),
    supabase.from('bookings').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  ]);

  if (userResult.error || ridesResult.error || bookingsResult.error) {
    return res.status(500).json({ message: 'Database error fetching user details.' });
  }

  if (!userResult.data) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.status(200).json({
    user: userResult.data,
    rides: ridesResult.data || [],
    bookings: bookingsResult.data || []
  });
});

router.put('/users/:userId/ban', async (req, res) => {
  const userId = req.params.userId;
  const reason = req.body?.reason || null;

  const { error } = await supabase
    .from('users')
    .update({ is_banned: true, ban_reason: reason })
    .eq('id', userId);

  if (error) {
    return res.status(500).json({ message: 'Database error banning user.' });
  }

  return res.status(200).json({ success: true });
});

router.put('/users/:userId/unban', async (req, res) => {
  const userId = req.params.userId;
  const { error } = await supabase
    .from('users')
    .update({ is_banned: false, ban_reason: null })
    .eq('id', userId);

  if (error) {
    return res.status(500).json({ message: 'Database error unbanning user.' });
  }

  return res.status(200).json({ success: true });
});

router.put('/users/:userId/role', async (req, res) => {
  const userId = req.params.userId;
  const role = req.body?.role;

  if (role !== 'admin' && role !== 'user') {
    return res.status(400).json({ message: 'Invalid role. Use admin or user.' });
  }

  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId);

  if (error) {
    return res.status(500).json({ message: 'Database error updating role.' });
  }

  return res.status(200).json({ success: true });
});

router.get('/rides', async (req, res) => {
  const status = (req.query.status || '').toString().trim();
  let ridesQuery = supabase
    .from('rides')
    .select('id, user_id, vehicle_id, pickup_address, dropoff_address, departure_time, available_seats, status, created_at')
    .order('created_at', { ascending: false });

  if (status) {
    ridesQuery = ridesQuery.eq('status', status);
  }

  const { data: rides, error: ridesError } = await ridesQuery;
  if (ridesError) {
    return res.status(500).json({ message: 'Database error fetching rides.' });
  }

  const rideList = rides || [];
  const driverIds = [...new Set(rideList.map((ride) => ride.user_id).filter(Boolean))];
  const vehicleIds = [...new Set(rideList.map((ride) => ride.vehicle_id).filter(Boolean))];
  const rideIds = rideList.map((ride) => ride.id);

  const [driversResult, vehiclesResult, bookingsResult] = await Promise.all([
    driverIds.length > 0
      ? supabase.from('users').select('id, full_name').in('id', driverIds)
      : Promise.resolve({ data: [], error: null }),
    vehicleIds.length > 0
      ? supabase.from('vehicles').select('id, make, model, plate_number, color').in('id', vehicleIds)
      : Promise.resolve({ data: [], error: null }),
    rideIds.length > 0
      ? supabase.from('bookings').select('id, ride_id').in('ride_id', rideIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (driversResult.error || vehiclesResult.error || bookingsResult.error) {
    return res.status(500).json({ message: 'Database error fetching ride relations.' });
  }

  const driversById = new Map((driversResult.data || []).map((driver) => [driver.id, driver]));
  const vehiclesById = new Map((vehiclesResult.data || []).map((vehicle) => [vehicle.id, vehicle]));
  const bookingCountByRide = new Map();
  for (const booking of bookingsResult.data || []) {
    bookingCountByRide.set(booking.ride_id, (bookingCountByRide.get(booking.ride_id) || 0) + 1);
  }

  const payload = rideList.map((ride) => {
    const vehicle = vehiclesById.get(ride.vehicle_id) || null;
    return {
      id: ride.id,
      origin: ride.pickup_address,
      destination: ride.dropoff_address,
      departure_time: ride.departure_time,
      available_seats: ride.available_seats,
      status: ride.status,
      booking_count: bookingCountByRide.get(ride.id) || 0,
      driver_name: driversById.get(ride.user_id)?.full_name || null,
      vehicle: vehicle
        ? {
            make: vehicle.make,
            model: vehicle.model,
            plate_number: vehicle.plate_number,
            color: vehicle.color
          }
        : null
    };
  });

  return res.status(200).json({ rides: payload });
});

router.delete('/rides/:rideId', async (req, res) => {
  const rideId = req.params.rideId;

  const { error: bookingsError } = await supabase
    .from('bookings')
    .delete()
    .eq('ride_id', rideId);

  if (bookingsError) {
    return res.status(500).json({ message: 'Database error deleting ride bookings.' });
  }

  const { error: rideError } = await supabase
    .from('rides')
    .delete()
    .eq('id', rideId);

  if (rideError) {
    return res.status(500).json({ message: 'Database error deleting ride.' });
  }

  return res.status(200).json({ success: true });
});

router.get('/bookings', async (req, res) => {
  const status = (req.query.status || '').toString().trim();
  let bookingsQuery = supabase
    .from('bookings')
    .select('id, ride_id, user_id, seats, status, created_at, pickup_location, drop_location, passenger_price, driver_price')
    .order('created_at', { ascending: false });

  if (status) {
    bookingsQuery = bookingsQuery.eq('status', status);
  }

  const { data: bookings, error: bookingsError } = await bookingsQuery;
  if (bookingsError) {
    return res.status(500).json({ message: 'Database error fetching bookings.' });
  }

  const bookingList = bookings || [];
  const passengerIds = [...new Set(bookingList.map((booking) => booking.user_id).filter(Boolean))];
  const rideIds = [...new Set(bookingList.map((booking) => booking.ride_id).filter(Boolean))];

  const [passengersResult, ridesResult] = await Promise.all([
    passengerIds.length > 0
      ? supabase.from('users').select('id, full_name, email').in('id', passengerIds)
      : Promise.resolve({ data: [], error: null }),
    rideIds.length > 0
      ? supabase.from('rides').select('id, user_id, pickup_address, dropoff_address, departure_time, status').in('id', rideIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (passengersResult.error || ridesResult.error) {
    return res.status(500).json({ message: 'Database error fetching booking relations.' });
  }

  const ridesById = new Map((ridesResult.data || []).map((ride) => [ride.id, ride]));
  const driverIds = [...new Set((ridesResult.data || []).map((ride) => ride.user_id).filter(Boolean))];
  const driversResult = driverIds.length > 0
    ? await supabase.from('users').select('id, full_name, email').in('id', driverIds)
    : { data: [], error: null };

  if (driversResult.error) {
    return res.status(500).json({ message: 'Database error fetching drivers.' });
  }

  const passengersById = new Map((passengersResult.data || []).map((user) => [user.id, user]));
  const driversById = new Map((driversResult.data || []).map((user) => [user.id, user]));

  const payload = bookingList.map((booking) => {
    const ride = ridesById.get(booking.ride_id) || null;
    const passenger = passengersById.get(booking.user_id) || null;
    const driver = ride ? driversById.get(ride.user_id) || null : null;

    return {
      id: booking.id,
      status: booking.status,
      seats: booking.seats,
      created_at: booking.created_at,
      pickup_location: booking.pickup_location,
      drop_location: booking.drop_location,
      passenger_price: booking.passenger_price,
      driver_price: booking.driver_price,
      passenger_name: passenger?.full_name || null,
      driver_name: driver?.full_name || null,
      ride: ride
        ? {
            id: ride.id,
            origin: ride.pickup_address,
            destination: ride.dropoff_address,
            departure_time: ride.departure_time,
            status: ride.status
          }
        : null
    };
  });

  return res.status(200).json({ bookings: payload });
});

module.exports = router;

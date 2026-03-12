// RastaConnect/backend/routes/vehicles.js
const express = require('express');
const supabase = require('../utils/supabaseClient');
const auth = require('../middleware/auth');
const router = express.Router();

// GET a user's registered vehicles
router.get('/', auth, async (req, res) => {
  const userId = req.user.id;
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('user_id', userId);
  if (error) { return res.status(500).json({ message: 'Database error.' }); }
  const vehicles = (data || []).map((vehicle) => ({
    id: vehicle.id,
    type: vehicle.capacity === 1 ? 'Bike' : 'Car',
    make: vehicle.make,
    model: vehicle.model,
    color: vehicle.color,
    registrationNumber: vehicle.plate_number,
    user_id: vehicle.user_id
  }));
  res.json({ vehicles });
});

// POST - Add a new vehicle
router.post('/', auth, async (req, res) => {
  const { type, make, model, color, registrationNumber } = req.body;
  const userId = req.user.id;
  const normalizedType = type === 'Bike' ? 'Bike' : 'Car';
  const inferredCapacity = normalizedType === 'Bike' ? 1 : 4;
  const { data, error } = await supabase
    .from('vehicles')
    .insert([{
      user_id: userId,
      make,
      model,
      color,
      plate_number: String(registrationNumber || '').toUpperCase(),
      capacity: inferredCapacity,
      is_active: true
    }])
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505' || error.message.includes('UNIQUE constraint failed') || error.message.includes('duplicate key')) {
      return res.status(400).json({ message: 'This registration number is already registered.' });
    }
    return res.status(500).json({ message: 'Database error.' });
  }
  res.status(201).json({ message: 'Vehicle added successfully!', vehicleId: data.id });
});

// DELETE - Remove a vehicle owned by the current user
router.delete('/:id', auth, async (req, res) => {
  const id = req.params.id;
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return res.status(404).json({ message: 'Vehicle not found.' });
  }

  const { data: rideData } = await supabase
    .from('rides')
    .select('id')
    .eq('vehicle_id', id);

  const rideIds = (rideData || []).map(r => r.id);

  if (rideIds.length > 0) {
    await supabase.from('bookings').delete().in('ride_id', rideIds);
  }

  await supabase.from('rides').delete().eq('vehicle_id', id);

  const { error: deleteError } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.log('Delete error:', deleteError);
    return res.status(500).json({ message: 'Database error.' });
  }

  return res.status(200).json({ message: 'Vehicle deleted successfully.' });
});

module.exports = router;

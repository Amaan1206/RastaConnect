const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const auth = require('../middleware/auth');
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://swxocqjjfyfhwacioanc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eG9jcWpqZnlmaHdhY2lvYW5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwODAyMCwiZXhwIjoyMDg4Mzg0MDIwfQ.RG37CMiXXWd-iauAPYWLOGsn2vPQOmA2neGNdCsvupo'
);

router.post('/', auth, async (req, res) => {
  const userId = req.user.id;
  const { origin, destination, travelDate } = req.body;

  const { data, error } = await supabase
    .from('ride_alerts')
    .insert([{
      user_id: userId,
      origin,
      destination,
      travel_date: travelDate
    }])
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ message: 'Database error.', error: error.message });
  }

  return res.status(201).json({ success: true, alert: data });
});

router.get('/', auth, async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('ride_alerts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ message: 'Database error.', error: error.message });
  }

  return res.status(200).json({ alerts: data || [] });
});

router.delete('/:alertId', auth, async (req, res) => {
  const userId = req.user.id;
  const alertId = req.params.alertId;

  const { data: alert, error: findError } = await supabase
    .from('ride_alerts')
    .select('id, user_id, is_active')
    .eq('id', alertId)
    .maybeSingle();

  if (findError) {
    return res.status(500).json({ message: 'Database error.', error: findError.message });
  }

  if (!alert || alert.user_id !== userId) {
    return res.status(403).json({ message: 'Forbidden: Alert not found or not yours.' });
  }

  const { error: updateError } = await supabase
    .from('ride_alerts')
    .update({ is_active: false })
    .eq('id', alertId);

  if (updateError) {
    return res.status(500).json({ message: 'Database error.', error: updateError.message });
  }

  return res.status(200).json({ success: true });
});

module.exports = router;

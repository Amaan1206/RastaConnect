const { createClient } = require('@supabase/supabase-js');
const auth = require('./auth');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://swxocqjjfyfhwacioanc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eG9jcWpqZnlmaHdhY2lvYW5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwODAyMCwiZXhwIjoyMDg4Mzg0MDIwfQ.RG37CMiXXWd-iauAPYWLOGsn2vPQOmA2neGNdCsvupo'
);

module.exports = function(req, res, next) {
  return auth(req, res, async () => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    return next();
  });
};

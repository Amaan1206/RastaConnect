const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://swxocqjjfyfhwacioanc.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eG9jcWpqZnlmaHdhY2lvYW5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwODAyMCwiZXhwIjoyMDg4Mzg0MDIwfQ.RG37CMiXXWd-iauAPYWLOGsn2vPQOmA2neGNdCsvupo';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function(req, res, next) {
  const authHeader = req.header('Authorization') || '';
  const isBearer = authHeader.startsWith('Bearer ');
  const token = isBearer ? authHeader.slice(7).trim() : '';

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = data.user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

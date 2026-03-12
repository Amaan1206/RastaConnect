const supabase = require('../utils/supabaseClient');

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

const auth = require('./auth');
const supabase = require('../utils/supabaseClient');

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

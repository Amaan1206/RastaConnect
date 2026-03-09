const express = require('express');
const userRoutes = require('./routes/users');
const rideRoutes = require('./routes/rides');
const myRidesRoutes = require('./routes/my-rides');
const bookingRoutes = require('./routes/bookings');
const profileRoutes = require('./routes/profile');
const vehicleRoutes = require('./routes/vehicles'); // --- NEW ---
const ratingsRoutes = require('./routes/ratings');
const app = express();
const PORT = 3001;
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
app.use('/api/users', userRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/my-rides', myRidesRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/vehicles', vehicleRoutes); // --- NEW ---
app.use('/api/ratings', ratingsRoutes);
app.listen(PORT, () => { console.log(`Backend server is running on http://localhost:${PORT}`); });

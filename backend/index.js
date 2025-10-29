const express = require('express');
const userRoutes = require('./routes/users');
const rideRoutes = require('./routes/rides');
const myRidesRoutes = require('./routes/my-rides');
const bookingRoutes = require('./routes/bookings');
const profileRoutes = require('./routes/profile');
const vehicleRoutes = require('./routes/vehicles'); // --- NEW ---
const app = express();
const PORT = 3001;
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/my-rides', myRidesRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/vehicles', vehicleRoutes); // --- NEW ---
app.listen(PORT, () => { console.log(`Backend server is running on http://localhost:${PORT}`); });
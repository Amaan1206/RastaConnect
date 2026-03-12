const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const userRoutes = require('./routes/users');
const rideRoutes = require('./routes/rides');
const myRidesRoutes = require('./routes/my-rides');
const bookingRoutes = require('./routes/bookings');
const profileRoutes = require('./routes/profile');
const vehicleRoutes = require('./routes/vehicles'); // --- NEW ---
const ratingsRoutes = require('./routes/ratings');
const adminRoutes = require('./routes/admin');
const alertRoutes = require('./routes/alerts');
const app = express();
const PORT = 3001;

// Security headers
app.use(helmet());

// CORS - only allow frontend origin
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true
}));

// General rate limiter - 100 requests per 15 minutes per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
}));

// Stricter limiter for auth/face routes - 10 requests per 15 minutes
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again later.' }
});
app.use('/api/profile/upload-face', strictLimiter);
app.use('/api/profile/verify-face-match', strictLimiter);
app.use('/api/profile/send-otp', strictLimiter);

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
app.use('/api/admin', adminRoutes);
app.use('/api/alerts', alertRoutes);
app.listen(PORT, () => { console.log(`Backend server is running on http://localhost:${PORT}`); });

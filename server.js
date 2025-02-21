require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Basic middleware
app.use(cors({
    origin: ['http://localhost:4000', 'http://127.0.0.1:4000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.log('Headers:', req.headers);
    if (req.method !== 'GET') {
        console.log('Body:', req.body);
    }
    next();
});

// Import routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const companyAdminRoutes = require('./routes/companyAdmin');
const bookingRoutes = require('./routes/bookings');
const articleRoutes = require('./routes/articles');
const adminRoutes = require('./routes/admin');

// API Routes - MUST come before the 404 handler
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/company-admin', companyAdminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/admin', adminRoutes);

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

// API error handler - MUST come after routes but before 404
app.use('/api', (err, req, res, next) => {
    console.error('API Error:', err);
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON' });
    }
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});

// Handle API 404s - MUST come after all API routes
app.all('/api/*', (req, res) => {
    console.log('API 404:', req.method, req.originalUrl);
    res.status(404).json({ error: 'API endpoint not found' });
});

// Handle all other routes - MUST come last
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('\nAvailable routes:');
    console.log('  - GET    /api/test');
    console.log('  - POST   /api/auth/login');
    console.log('  - POST   /api/company-admin/login');
    console.log('  - POST   /api/events');
    console.log('  - GET    /api/events');
    console.log('  - GET    /api/events/test');
    console.log('  - DELETE /api/events/:id');
    console.log('  - POST   /api/bookings');
    console.log('  - GET    /api/bookings/my-bookings');
    console.log('  - GET    /api/bookings/:id');
    console.log('  - POST   /api/bookings/:id/cancel');
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port.`);
    } else {
        console.error('Server error:', error);
    }
    process.exit(1);
});

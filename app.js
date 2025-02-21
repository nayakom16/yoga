const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 4000; 

// Middleware
app.use(cors({
    origin: true,  // Allow all origins
    credentials: true
}));
// app.use(cors({
//     origin :process.env.FRONTEND_URL.replace(/\/$/, ''),
//     credentials : true
// }))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yogalife', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const articleRoutes = require('./routes/articles');
const eventRoutes = require('./routes/events');
const companyAdminRoutes = require('./routes/company-admin');
const bookingRoutes = require('./routes/bookings');
const feedbackRoutes = require('./routes/article-feedback');
const analyticsRoutes = require('./routes/analytics');
const orderRoutes = require('./routes/orders');
const bookRoutes = require('./routes/books');

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/analytics', require('./routes/analytics'));

app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/company-admin', companyAdminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/books', bookRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve port configuration
app.get('/js/config.js', (req, res) => {
    res.type('application/javascript');
    res.send(`const PORT = ${process.env.PORT || 4000};
const API_URL = 'http://localhost:' + PORT;
window.appConfig = { apiUrl: API_URL };`);
});

// Create uploads directory for articles if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'public', 'uploads', 'articles');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Check if it's an API request
    if (req.path.startsWith('/api/')) {
        return res.status(500).json({ error: 'Internal server error' });
    }
    
    // For non-API requests, send error page
    res.status(500).send('Something broke!');
});

// Serve main pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/company-admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'company-admin', 'dashboard.html'));
});

// Serve shop page
app.get('/shop', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'shop.html'));
});

// Handle all other routes
app.get('*', (req, res) => {
    // If it's a file request, try to serve it from public
    if (req.path.includes('.')) {
        res.sendFile(path.join(__dirname, 'public', req.path));
    } else {
        // For non-file paths like /shop, serve index.html
        res.sendFile(path.join(__dirname, 'public', req.path + '.html'));
    }
});

// const PORT = process.env.PORT || 4000;  
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

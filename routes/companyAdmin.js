const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Article = require('../models/Article');
const Event = require('../models/Event');
const { adminAuth } = require('../middleware/auth');

// Admin Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Admin login attempt:', { email, timestamp: new Date().toISOString() });

        if (!email || !password) {
            console.log('Missing credentials:', { email: !!email, password: !!password });
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find admin user
        const admin = await User.findOne({ email: email.toLowerCase(), role: 'admin' });
        console.log('Admin lookup result:', {
            found: !!admin,
            email: email.toLowerCase(),
            timestamp: new Date().toISOString()
        });

        if (!admin) {
            console.log('Admin not found:', { email: email.toLowerCase() });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Log admin details (except password)
        console.log('Admin details:', {
            id: admin._id,
            email: admin.email,
            role: admin.role,
            isVerified: admin.isVerified,
            verificationStatus: admin.verificationStatus
        });

        // Verify password
        const isMatch = await bcrypt.compare(password, admin.password);
        console.log('Password verification:', {
            email: admin.email,
            match: isMatch,
            timestamp: new Date().toISOString()
        });

        if (!isMatch) {
            console.log('Password mismatch:', { email: admin.email });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
            { userId: admin._id, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('Login successful:', {
            email: admin.email,
            timestamp: new Date().toISOString()
        });

        // Send success response
        res.json({
            token,
            user: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Create initial admin (protected route)
router.post('/create-initial-admin', async (req, res) => {
    try {
        const { adminSecret, email, password, name } = req.body;
        
        // Verify admin secret from environment variable
        if (adminSecret !== process.env.ADMIN_SECRET) {
            console.log('Invalid admin secret');
            return res.status(401).json({ error: 'Invalid admin secret' });
        }

        // Check if admin already exists
        const adminExists = await User.findOne({ role: 'admin' });
        if (adminExists) {
            console.log('Admin already exists');
            return res.status(400).json({ error: 'Admin already exists' });
        }

        // Create admin user
        const admin = new User({
            name,
            email,
            password,
            role: 'admin',
            isVerified: true,
            verificationStatus: 'approved'
        });

        await admin.save();
        console.log('Admin created successfully');
        res.status(201).json({ message: 'Admin created successfully' });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Dashboard Stats
router.get('/dashboard-stats', adminAuth, async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments(),
            pendingVerifications: await User.countDocuments({ verificationStatus: 'pending' }),
            totalArticles: await Article.countDocuments(),
            totalEvents: await Event.countDocuments()
        };
        console.log('Dashboard stats:', stats);
        res.json(stats);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Error fetching dashboard stats' });
    }
});

// Get Pending Author Verifications
router.get('/verify-authors', adminAuth, async (req, res) => {
    try {
        console.log('Fetching pending authors...');
        const pendingAuthors = await User.find({
            verificationStatus: 'pending'
        }).select('-password');
        
        console.log('Found pending authors:', pendingAuthors.length);
        res.json(pendingAuthors);
    } catch (error) {
        console.error('Fetch pending authors error:', error);
        res.status(500).json({ error: 'Error fetching pending authors' });
    }
});

// Update Author Verification Status
router.post('/verify-authors/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        console.log(`Updating user ${id} verification status to ${status}`);

        const user = await User.findById(id);
        if (!user) {
            console.log('User not found:', id);
            return res.status(404).json({ error: 'User not found' });
        }

        user.verificationStatus = status;
        if (status === 'approved') {
            user.role = 'verified_author';
            user.isVerified = true;
        } else if (status === 'rejected') {
            user.role = 'user';
            user.isVerified = false;
        }

        await user.save();
        console.log('User verification updated successfully:', user);
        res.json({ message: 'User verification status updated', user });
    } catch (error) {
        console.error('Update verification status error:', error);
        res.status(500).json({ error: 'Error updating verification status' });
    }
});

// Get All Articles
router.get('/articles', adminAuth, async (req, res) => {
    try {
        const articles = await Article.find()
            .populate('author', 'name email')
            .sort({ createdAt: -1 });
        console.log('Articles:', articles);
        res.json(articles);
    } catch (error) {
        console.error('Fetch articles error:', error);
        res.status(500).json({ error: 'Error fetching articles' });
    }
});

// Update Article Status
router.post('/articles/:id/review', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const article = await Article.findById(id);
        if (!article) {
            console.log('Article not found:', id);
            return res.status(404).json({ error: 'Article not found' });
        }

        article.status = status;
        if (status === 'published') {
            article.publishedDate = new Date();
        }

        await article.save();
        console.log('Article status updated:', article);
        res.json({ message: 'Article status updated', article });
    } catch (error) {
        console.error('Update article status error:', error);
        res.status(500).json({ error: 'Error updating article status' });
    }
});

// Get All Events
router.get('/events', adminAuth, async (req, res) => {
    try {
        const events = await Event.find().sort({ date: -1 });
        console.log('Events:', events);
        res.json(events);
    } catch (error) {
        console.error('Fetch events error:', error);
        res.status(500).json({ error: 'Error fetching events' });
    }
});

// Create New Event
router.post('/events', adminAuth, async (req, res) => {
    try {
        console.log('Creating new event:', req.body);
        const eventData = {
            title: req.body.title,
            description: req.body.description,
            date: new Date(req.body.date),
            location: req.body.location,
            category: req.body.category || 'other'
        };

        const event = new Event(eventData);
        await event.save();
        console.log('Event created successfully:', event._id);
        res.status(201).json(event);
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Error creating event: ' + error.message });
    }
});

// Update Event
router.patch('/events/:id', adminAuth, async (req, res) => {
    try {
        console.log('Updating event:', req.params.id);
        const event = await Event.findByIdAndUpdate(
            req.params.id,
            {
                title: req.body.title,
                description: req.body.description,
                date: new Date(req.body.date),
                location: req.body.location,
                category: req.body.category || 'other'
            },
            { new: true, runValidators: true }
        );

        if (!event) {
            console.log('Event not found:', req.params.id);
            return res.status(404).json({ error: 'Event not found' });
        }

        console.log('Event updated successfully');
        res.json(event);
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ error: 'Error updating event: ' + error.message });
    }
});

// Delete Event
router.delete('/events/:id', adminAuth, async (req, res) => {
    try {
        console.log('Deleting event:', req.params.id);
        const event = await Event.findByIdAndDelete(req.params.id);
        
        if (!event) {
            console.log('Event not found:', req.params.id);
            return res.status(404).json({ error: 'Event not found' });
        }

        console.log('Event deleted successfully');
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ error: 'Error deleting event' });
    }
});

module.exports = router;

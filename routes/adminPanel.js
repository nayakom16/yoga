const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const Article = require('../models/Article');
const Event = require('../models/Event');

// Admin Login - This will be a separate endpoint for admin login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find admin user
        const admin = await User.findOne({ email: email.toLowerCase(), role: 'admin' });
        if (!admin) {
            console.log('Admin not found:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            console.log('Invalid password for admin:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: admin._id, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Send response
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
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Error during login' });
    }
});

// Protected Admin Routes
// Dashboard Statistics
router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments(),
            pendingVerifications: await User.countDocuments({ verificationStatus: 'pending' }),
            pendingArticles: await Article.countDocuments({ status: 'pending' }),
            publishedArticles: await Article.countDocuments({ status: 'published' }),
            upcomingEvents: await Event.countDocuments({ status: 'upcoming' })
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// User Management
router.get('/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Author Verification Management
router.get('/verify-authors', adminAuth, async (req, res) => {
    try {
        const pendingAuthors = await User.find({ verificationStatus: 'pending' });
        res.json(pendingAuthors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/verify-authors/:id', adminAuth, async (req, res) => {
    try {
        const { status } = req.body;
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.verificationStatus = status;
        if (status === 'approved') {
            user.role = 'verified_author';
            user.isVerified = true;
        }
        
        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Article Management
router.get('/articles', adminAuth, async (req, res) => {
    try {
        const articles = await Article.find({})
            .populate('author', 'name email')
            .sort({ createdAt: -1 });
        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/articles/:id/review', adminAuth, async (req, res) => {
    try {
        const { status, feedback } = req.body;
        const article = await Article.findById(req.params.id);
        
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }
        
        article.status = status;
        article.feedback = feedback;
        if (status === 'published') {
            article.publishedDate = Date.now();
        }
        
        await article.save();
        res.json(article);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Event Management
router.post('/events', adminAuth, async (req, res) => {
    try {
        const event = new Event({
            ...req.body,
            createdBy: req.user._id
        });
        await event.save();
        res.status(201).json(event);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

router.get('/events', adminAuth, async (req, res) => {
    try {
        const events = await Event.find({}).sort({ date: 1 });
        res.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

router.delete('/events/:id', adminAuth, async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

module.exports = router;

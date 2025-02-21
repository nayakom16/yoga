const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Article = require('../models/Article');
const Event = require('../models/Event'); // Added Event model
const adminAuth = require('../middleware/adminAuth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads/articles'));
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
});

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user || user.role !== 'admin') {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            adminToken: token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error logging in' });
    }
});

// Get dashboard stats
router.get('/dashboard-stats', adminAuth, async (req, res) => {
    try {
        // Get user counts with detailed logging
        console.log('Getting user counts...');

        const verifiedUsers = await User.countDocuments({ verificationStatus: 'approved' });
        console.log('Verified users:', verifiedUsers);

        const unverifiedUsers = await User.countDocuments({ 
            $or: [
                { verificationStatus: 'none' },
                { verificationStatus: 'rejected' }
            ]
        });
        console.log('Unverified users:', unverifiedUsers);

        const pendingVerifications = await User.countDocuments({ verificationStatus: 'pending' });
        console.log('Pending verifications:', pendingVerifications);

        // Log all users for debugging
        const allUsers = await User.find({}, 'name email verificationStatus');
        console.log('All users:', allUsers);

        // Get article counts
        const totalArticles = await Article.countDocuments();
        const pendingArticles = await Article.countDocuments({ status: 'pending' });
        const publishedArticles = await Article.countDocuments({ status: 'published' });

        // Get event counts
        const totalEvents = await Event.countDocuments();
        const upcomingEvents = await Event.countDocuments({ status: 'upcoming' });
        const ongoingEvents = await Event.countDocuments({ status: 'ongoing' });
        const completedEvents = await Event.countDocuments({ status: 'completed' });

        const stats = {
            users: {
                verified: verifiedUsers,
                unverified: unverifiedUsers,
                pendingVerification: pendingVerifications,
                total: verifiedUsers + unverifiedUsers + pendingVerifications
            },
            articles: {
                total: totalArticles,
                pending: pendingArticles,
                published: publishedArticles
            },
            events: {
                total: totalEvents,
                upcoming: upcomingEvents,
                ongoing: ongoingEvents,
                completed: completedEvents
            }
        };

        console.log('Final stats:', stats);
        res.json(stats);
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ error: 'Error getting dashboard stats' });
    }
});

// Get pending verifications
router.get('/pending-verifications', adminAuth, async (req, res) => {
    try {
        const pendingUsers = await User.find({ 
            verificationStatus: 'pending'
        }).select('name email yogaBackground verificationStatus');

        if (!pendingUsers) {
            return res.status(404).json({ error: 'No pending verifications found' });
        }
        
        res.json(pendingUsers);
    } catch (error) {
        console.error('Error fetching pending verifications:', error);
        res.status(500).json({ error: 'Error fetching pending verifications' });
    }
});

// Get all articles
router.get('/articles', adminAuth, async (req, res) => {
    try {
        const articles = await Article.find()
            .populate('author', 'name email')
            .sort({ createdAt: -1 });
        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create article
router.post('/articles', adminAuth, upload.single('image'), async (req, res) => {
    try {
        const { title, category, content } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Image is required' });
        }

        const imageUrl = `/uploads/articles/${req.file.filename}`;

        const article = new Article({
            title,
            category,
            content,
            imageUrl,
            author: req.user._id,
            status: 'published' // Since admin is creating it, it's published by default
        });

        await article.save();
        res.status(201).json({ message: 'Article created successfully', article });
    } catch (error) {
        console.error('Error creating article:', error);
        res.status(500).json({ error: error.message || 'Error creating article' });
    }
});

// Approve user verification
router.post('/approve-verification/:userId', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.verificationStatus = 'approved';
        user.role = 'verified_author';
        user.isVerified = true;
        await user.save();

        res.json({ message: 'User verification approved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reject user verification
router.post('/reject-verification/:userId', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user document with all necessary fields
        const update = {
            verificationStatus: 'rejected',
            role: 'user',
            isVerified: false,
            $unset: { yogaBackground: "" } // Remove yoga background info
        };

        // Use findByIdAndUpdate to ensure atomic update
        await User.findByIdAndUpdate(user._id, update, { new: true });

        res.json({ message: 'User verification rejected successfully' });
    } catch (error) {
        console.error('Error rejecting user verification:', error);
        res.status(500).json({ error: error.message });
    }
});

// Approve article
router.post('/approve-article/:articleId', adminAuth, async (req, res) => {
    try {
        const article = await Article.findById(req.params.articleId);
        
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        article.status = 'published';
        await article.save();

        res.json({ message: 'Article approved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reject article
router.post('/reject-article/:articleId', adminAuth, async (req, res) => {
    try {
        const article = await Article.findById(req.params.articleId);
        
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        article.status = 'rejected';
        await article.save();

        res.json({ message: 'Article rejected successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete article
router.delete('/articles/:articleId', adminAuth, async (req, res) => {
    try {
        const article = await Article.findById(req.params.articleId);
        
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        // Delete the article using deleteOne
        await Article.deleteOne({ _id: req.params.articleId });

        res.json({ message: 'Article deleted successfully' });
    } catch (error) {
        console.error('Error deleting article:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all events
router.get('/events', adminAuth, async (req, res) => {
    try {
        const events = await Event.find().sort({ createdAt: -1 });
        res.json(events);
    } catch (error) {
        console.error('Error getting events:', error);
        res.status(500).json({ error: 'Error getting events' });
    }
});

// Create event
router.post('/events', adminAuth, async (req, res) => {
    try {
        console.log('Received event data:', req.body);

        // Ensure location data is properly structured
        const location = {
            venue: req.body.venue || (req.body.location && req.body.location.venue),
            address: req.body.address || (req.body.location && req.body.location.address),
            city: req.body.city || (req.body.location && req.body.location.city),
            state: req.body.state || (req.body.location && req.body.location.state),
            zipCode: req.body.zipCode || (req.body.location && req.body.location.zipCode)
        };

        const eventData = {
            title: req.body.title,
            shortDescription: req.body.shortDescription,
            description: req.body.description,
            date: req.body.date,
            time: req.body.time,
            imageUrl: req.body.imageUrl,
            location: location,
            ticketTypes: req.body.ticketTypes,
            status: req.body.status || 'upcoming',
            createdBy: req.user._id
        };

        console.log('Processed event data:', eventData);

        const event = new Event(eventData);
        await event.save();
        
        console.log('Event created successfully:', event);
        res.status(201).json(event);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: error.message || 'Error creating event' });
    }
});

// Delete event
router.delete('/events/:id', adminAuth, async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Error deleting event' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Article = require('../models/Article');
const Event = require('../models/Event');

// Middleware to verify JWT token
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.userId });

        if (!user) {
            throw new Error();
        }

        req.token = token;
        req.user = user;
        next();
    } catch (error) {
        res.status(401).send({ error: 'Please authenticate.' });
    }
};

// Get current user
router.get('/me', auth, async (req, res) => {
    try {
        res.json(req.user);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Update user profile
router.patch('/profile', auth, async (req, res) => {
    const updates = req.body;
    const allowedUpdates = ['name', 'email'];
    
    try {
        allowedUpdates.forEach(update => {
            if (updates[update]) {
                req.user[update] = updates[update];
            }
        });
        
        await req.user.save();
        res.json(req.user);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Submit author verification request
router.post('/verify', auth, async (req, res) => {
    try {
        // Check if user is already verified
        if (req.user.isVerified || req.user.role === 'verified_author') {
            return res.status(400).json({ error: 'User is already verified' });
        }
        if (req.user.verificationStatus === 'pending') {
            return res.status(400).json({ error: 'Verification request is already pending' });
        }

        // Update user with verification request
        req.user.yogaBackground = req.body.yogaBackground;
        req.user.verificationStatus = 'pending';
        
        await req.user.save();
        res.status(201).json({ message: 'Verification request submitted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Admin: Get verification requests
router.get('/verification-requests', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const requests = await User.find({
            verificationStatus: 'pending'
        }).select('name email yogaBackground');

        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Handle verification request
router.post('/verification-requests/:userId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { status } = req.body;
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.verificationStatus !== 'pending') {
            return res.status(400).json({ error: 'No pending verification request' });
        }

        user.verificationStatus = status;

        if (status === 'approved') {
            user.isVerified = true;
            user.role = 'verified_author';
        } else {
            user.isVerified = false;
        }

        await user.save();
        res.json({ message: 'Verification request updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get pending users (admin only)
router.get('/pending', auth, async (req, res) => {
    try {
        const pendingUsers = await User.find({ verificationStatus: 'pending' })
            .select('name email yogaBackground verificationStatus');
        res.json(pendingUsers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pending users' });
    }
});

// Verify user (admin only)
router.post('/verify/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { status } = req.body;
        if (status === 'approved') {
            user.verificationStatus = 'approved';
            user.role = 'verified_author';
            user.isVerified = true;
        } else if (status === 'rejected') {
            user.verificationStatus = 'rejected';
            user.isVerified = false;
        }

        await user.save();
        res.json({ message: 'User verification status updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user verification status' });
    }
});

// Get user stats (admin only)
router.get('/stats', auth, async (req, res) => {
    try {
        // User Stats
        const users = {
            total: await User.countDocuments(),
            verified: await User.countDocuments({ verificationStatus: 'approved' }),
            unverified: await User.countDocuments({ verificationStatus: 'pending' }),
            pendingVerification: await User.countDocuments({ verificationStatus: 'pending' })
        };

        // Article Stats
        const articles = {
            total: await Article.countDocuments(),
            published: await Article.countDocuments({ status: 'published' }),
            pending: await Article.countDocuments({ status: 'pending' })
        };

        // Event Stats
        const events = {
            total: await Event.countDocuments(),
            upcoming: await Event.countDocuments({ status: 'upcoming' }),
            ongoing: await Event.countDocuments({ status: 'ongoing' }),
            completed: await Event.countDocuments({ status: 'completed' })
        };

        res.json({
            users,
            articles,
            events
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;

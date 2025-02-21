const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Event = require('../models/Event');
const User = require('../models/User');

// Test route to verify the router is working
router.get('/test', (req, res) => {
    res.json({ message: 'Events router is working!' });
});

// Middleware to verify JWT token
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.userId });
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        req.token = token;
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Please authenticate.' });
    }
};

// Create a new event
router.post('/', auth, async (req, res) => {
    try {
        console.log('POST /api/events - Request body:', req.body);
        console.log('POST /api/events - User:', req.user);
        
        // Validate required fields
        const requiredFields = ['title', 'description', 'shortDescription', 'date', 'time', 'imageUrl', 'location', 'ticketTypes'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            console.log('Missing fields:', missingFields);
            return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
        }

        // Create event object
        const eventData = {
            ...req.body,
            createdBy: req.user._id
        };

        console.log('Creating event with data:', eventData);

        const event = new Event(eventData);
        await event.save();

        console.log('Event created successfully:', event);
        res.status(201).json(event);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get all events
router.get('/', async (req, res) => {
    try {
        console.log('GET /api/events - Fetching all events');
        const events = await Event.find().sort({ createdAt: -1 });
        console.log('Found events:', events.length);
        res.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get a single event by ID
router.get('/:id', async (req, res) => {
    try {
        console.log(`GET /api/events/${req.params.id} - Fetching event details`);
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            console.log('Event not found');
            return res.status(404).json({ error: 'Event not found' });
        }

        console.log('Found event:', event);
        res.json(event);
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete an event
router.delete('/:id', auth, async (req, res) => {
    try {
        console.log(`DELETE /api/events/${req.params.id} - User:`, {
            id: req.user._id,
            role: req.user.role,
            name: req.user.name
        });
        
        // First check if the user is an admin
        if (req.user.role === 'admin' || req.user.role === 'verified_author') {
            const event = await Event.findByIdAndDelete(req.params.id);
            if (!event) {
                console.log('Event not found');
                return res.status(404).json({ error: 'Event not found' });
            }
            console.log('Event deleted by admin/author successfully:', event);
            return res.json({ message: 'Event deleted successfully' });
        }

        // If not admin/author, check if user owns the event
        const event = await Event.findOne({ _id: req.params.id });
        if (!event) {
            console.log('Event not found');
            return res.status(404).json({ error: 'Event not found' });
        }

        console.log('Event creator:', event.createdBy);
        console.log('User ID:', req.user._id);

        if (event.createdBy.toString() !== req.user._id.toString()) {
            console.log('User not authorized to delete this event');
            return res.status(403).json({ error: 'Not authorized to delete this event' });
        }

        await Event.findByIdAndDelete(req.params.id);
        console.log('Event deleted by owner successfully');
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

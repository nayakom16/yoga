const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Article = require('../models/Article');
const Event = require('../models/Event');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Added bcrypt import

// Admin middleware
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.userId });
    
    if (!user || user.role !== 'admin') {
      throw new Error();
    }
    
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate as admin.' });
  }
};

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

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error during login' });
    }
});

// Get pending author verifications
router.get('/verify-authors', adminAuth, async (req, res) => {
  try {
    const users = await User.find({ verificationStatus: 'pending' });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve/reject author verification
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
    res.status(400).json({ error: error.message });
  }
});

// Get all articles (including pending ones)
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

// Create article (admin only)
router.post('/articles', adminAuth, async (req, res) => {
    try {
        const article = new Article({
            ...req.body,
            author: req.user._id,
            status: 'published',
            publishedDate: Date.now()
        });

        await article.save();
        res.status(201).json(article);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get pending articles
router.get('/articles/pending', adminAuth, async (req, res) => {
    try {
        const articles = await Article.find({ status: 'pending' })
            .populate('author', 'name email')
            .sort({ createdAt: -1 });
        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve/reject article
router.post('/articles/:id', adminAuth, async (req, res) => {
    try {
        const { status } = req.body;
        const article = await Article.findById(req.params.id);
        
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }
        
        article.status = status;
        if (status === 'published') {
            article.publishedDate = Date.now();
        }
        
        await article.save();
        res.json(article);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get all articles
router.get('/articles/all', adminAuth, async (req, res) => {
    try {
        const articles = await Article.find()
            .populate('author', 'name email')
            .sort({ createdAt: -1 });
        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete article
router.delete('/articles/:id', adminAuth, async (req, res) => {
    try {
        const article = await Article.findByIdAndDelete(req.params.id);
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }
        res.json({ message: 'Article deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create event
router.post('/events', adminAuth, async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update event
router.patch('/events/:id', adminAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    Object.assign(event, req.body);
    await event.save();
    res.json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all events
router.get('/events', adminAuth, async (req, res) => {
    try {
        const events = await Event.find();
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard statistics
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const stats = {
      totalUsers: await User.countDocuments(),
      pendingVerifications: await User.countDocuments({ verificationStatus: 'pending' }),
      pendingArticles: await Article.countDocuments({ status: 'pending' }),
      publishedArticles: await Article.countDocuments({ status: 'published' }),
      upcomingEvents: await Event.countDocuments({ status: 'upcoming' }),
      totalBookings: await Event.aggregate([
        { $unwind: '$bookings' },
        { $group: { _id: null, count: { $sum: 1 } } }
      ])
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all pending articles for verification
router.get('/pending-articles', adminAuth, async (req, res) => {
  try {
    const pendingArticles = await Article.find({ status: 'pending' })
      .populate('author', 'name email');
    
    res.json(pendingArticles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify and publish an article
router.patch('/verify-article/:id', adminAuth, async (req, res) => {
  try {
    const { status, verificationComments } = req.body;
    
    if (!['published', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const article = await Article.findByIdAndUpdate(
      req.params.id, 
      {
        status,
        'verificationDetails.verifiedBy': req.user._id,
        'verificationDetails.verificationDate': new Date(),
        'verificationDetails.verificationComments': verificationComments
      }, 
      { new: true }
    );

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's submitted articles
router.get('/user-articles', adminAuth, async (req, res) => {
  try {
    const articles = await Article.find()
      .populate('author', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending author requests
router.get('/author-requests', adminAuth, async (req, res) => {
  try {
    const users = await User.find({
      verificationStatus: 'pending',
      yogaBackground: { $exists: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Review author request
router.post('/review-author/:userId', adminAuth, async (req, res) => {
  try {
    const { approved } = req.body;
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.verificationStatus = approved ? 'approved' : 'rejected';
    if (approved) {
      user.role = 'verified_author';
      user.isVerified = true;
    }

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending articles
router.get('/pending-articles', adminAuth, async (req, res) => {
  try {
    const articles = await Article.find({ status: 'pending' })
      .populate('author', 'name email');
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Review article
router.post('/review-article/:articleId', adminAuth, async (req, res) => {
  try {
    const { approved, comments } = req.body;
    const article = await Article.findById(req.params.articleId);
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    article.status = approved ? 'published' : 'rejected';
    article.verificationDetails = {
      verifiedBy: req.user._id,
      verificationDate: new Date(),
      verificationComments: comments
    };

    await article.save();
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

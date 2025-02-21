const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/articles/');
  },
  filename: function (req, file, cb) {
    cb(null, `article-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: (req, file, cb) => {
    const allowedFileTypes = /jpeg|jpg|png|gif/;
    const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedFileTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb('Error: Only images are allowed!');
    }
  }
});

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

// Middleware to verify admin JWT token
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

// Get user's articles
router.get('/user/articles', auth, async (req, res) => {
    try {
        const articles = await Article.find({ author: req.user._id })
            .sort({ createdAt: -1 })
            .populate('author', 'name email');
        res.json(articles);
    } catch (error) {
        console.error('Error fetching user articles:', error);
        res.status(500).json({ error: 'Failed to fetch articles' });
    }
});

// Delete user's article
router.delete('/user/articles/:id', auth, async (req, res) => {
    try {
        const article = await Article.findOne({ 
            _id: req.params.id,
            author: req.user._id 
        });

        if (!article) {
            return res.status(404).json({ error: 'Article not found or unauthorized' });
        }

        await Article.findByIdAndDelete(req.params.id);
        res.json({ message: 'Article deleted successfully' });
    } catch (error) {
        console.error('Error deleting article:', error);
        res.status(500).json({ error: 'Failed to delete article' });
    }
});

// Get admin's article list
router.get('/admin/list', adminAuth, async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        
        const articles = await Article.find(query)
            .populate('author', 'name email')
            .sort({ createdAt: -1 });
        
        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all published articles
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        const query = { status: 'published' };
        
        if (category) {
            query.category = category;
        }

        const articles = await Article.find(query)
            .populate('author', 'name')
            .sort({ createdAt: -1 });
            
        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single article by ID
router.get('/:id', async (req, res) => {
    try {
        const article = await Article.findOne({
            _id: req.params.id,
            status: 'published'
        }).populate('author', 'name');

        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        res.json(article);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get like status and count
router.get('/:id/likes', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Get total likes
    const totalLikes = article.likes ? article.likes.length : 0;

    // Check if user has liked (if authenticated)
    let hasLiked = false;
    if (req.header('Authorization')) {
      try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        hasLiked = article.likes && article.likes.some(id => id.toString() === userId);
      } catch (error) {
        // Token invalid, but we'll still return like count
        console.error('Invalid token:', error);
      }
    }

    res.json({ totalLikes, hasLiked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const userId = req.user._id;
    const likeIndex = article.likes ? article.likes.findIndex(id => id.toString() === userId.toString()) : -1;

    if (likeIndex === -1) {
      // Add like
      if (!article.likes) article.likes = [];
      article.likes.push(userId);
    } else {
      // Remove like
      article.likes.splice(likeIndex, 1);
    }

    await article.save();

    res.json({
      hasLiked: likeIndex === -1,
      totalLikes: article.likes.length
    });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new article
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, category, content } = req.body;
    const imageUrl = req.file ? `/uploads/articles/${req.file.filename}` : null;

    // Check if user is verified author or admin
    if (req.user.role !== 'verified_author' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only verified authors can submit articles' });
    }

    const article = new Article({
      title,
      category,
      content,
      imageUrl,
      author: req.user._id,
      authorType: req.user.role === 'admin' ? 'admin' : 'user',
      status: req.user.role === 'admin' ? 'published' : 'pending'
    });

    await article.save();
    res.status(201).json(article);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin approve article
router.post('/admin/approve/:id', adminAuth, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    article.status = 'published';
    article.verificationDetails = {
      verifiedBy: req.user._id,
      verificationDate: new Date(),
      verificationComments: req.body.comments || 'Article approved'
    };

    await article.save();
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin reject article
router.post('/admin/reject/:id', adminAuth, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    article.status = 'rejected';
    article.verificationDetails = {
      verifiedBy: req.user._id,
      verificationDate: new Date(),
      verificationComments: req.body.reason || 'Article rejected'
    };

    await article.save();
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update article
router.patch('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const article = await Article.findOne({
      _id: req.params.id,
      author: req.user._id
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Only allow updates if article is draft or rejected
    if (article.status !== 'draft' && article.status !== 'rejected') {
      return res.status(400).json({ error: 'Cannot edit published or pending articles' });
    }

    const updates = req.body;
    if (req.file) {
      updates.imageUrl = `/uploads/articles/${req.file.filename}`;
    }

    Object.keys(updates).forEach(update => {
      article[update] = updates[update];
    });

    article.status = 'pending';
    await article.save();
    res.json(article);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update article status (admin only)
router.patch('/:id/status', adminAuth, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const { status } = req.body;
    article.status = status;
    await article.save();

    // Send email notification to author
    const author = await User.findById(article.author);
    if (author && author.email) {
      const emailSubject = `Article Status Update: ${article.title}`;
      let emailText = '';

      if (status === 'approved') {
        emailText = `Congratulations! Your article "${article.title}" has been approved and is now published.`;
      } else if (status === 'rejected') {
        emailText = `We regret to inform you that your article "${article.title}" was not approved. Please review our content guidelines and consider submitting a new article.`;
      }

      if (emailText) {
        try {
          await sendEmail(author.email, emailSubject, emailText);
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
        }
      }
    }

    res.json({ message: 'Article status updated successfully' });
  } catch (error) {
    console.error('Error updating article status:', error);
    res.status(500).json({ error: 'Failed to update article status' });
  }
});

// Delete article
router.delete('/:id', auth, async (req, res) => {
  try {
    const article = await Article.findOne({
      _id: req.params.id,
      author: req.user._id
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found or unauthorized' });
    }

    await Article.findByIdAndDelete(req.params.id);
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

module.exports = router;

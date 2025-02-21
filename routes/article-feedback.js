const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Article = mongoose.model('Article');

// Route to handle article likes
router.post('/like/:id', async (req, res) => {
    try {
        const articleId = req.params.id;
        const article = await Article.findById(articleId);
        
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        // Increment likes
        article.likes = (article.likes || 0) + 1;
        await article.save();

        res.json({ success: true, likes: article.likes });
    } catch (error) {
        console.error('Error liking article:', error);
        res.status(500).json({ error: 'Failed to like article' });
    }
});

// Route to handle article views
router.post('/view/:id', async (req, res) => {
    try {
        const articleId = req.params.id;
        const article = await Article.findById(articleId);
        
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        // Increment views
        article.views = (article.views || 0) + 1;
        await article.save();

        res.json({ success: true, views: article.views });
    } catch (error) {
        console.error('Error updating views:', error);
        res.status(500).json({ error: 'Failed to update views' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Route to generate analytics for an article
router.post('/articles/analytics/:id', async (req, res) => {
    try {
        const articleId = req.params.id;
        console.log('Generating analytics for article:', articleId);
        
        // Create stats directory if it doesn't exist
        const statsDir = path.join(__dirname, '..', 'public', 'stats');
        fs.mkdirSync(statsDir, { recursive: true });
        
        // Run Python script
        const pythonProcess = spawn('python', [
            path.join(__dirname, '..', 'analytics', 'generate_graphs.py'),
            articleId
        ]);

        let errorOutput = '';
        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error('Python Error:', data.toString());
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('Python process failed:', errorOutput);
                return res.status(500).json({ error: 'Failed to generate analytics' });
            }
            res.json({ success: true });
        });

        pythonProcess.on('error', (err) => {
            console.error('Failed to start Python process:', err);
            res.status(500).json({ error: 'Failed to start analytics process' });
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to generate analytics' });
    }
});

module.exports = router;

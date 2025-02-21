const mongoose = require('mongoose');

const articleFeedbackSchema = new mongoose.Schema({
    articleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    liked: {
        type: Boolean,
        default: false
    },
    viewed: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Ensure one feedback per user per article
articleFeedbackSchema.index({ articleId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ArticleFeedback', articleFeedbackSchema);

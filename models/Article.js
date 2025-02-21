const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['yogabhyas', 'yogicdiet', 'yogicscripture', 'satkarma', 'meditation'],
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorType: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'published', 'rejected'],
    default: 'pending'
  },
  verificationDetails: {
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verificationDate: {
      type: Date
    },
    verificationComments: {
      type: String
    }
  },
  sharingDetails: {
    sharedAt: {
      type: Date,
      default: Date.now
    },
    socialMediaLinks: [{
      platform: {
        type: String,
        enum: ['facebook', 'twitter', 'linkedin', 'instagram']
      },
      link: {
        type: String
      }
    }]
  },
  tags: [{
    type: String
  }],
  publishedDate: {
    type: Date,
    default: Date.now
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

articleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.status === 'published' && !this.publishedDate) {
    this.publishedDate = Date.now();
  }
  next();
});

module.exports = mongoose.model('Article', articleSchema);

const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    imageUrl: {
        type: String,
        default: 'https://via.placeholder.com/300x400'
    },
    author: {
        type: String,
        default: 'YogaLife Publications'
    },
    pages: {
        type: Number,
        default: 200
    },
    language: {
        type: String,
        default: 'English'
    }
});

module.exports = mongoose.model('Book', bookSchema);

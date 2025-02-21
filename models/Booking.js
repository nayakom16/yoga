const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tickets: [{
        ticketType: {
            name: String,
            price: Number
        },
        quantity: Number
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    bookingDetails: {
        name: String,
        email: String,
        phone: String,
        address: String,
        city: String,
        state: String
    },
    paymentDetails: {
        method: {
            type: String,
            enum: ['card', 'upi', 'netbanking', 'direct'],
            default: 'direct'
        },
        transactionId: String,
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed'],
            default: 'pending'
        },
        amount: Number,
        cardDetails: {
            cardNumber: String,
            expiryDate: String,
            cvv: String
        },
        upiDetails: {
            upiId: String
        },
        netbankingDetails: {
            bank: String
        }
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp before saving
bookingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Booking', bookingSchema);

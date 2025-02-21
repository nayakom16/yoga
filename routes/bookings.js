const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');
const sendEmail = require('../config/email');
const nodemailer = require('nodemailer');
const { auth, adminAuth } = require('../middleware/auth');

// Configure nodemailer
let transporter = null;
try {
    console.log('Configuring email transport with:', {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS ? '****' : 'not set'
    });
    
    transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        },
        debug: true,
        logger: true
    });

    // Verify the connection
    transporter.verify(function(error, success) {
        if (error) {
            console.error('Email verification failed:', error);
        } else {
            console.log('Email server is ready to send messages');
        }
    });
} catch (error) {
    console.error('Failed to configure email transport:', error);
}

// Create a new booking
router.post('/', auth, async (req, res) => {
    try {
        console.log('Creating new booking:', req.body);
        const { event: eventId, tickets, bookingDetails, paymentMethod, paymentDetails } = req.body;

        // Verify booking email matches user email
        if (bookingDetails.email !== req.user.email) {
            return res.status(400).json({ 
                error: 'Booking email must match your account email' 
            });
        }

        // Fetch event
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Validate ticket availability
        for (const ticketRequest of tickets) {
            const eventTicket = event.ticketTypes.find(t => t.name === ticketRequest.ticketType.name);
            if (!eventTicket) {
                return res.status(400).json({ error: `Invalid ticket type: ${ticketRequest.ticketType.name}` });
            }
            if (eventTicket.availableQuantity < ticketRequest.quantity) {
                return res.status(400).json({ 
                    error: `Not enough tickets available for ${ticketRequest.ticketType.name}` 
                });
            }
        }

        // Calculate total amount
        const totalAmount = tickets.reduce((sum, ticket) => {
            return sum + (ticket.ticketType.price * ticket.quantity);
        }, 0);

        // Generate payment ID (simulating payment processing)
        const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create booking with payment details
        const booking = new Booking({
            event: eventId,
            user: req.user._id,
            tickets,
            totalAmount,
            bookingDetails,
            paymentDetails: {
                method: paymentMethod || 'direct',
                transactionId: paymentId,
                status: 'completed',
                amount: totalAmount,
                ...paymentDetails
            },
            status: 'confirmed'
        });

        await booking.save();

        // Update ticket availability
        for (const ticketRequest of tickets) {
            const eventTicket = event.ticketTypes.find(t => t.name === ticketRequest.ticketType.name);
            eventTicket.availableQuantity -= ticketRequest.quantity;
        }
        await event.save();

        // Send confirmation email
        if (transporter) {
            try {
                const emailHtml = `
                    <h2>Booking Confirmation</h2>
                    <p>Dear ${bookingDetails.name},</p>
                    <p>Your booking for ${event.title} has been confirmed!</p>
                    <h3>Booking Details:</h3>
                    <ul>
                        <li>Event: ${event.title}</li>
                        <li>Date: ${new Date(event.date).toLocaleDateString()}</li>
                        <li>Time: ${event.time}</li>
                        <li>Venue: ${event.location.venue}</li>
                    </ul>
                    <h3>Tickets:</h3>
                    <ul>
                        ${tickets.map(ticket => `
                            <li>${ticket.ticketType.name} x ${ticket.quantity} 
                                ($${ticket.ticketType.price} each)</li>
                        `).join('')}
                    </ul>
                    <p><strong>Total Amount:</strong> $${totalAmount}</p>
                    <p><strong>Payment Method:</strong> ${paymentMethod}</p>
                    <p><strong>Transaction ID:</strong> ${paymentId}</p>
                    <p>Thank you for booking with us!</p>
                `;

                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: bookingDetails.email,
                    subject: `Booking Confirmation - ${event.title}`,
                    html: emailHtml
                });

                console.log('Confirmation email sent');
            } catch (error) {
                console.error('Error sending confirmation email:', error);
                // Don't fail the booking if email fails
            }
        }

        res.status(201).json({ 
            message: 'Booking successful',
            booking,
            paymentId 
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get user's bookings
router.get('/my-bookings', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user._id })
            .populate('event')
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Get user's bookings (MUST be before /:id route)
router.get('/user', auth, async (req, res) => {
    try {
        console.log('Fetching bookings for user:', req.user._id);
        
        const bookings = await Booking.find({ user: req.user._id })
            .populate({
                path: 'event',
                select: 'title'
            })
            .sort({ createdAt: -1 });

        console.log('Found bookings:', bookings.length);

        // Format the response to include all necessary details
        const formattedBookings = bookings.map(booking => {
            console.log('Processing booking:', booking._id);
            
            // Ensure booking has all required properties
            const safeBooking = {
                event: booking.event || { title: 'Event Deleted' },
                bookingDetails: booking.bookingDetails || {
                    name: 'N/A',
                    email: 'N/A',
                    phone: 'N/A',
                    address: 'N/A',
                    city: 'N/A'
                },
                tickets: (booking.tickets || []).map(ticket => ({
                    ticketType: {
                        name: ticket.ticketType?.name || 'Unknown Ticket',
                        price: ticket.ticketType?.price || 0
                    },
                    quantity: ticket.quantity || 0
                })),
                totalAmount: booking.totalAmount || 0,
                paymentDetails: {
                    status: booking.paymentDetails?.status || 'pending'
                },
                createdAt: booking.createdAt
            };

            return safeBooking;
        });

        console.log('Sending formatted bookings');
        res.json(formattedBookings);
    } catch (error) {
        console.error('Error in /bookings/user route:', error);
        res.status(500).json({ 
            error: 'Failed to fetch bookings', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Get single booking
router.get('/:id', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('event')
            .populate('user', 'name email');

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Check if user is authorized to view this booking
        if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to view this booking' });
        }

        res.json(booking);
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ error: 'Error fetching booking' });
    }
});

// Cancel booking
router.post('/:id/cancel', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('event');

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Check if user is authorized to cancel this booking
        if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to cancel this booking' });
        }

        // Check if booking can be cancelled (e.g., not too close to event date)
        const event = booking.event;
        const eventDate = new Date(event.date);
        const now = new Date();
        const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

        if (hoursUntilEvent < 24) {
            return res.status(400).json({ 
                error: 'Bookings cannot be cancelled within 24 hours of the event' 
            });
        }

        // Update booking status
        booking.status = 'cancelled';
        await booking.save();

        // Restore ticket availability
        for (const ticketRequest of booking.tickets) {
            const eventTicket = event.ticketTypes.find(t => t.name === ticketRequest.ticketType.name);
            eventTicket.availableQuantity += ticketRequest.quantity;
        }
        await event.save();

        // Try to send cancellation email
        try {
            await sendEmail({
                to: booking.bookingDetails.email,
                subject: `Booking Cancelled - ${event.title}`,
                html: `
                    <h1>Booking Cancellation Confirmation</h1>
                    <p>Your booking for ${event.title} has been cancelled.</p>
                    
                    <h2>Booking Details</h2>
                    <p>Booking ID: ${booking._id}</p>
                    <p>Event: ${event.title}</p>
                    <p>Date: ${new Date(event.date).toLocaleDateString()}</p>
                    
                    <p>Your refund will be processed within 5-7 business days.</p>
                    
                    <p>If you have any questions, please contact us.</p>
                `
            });
            console.log('Cancellation email sent successfully');
        } catch (error) {
            console.error('Failed to send cancellation email:', error);
            // Don't fail the cancellation if email fails
        }

        res.json({ 
            message: 'Booking cancelled successfully',
            booking: {
                id: booking._id,
                status: booking.status
            }
        });

    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ error: 'Error cancelling booking' });
    }
});

// Get all bookings (admin only)
router.get('/', adminAuth, async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate({
                path: 'event',
                select: 'title'
            })
            .populate({
                path: 'user',
                select: 'name email'
            })
            .sort({ createdAt: -1 });

        // Format the response to include all necessary details with null checks
        const formattedBookings = bookings.map(booking => ({
            event: {
                title: booking.event ? booking.event.title : 'Event Deleted'
            },
            user: {
                name: booking.user ? booking.user.name : 'User Deleted',
                email: booking.user ? booking.user.email : 'N/A'
            },
            bookingDetails: booking.bookingDetails || {
                phone: 'N/A',
                address: 'N/A',
                city: 'N/A'
            },
            tickets: booking.tickets || [],
            totalAmount: booking.totalAmount || 0,
            paymentDetails: booking.paymentDetails || {
                status: 'unknown'
            },
            createdAt: booking.createdAt,
            status: booking.status || 'unknown'
        }));

        res.json(formattedBookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

module.exports = router;

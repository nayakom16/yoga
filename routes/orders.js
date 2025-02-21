const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const { auth, adminAuth } = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'invoices');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Test email configuration
transporter.verify(function (error, success) {
    if (error) {
        console.error('Email configuration error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

// Generate invoice PDF
async function generateInvoice(order, user) {
    return new Promise((resolve, reject) => {
        try {
            const invoicePath = path.join(uploadsDir, `invoice-${order.orderId}.pdf`);
            const doc = new PDFDocument({ margin: 50 });

            // Pipe PDF to file
            doc.pipe(fs.createWriteStream(invoicePath));

            // Add letterhead
            doc.fontSize(20)
               .text('YogaLife Book Store', { align: 'center' })
               .moveDown();

            // Add invoice header
            doc.fontSize(16)
               .text('INVOICE', { align: 'center' })
               .moveDown();

            // Add order details
            doc.fontSize(12)
               .text(`Order ID: ${order.orderId}`)
               .text(`Date: ${new Date().toLocaleDateString()}`)
               .text(`Customer: ${user.name}`)
               .text(`Email: ${user.email}`)
               .moveDown();

            // Add shipping address
            doc.text('Shipping Address:')
               .text(`${order.address}`)
               .text(`${order.city}, ${order.postalCode}`)
               .text(`Phone: ${order.phone}`)
               .moveDown();

            // Add book details
            doc.text('Order Details:')
               .text(`Book: ${order.bookName}`)
               .text(`Price: $${order.price}`)
               .moveDown();

            // Add payment details
            doc.text('Payment Details:')
               .text(`Method: ${order.paymentMethod.toUpperCase()}`)
               .text(order.paymentMethod === 'card' 
                    ? `Card ending in: ${order.paymentDetails.cardNumber}`
                    : `UPI ID: ${order.paymentDetails.upiId}`)
               .moveDown();

            // Add total
            doc.fontSize(14)
               .text(`Total Amount: $${order.price}`, { align: 'right' })
               .moveDown();

            // Add footer
            doc.fontSize(10)
               .text('Thank you for shopping with YogaLife Book Store!', { align: 'center' })
               .text('For any queries, please contact our support team.', { align: 'center' });

            // Finalize PDF
            doc.end();

            // Resolve when PDF is created
            doc.on('end', () => {
                resolve(invoicePath);
            });

        } catch (error) {
            reject(error);
        }
    });
}

// Place new order
router.post('/', auth, async function(req, res) {
    try {
        console.log('Request body:', req.body);
        console.log('User ID:', req.user._id);

        const { 
            id, // book id
            name, // book name
            price,
            address,
            city,
            postalCode,
            phone,
            paymentMethod,
            cardNumber,
            expiryDate,
            cvv,
            upiId
        } = req.body;

        // Validate required fields
        if (!id || !name || !price || !address || !city || !postalCode || !phone || !paymentMethod) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                received: { id, name, price, address, city, postalCode, phone, paymentMethod }
            });
        }

        // Validate payment details
        if (paymentMethod === 'card' && (!cardNumber || !expiryDate || !cvv)) {
            return res.status(400).json({ error: 'Missing card payment details' });
        }
        if (paymentMethod === 'upi' && !upiId) {
            return res.status(400).json({ error: 'Missing UPI ID' });
        }

        // Get user details first
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Generate order ID
        const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();

        // Create order object
        const orderData = {
            userId: req.user._id,
            bookId: id, // Store as string, will be converted to ObjectId by Mongoose
            bookName: name,
            price: Number(price),
            address,
            city,
            postalCode,
            phone,
            paymentMethod,
            paymentDetails: paymentMethod === 'card' 
                ? { cardNumber: cardNumber.slice(-4), expiryDate }
                : { upiId },
            orderId,
            status: 'confirmed'
        };

        console.log('Creating order with data:', orderData);

        // Create and save order
        const order = new Order(orderData);
        await order.save();

        console.log('Order saved successfully:', order._id);

        // Generate invoice
        let invoicePath;
        try {
            invoicePath = await generateInvoice(order, user);
        } catch (invoiceError) {
            console.error('Failed to generate invoice:', invoiceError);
            // Continue without invoice if generation fails
        }

        // Send email with invoice
        try {
            const mailOptions = {
                from: {
                    name: 'YogaLife Book Store',
                    address: process.env.EMAIL_USER
                },
                to: user.email,
                subject: 'Order Confirmation - YogaLife Book Store',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333; text-align: center;">Order Confirmation</h2>
                        <p>Dear ${user.name},</p>
                        <p>Thank you for your order! We're excited to confirm that your order has been successfully placed.</p>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #333; margin-top: 0;">Order Details:</h3>
                            <ul style="list-style: none; padding: 0;">
                                <li><strong>Order ID:</strong> ${orderId}</li>
                                <li><strong>Book:</strong> ${name}</li>
                                <li><strong>Price:</strong> $${price}</li>
                                <li><strong>Delivery Address:</strong> ${address}, ${city}, ${postalCode}</li>
                                <li><strong>Contact:</strong> ${phone}</li>
                                <li><strong>Payment Method:</strong> ${paymentMethod === 'card' 
                                    ? `Credit/Debit Card (ending in ${cardNumber.slice(-4)})` 
                                    : `UPI (${upiId})`}</li>
                            </ul>
                        </div>

                        <p>Your order will be delivered within 5-7 business days.</p>
                        <p>If you have any questions about your order, please don't hesitate to contact our customer support team.</p>
                        
                        <div style="text-align: center; margin-top: 30px; color: #666;">
                            <p>Thank you for shopping with YogaLife Book Store!</p>
                        </div>
                    </div>
                `,
                attachments: invoicePath ? [{
                    filename: `invoice-${orderId}.pdf`,
                    path: invoicePath
                }] : []
            };

            await transporter.sendMail(mailOptions);
            console.log('Confirmation email sent to:', user.email);
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
            // Don't throw error, continue with order success
        }

        // Send success response
        res.status(200).json({ 
            message: 'Order placed successfully',
            orderId,
            invoiceUrl: invoicePath ? `/uploads/invoices/invoice-${orderId}.pdf` : null
        });

    } catch (error) {
        console.error('Order error:', error);
        res.status(500).json({ 
            error: 'Failed to place order',
            details: error.message,
            stack: error.stack
        });
    }
});

// Get all orders (admin only)
router.get('/admin', adminAuth, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId', 'name email')
            .sort('-orderDate');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get order by ID (admin only)
router.get('/:id', adminAuth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId', 'name email');
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

module.exports = router;

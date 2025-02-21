const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateInvoice(order, user, filePath) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            
            // Pipe PDF to file
            doc.pipe(fs.createWriteStream(filePath));

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
               .text(`Date: ${new Date(order.orderDate).toLocaleDateString()}`)
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
                resolve(filePath);
            });

        } catch (error) {
            reject(error);
        }
    });
}

module.exports = generateInvoice;

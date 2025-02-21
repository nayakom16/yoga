const nodemailer = require('nodemailer');

// Create reusable transporter
let transporter = null;

const initializeTransporter = () => {
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

        return transporter;
    } catch (error) {
        console.error('Failed to configure email transport:', error);
        return null;
    }
};

// Initialize transporter on module load
transporter = initializeTransporter();

const sendEmail = async (options) => {
    if (!transporter) {
        console.log('Attempting to reinitialize email transporter...');
        transporter = initializeTransporter();
        if (!transporter) {
            throw new Error('Email transport not configured');
        }
    }

    try {
        console.log('Preparing to send email to:', options.to);
        
        const mailOptions = {
            from: {
                name: 'Bodhhiytes',
                address: process.env.EMAIL_USER
            },
            to: options.to,
            subject: options.subject,
            html: options.html
        };

        console.log('Sending email with options:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject
        });

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info);
        return info;
    } catch (error) {
        console.error('Failed to send email:', error);
        throw error;
    }
};

module.exports = sendEmail;

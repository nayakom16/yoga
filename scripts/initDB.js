require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function createHash(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

async function initializeDB() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Drop existing users collection
        await mongoose.connection.collection('users').drop().catch(err => {
            if (err.code !== 26) { // 26 is collection doesn't exist
                throw err;
            }
        });
        console.log('Cleared existing users');

        // Test password hashing
        const adminPassword = process.env.ADMIN_PASSWORD;
        const hashedPassword = await createHash(adminPassword);
        
        // Verify hash works
        const testMatch = await bcrypt.compare(adminPassword, hashedPassword);
        console.log('Password hash test:', testMatch ? 'PASSED' : 'FAILED');
        
        const adminUser = new User({
            name: 'Admin User',
            email: process.env.ADMIN_EMAIL,
            password: hashedPassword,
            role: 'admin',
            isVerified: true,
            verificationStatus: 'approved'
        });

        const savedAdmin = await adminUser.save();
        console.log('Admin created:', {
            email: savedAdmin.email,
            role: savedAdmin.role,
            id: savedAdmin._id
        });

        console.log('\nIMPORTANT: Use these credentials to login:');
        console.log('Admin Login:');
        console.log(`  Email:    ${process.env.ADMIN_EMAIL}`);
        console.log(`  Password: ${process.env.ADMIN_PASSWORD}`);

        // Create a test user
        const testUser = new User({
            name: 'Om Nayak',
            email: 'om@example.com',
            password: await createHash('test123'),
            role: 'user',
            isVerified: false,
            verificationStatus: 'pending',
            yogaBackground: {
                experience: '5 years teaching experience',
                certifications: ['RYT 200', 'Ashtanga Level 1'],
                teachingExperience: 'Studio and private classes',
                specializations: ['Hatha', 'Vinyasa']
            }
        });

        await testUser.save();
        console.log('Test user created with email: om@example.com and password: test123');

        console.log('\nTest User Login:');
        console.log('  Email:    om@example.com');
        console.log('  Password: test123');

    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        await mongoose.connection.close();
    }
}

initializeDB();

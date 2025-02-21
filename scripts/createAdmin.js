require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function createAdminUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Admin credentials
        const adminData = {
            name: 'Admin User',
            email: 'admin@admin.com',
            password: 'admin123',
            role: 'admin',
            isVerified: true,
            verificationStatus: 'approved'
        };

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('Admin user already exists. Updating password...');
            existingAdmin.password = adminData.password;
            await existingAdmin.save();
            console.log('Admin password updated successfully');
        } else {
            // Create new admin user
            const admin = new User(adminData);
            await admin.save();
            console.log('New admin user created successfully');
        }

        console.log('\nAdmin Login Credentials:');
        console.log('------------------------');
        console.log('Email:   ', adminData.email);
        console.log('Password:', adminData.password);
        console.log('------------------------');

    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

createAdminUser();

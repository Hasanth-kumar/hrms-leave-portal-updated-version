const mongoose = require('mongoose');

// MongoDB connection configuration
const connectDB = async () => {
    try {
        // Use environment variable or MongoDB Atlas connection
        const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://hasanthkumarmajji:hasanth%40123@cluster0.dw8tnkx.mongodb.net/hrms_leave_db?retryWrites=true&w=majority&appName=Cluster0';
        
        await mongoose.connect(mongoUri);

        console.log('MongoDB connected successfully');
        console.log(`Database: ${mongoose.connection.name}`);
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB; 
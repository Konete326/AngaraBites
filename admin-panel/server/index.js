const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

// Fallback for packaged app without .env
if (!process.env.MONGO_URI) {
    process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/angara';
}

// Global crash prevention
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

mongoose.set('bufferCommands', false); // Disable buffering so queries fail fast instead of crashing the server

const app = express();

const corsOptions = {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('/{*path}', cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/uploads', (req, res) => {
    res.status(404).json({ error: 'Image not found' });
});

// Middleware to ensure DB connection (critical for serverless environments)
app.use(async (req, res, next) => {
    if (mongoose.connection.readyState === 1) {
        return next();
    }
    try {
        if (mongoose.connection.readyState === 2) {
            await new Promise((resolve, reject) => {
                mongoose.connection.once('open', resolve);
                mongoose.connection.once('error', reject);
            });
            return next();
        }
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 15000
        });
        next();
    } catch (err) {
        console.error('Database connection failed in middleware:', err.message);
        res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
});


app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/items', require('./routes/items'));
app.use('/api/ingredients', require('./routes/ingredients'));
app.use('/api/deals', require('./routes/deals'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/print', require('./routes/printer'));
app.use('/api/logs', require('./routes/logs'));

// Catch-all 404 for API routes
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: 'API Route not found' });
    }
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000
})
    .then(() => {
        console.log('MongoDB Connected Successfully');
    })
    .catch(err => {
        console.error('CRITICAL: MongoDB Connection Error!');
        console.error('Error Details:', err.message);
        if (err.message.includes('authentication failed')) {
            console.error('TIP: Check your MONGO_URI username and password in .env');
        }
    });

module.exports = app;



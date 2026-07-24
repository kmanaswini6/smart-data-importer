const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const uploadRoutes = require('./routes/upload');
const importRoutes = require('./routes/importRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Mount core feature API routes
app.use('/api', uploadRoutes);
app.use('/api', importRoutes);
app.use('/api', authRoutes);

app.get('/health', (req, res) => {
    try {
        res.status(200).json({ status: 'OK', uptime: process.uptime() });
    } catch (error) {
        res.status(500).json({ error: 'Internal health check failure' });
    }
});

app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err.stack);
    res.status(500).json({ error: 'An unexpected error occurred on the server' });
});

app.listen(port, () => {
    console.log(`Smart Data Importer Backend online on port ${port}`);
});

module.exports = app;
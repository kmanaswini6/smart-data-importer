const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const uploadRoutes = require('./routes/upload');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Mount our upload endpoints under /api
app.use('/api', uploadRoutes);

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
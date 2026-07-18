const path = require('path');
const fs = require('fs');
const pool = require('../../db/connection');
const { parseCsvStream } = require('../services/csvService');
const { generateMappings } = require('../services/mappingService');

async function handleCsvUpload(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Please provide a CSV file.' });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    if (fileExt !== '.csv') {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (unlinkError) {
            console.error('Failed to delete invalid file:', unlinkError);
        }
        return res.status(400).json({ error: 'Invalid file format. Only standard CSV files are permitted.' });
    }

    try {
        const { headers, sample, rowCount } = await parseCsvStream(filePath);

        const insertQuery = `
            INSERT INTO imports (filename, uploaded_at, total_rows, valid_rows, invalid_rows, status)
            VALUES (?, NOW(), ?, 0, 0, 'uploaded')
        `;

        const [result] = await pool.execute(insertQuery, [
            req.file.originalname,
            rowCount
        ]);

        // Phase 2: compute auto-mapping suggestions from the parsed headers.
        // This is pure in-memory computation — no DB/network call, so no
        // try/catch needed beyond the outer block already wrapping this.
        const mappings = generateMappings(headers);

        return res.status(200).json({
            importId: result.insertId,
            headers,
            sample,
            rowCount,
            filePath,
            mappings
        });

    } catch (error) {
        console.error('CSV Processing Error:', error);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (unlinkError) {
            console.error('Failed to clean up file:', unlinkError);
        }
        return res.status(500).json({ error: 'Failed to process the CSV file.', details: error.message });
    }
}

module.exports = { handleCsvUpload };
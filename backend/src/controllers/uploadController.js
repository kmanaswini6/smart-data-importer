const path = require('path');
const fs = require('fs');
const csvParser = require('csv-parser');
const pool = require('../../db/connection');
const { parseCsvStream } = require('../services/csvService');
const { generateMappings } = require('../services/mappingService');
const { validateImportRows } = require('../services/validationService');
const { processDataImport } = require('../services/importService');

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

/**
 * Reads the temporarily saved file, runs the validation checks, 
 * and commits records to the database.
 */
async function confirmImport(req, res) {
    const importId = req.params.id;
    const { mapping, filePath } = req.body;

    if (!importId || !mapping || !filePath) {
        return res.status(400).json({ error: 'Missing required validation payload parameters.' });
    }

    if (!fs.existsSync(filePath)) {
        return res.status(400).json({ error: 'The uploaded file cache has expired or was not found on disk.' });
    }

    const rawRows = [];

    // Stream parse every row from disk into memory for processing
    fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data) => rawRows.push(data))
        .on('end', async () => {
            try {
                // 1. Run validation engine rules
                const { validRows, invalidRows } = validateImportRows(rawRows, mapping);

                // 2. Execute bounded batch database transactions
                const summary = await processDataImport(importId, validRows, invalidRows);

                // 3. Clean up the temporary file from the disk storage directory
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                } catch (err) {
                    console.error('Non-blocking temporary file removal cleanup failure:', err);
                }

                return res.status(200).json(summary);

            } catch (err) {
                console.error('Ingestion pipeline execution failure:', err);
                return res.status(500).json({ error: 'Failed to execute import mapping steps.', details: err.message });
            }
        })
        .on('error', (streamError) => {
            console.error('File stream parsing failure:', streamError);
            return res.status(500).json({ error: 'Failed to read data from source file cache.' });
        });
}

module.exports = {
    handleCsvUpload,
    confirmImport
};
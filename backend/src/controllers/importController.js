const pool = require('../../db/connection');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { validateImportRows } = require('../services/validationService');
const { processDataImport } = require('../services/importService');

/**
 * Streams the CSV file from disk, processes mapping validations, 
 * and commits actual row metrics back to the tracking database.
 */
async function processImport(req, res) {
    const importId = req.params.id;
    const { mapping, filePath } = req.body;

    if (!importId || !mapping || !filePath) {
        return res.status(400).json({ error: 'Missing required configuration parameters.' });
    }

    try {
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ error: `Target source file not found on disk: ${filePath}` });
        }

        // Safe user context extraction
        const userId = (req.user && req.user.id) ? req.user.id : null;

        // Verify import job ownership
        const [importRecord] = await pool.execute(
            'SELECT id FROM imports WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
            [importId, userId]
        );

        if (importRecord.length === 0) {
            return res.status(403).json({ error: 'Access denied. Unauthorized import execution sequence.' });
        }

        // Clear previous runs for this import ID
        await pool.execute('DELETE FROM import_errors WHERE import_id = ?', [importId]);
        await pool.execute('DELETE FROM customers WHERE import_id = ?', [importId]);

        const fileStream = fs.createReadStream(absolutePath);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        let headers = null;
        const rawRows = [];

        for await (const line of rl) {
            if (!line.trim()) continue;

            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
                .map(v => v.replace(/^"|"$/g, '').trim());

            if (!headers) {
                headers = values;
            } else {
                const rowObj = {};
                headers.forEach((header, index) => {
                    rowObj[header] = values[index] || '';
                });
                rawRows.push(rowObj);
            }
        }

        const { validRows, invalidRows } = validateImportRows(rawRows, mapping);

        const result = await processDataImport(importId, validRows, invalidRows);

        const totalRowsCount = validRows.length + invalidRows.length;
        const finalStatus = invalidRows.length > 0 ? 'warning' : 'completed';

        await pool.execute(
            `UPDATE imports 
             SET total_rows = ?, valid_rows = ?, invalid_rows = ?, status = ? 
             WHERE id = ?`,
            [totalRowsCount, validRows.length, invalidRows.length, finalStatus, importId]
        );

        return res.status(200).json(result);
    } catch (error) {
        console.error('Pipeline processing execution failed:', error.message || error);
        return res.status(500).json({
            error: 'Failed to execute transaction data integration pipeline.',
            details: error.message
        });
    }
}

async function getAllImports(req, res) {
    try {
        const userId = (req.user && req.user.id) ? req.user.id : null;

        const query = `SELECT id, filename, uploaded_at, total_rows, valid_rows, invalid_rows, status 
                       FROM imports 
                       WHERE user_id = ? OR user_id IS NULL 
                       ORDER BY uploaded_at DESC`;

        const [rows] = await pool.execute(query, [userId]);
        return res.status(200).json(rows || []);
    } catch (error) {
        console.error('Fetch history error:', error.message || error);
        return res.status(500).json({ error: 'Failed to retrieve imports ledger history.', details: error.message });
    }
}

async function getImportById(req, res) {
    const importId = req.params.id;
    try {
        const userId = (req.user && req.user.id) ? req.user.id : null;

        const statsQuery = `SELECT id, filename, uploaded_at, total_rows, valid_rows, invalid_rows, status 
                            FROM imports 
                            WHERE id = ? AND (user_id = ? OR user_id IS NULL)`;
        const [statsRows] = await pool.execute(statsQuery, [importId, userId]);

        if (statsRows.length === 0) {
            return res.status(403).json({ error: 'Access denied. Unauthorized data profile allocation.' });
        }

        const errorsQuery = `SELECT id, \`row_number\`, reason, raw_data FROM import_errors WHERE import_id = ? ORDER BY \`row_number\` ASC`;
        const [errorRows] = await pool.execute(errorsQuery, [importId]);

        const previewQuery = `SELECT id, name, email, phone, age FROM customers WHERE import_id = ? ORDER BY id ASC LIMIT 5`;
        const [previewRows] = await pool.execute(previewQuery, [importId]);

        return res.status(200).json({ stats: statsRows[0], errors: errorRows, preview: previewRows });
    } catch (error) {
        console.error('Get import by ID error:', error.message || error);
        return res.status(500).json({ error: 'Internal server reporting error.', details: error.message });
    }
}

module.exports = {
    processImport,
    getAllImports,
    getImportById
};
const pool = require('../../db/connection');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { validateImportRows } = require('../services/validationService');
const { processDataImport } = require('../services/importService');

/**
 * Streams the full CSV file from disk, applies clear state resets,
 * parses lines safely, and executes database persistence pipelines.
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

        // 1. CLEAN SLATE ISOLATION: Wipe previous attempts for this import ID to prevent duplicate logs
        await pool.execute('DELETE FROM import_errors WHERE import_id = ?', [importId]);
        await pool.execute('DELETE FROM customers WHERE import_id = ?', [importId]);

        const fileStream = fs.createReadStream(absolutePath);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        let headers = null;
        const rawRows = [];

        for await (const line of rl) {
            if (!line.trim()) continue;

            // Quote-aware CSV splitter regex: splits by commas only outside matching quote marks
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

        // 2. Validate parsed structures against confirmed mapping assignments
        const { validRows, invalidRows } = validateImportRows(rawRows, mapping);

        // 3. Batch insert clean records and log anomalies in a single pass
        const result = await processDataImport(importId, validRows, invalidRows);

        return res.status(200).json(result);
    } catch (error) {
        console.error('Pipeline processing execution failed:', error);
        return res.status(500).json({
            error: 'Failed to execute transaction data integration pipeline.',
            details: error.message
        });
    }
}

async function getAllImports(req, res) {
    try {
        const query = `SELECT id, filename, uploaded_at, total_rows, valid_rows, invalid_rows, status FROM imports ORDER BY uploaded_at DESC`;
        const [rows] = await pool.execute(query);
        return res.status(200).json(rows);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to retrieve imports ledger history.' });
    }
}

async function getImportById(req, res) {
    const importId = req.params.id;
    try {
        const statsQuery = `SELECT id, filename, uploaded_at, total_rows, valid_rows, invalid_rows, status FROM imports WHERE id = ?`;
        const [statsRows] = await pool.execute(statsQuery, [importId]);

        if (statsRows.length === 0) return res.status(404).json({ error: 'Record not located.' });

        const errorsQuery = `SELECT id, \`row_number\`, reason, raw_data FROM import_errors WHERE import_id = ? ORDER BY \`row_number\` ASC`;
        const [errorRows] = await pool.execute(errorsQuery, [importId]);

        const previewQuery = `SELECT id, name, email, phone, age FROM customers WHERE import_id = ? ORDER BY id ASC LIMIT 5`;
        const [previewRows] = await pool.execute(previewQuery, [importId]);

        return res.status(200).json({ stats: statsRows[0], errors: errorRows, preview: previewRows });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server reporting error.' });
    }
}

module.exports = {
    processImport,
    getAllImports,
    getImportById
};
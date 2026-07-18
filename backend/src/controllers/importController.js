const pool = require('../../db/connection');

/**
 * Retrieves a historical list of all file imports processed by the system,
 * sorted with the most recent entries first.
 */
async function getAllImports(req, res) {
    try {
        const query = `
            SELECT id, filename, uploaded_at, total_rows, valid_rows, invalid_rows, status 
            FROM imports 
            ORDER BY uploaded_at DESC
        `;
        const [rows] = await pool.execute(query);
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Failed to retrieve imports history:', error);
        return res.status(500).json({
            error: 'Failed to retrieve the imports ledger history log.',
            details: error.message
        });
    }
}

/**
 * Fetches the complete contextual summary metrics, row-level error logs, 
 * and a 5-row customer data preview table for a specific import task.
 */
async function getImportById(req, res) {
    const importId = req.params.id;

    if (!importId) {
        return res.status(400).json({ error: 'A valid tracking import ID parameters must be supplied.' });
    }

    try {
        // 1. Fetch the overarching metadata record from imports table
        const statsQuery = `
            SELECT id, filename, uploaded_at, total_rows, valid_rows, invalid_rows, status 
            FROM imports 
            WHERE id = ?
        `;
        const [statsRows] = await pool.execute(statsQuery, [importId]);

        if (statsRows.length === 0) {
            return res.status(404).json({ error: `No import record located matching ID: ${importId}` });
        }

        // 2. Fetch all raw rows routed to the errors table (Escaping reserved row_number keyword)
        const errorsQuery = `
            SELECT id, row_number, reason, raw_data 
            FROM import_errors 
            WHERE import_id = ? 
            ORDER BY row_number ASC
        `;
        const [errorRows] = await pool.execute(errorsQuery, [importId]);

        // 3. Fetch the initial 5 rows of successfully imported customer profiles as a verification preview
        const previewQuery = `
            SELECT id, name, email, phone, age 
            FROM customers 
            WHERE import_id = ? 
            ORDER BY id ASC 
            LIMIT 5
        `;
        const [previewRows] = await pool.execute(previewQuery, [importId]);

        // 4. Assemble consolidated audit payload package
        return res.status(200).json({
            stats: statsRows[0],
            errors: errorRows,
            preview: previewRows
        });

    } catch (error) {
        console.error(`Failed to process audit query for import ID ${importId}:`, error);
        return res.status(500).json({
            error: 'Internal service failure executing reporting generation.',
            details: error.message
        });
    }
}

module.exports = {
    getAllImports,
    getImportById
};
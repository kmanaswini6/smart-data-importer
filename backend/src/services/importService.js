const pool = require('../../db/connection');

/**
 * Processes data persistence using bounded transactions and high-speed batching.
 * High-performance variation optimized to handle thousands of rows via chunked bulk inputs.
 * 
 * @param {number} importId - Relational index pointing to the active tracking item.
 * @param {Array<Object>} validRows - Sanitized row array matching target schemas.
 * @param {Array<Object>} preValidatedErrors - Rows that failed initial validation checks.
 * @returns {Promise<Object>} Final state tracking information.
 */
async function processDataImport(importId, validRows, preValidatedErrors) {
    if (!importId) throw new Error('A valid importId must be provided.');

    let totalValidInserted = 0;
    let totalInvalidRecorded = 0;
    const BATCH_SIZE = 500;

    // 1. High-speed Bulk Batching for Pre-Validated Errors
    if (preValidatedErrors && preValidatedErrors.length > 0) {
        for (let i = 0; i < preValidatedErrors.length; i += BATCH_SIZE) {
            const batch = preValidatedErrors.slice(i, i + BATCH_SIZE);
            const errorValues = batch.map(errorRow => [
                importId,
                errorRow.rowNumber,
                errorRow.reason,
                JSON.stringify(errorRow.rawData)
            ]);

            const errorInsertQuery = `
                INSERT INTO import_errors (import_id, \`row_number\`, reason, raw_data)
                VALUES ?
            `;
            await pool.query(errorInsertQuery, [errorValues]);
            totalInvalidRecorded += batch.length;
        }
    }

    // 2. Process valid rows in chunked sizes of 500
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE);
        let batchSucceeded = false;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const insertValues = batch.map(row => [
                importId,
                row.name,
                row.email,
                row.phone,
                row.age
            ]);

            const bulkInsertQuery = `
                INSERT INTO customers (import_id, name, email, phone, age)
                VALUES ?
            `;

            await connection.query(bulkInsertQuery, [insertValues]);
            await connection.commit();
            totalValidInserted += batch.length;
            batchSucceeded = true;
        } catch (batchError) {
            await connection.rollback();
            console.warn(`Batch boundary conflict hit. Falling back to single row recovery.`);
        } finally {
            connection.release(); // Explicitly release batch connection prior to entering single row fallback
        }

        // Single-row recovery fallback loop if bulk batch insert failed
        if (!batchSucceeded) {
            for (let j = 0; j < batch.length; j++) {
                const individualRow = batch[j];
                const cleanConnection = await pool.getConnection();

                try {
                    await cleanConnection.beginTransaction();
                    const singleInsertQuery = `
                        INSERT INTO customers (import_id, name, email, phone, age)
                        VALUES (?, ?, ?, ?, ?)
                    `;
                    await cleanConnection.execute(singleInsertQuery, [
                        importId,
                        individualRow.name,
                        individualRow.email,
                        individualRow.phone,
                        individualRow.age
                    ]);
                    await cleanConnection.commit();
                    totalValidInserted++;
                } catch (singleRowError) {
                    await cleanConnection.rollback();

                    const isDuplicate = singleRowError.code === 'ER_DUP_ENTRY' || singleRowError.errno === 1062;
                    const errorReason = isDuplicate
                        ? `Duplicate email detected in database: '${individualRow.email}'`
                        : `Database integrity constraint error: ${singleRowError.message}`;

                    const fallBackErrorLogQuery = `
                        INSERT INTO import_errors (import_id, \`row_number\`, reason, raw_data)
                        VALUES (?, ?, ?, ?)
                    `;

                    await pool.execute(fallBackErrorLogQuery, [
                        importId,
                        individualRow.rowNumber || (i + j + 2),
                        errorReason,
                        JSON.stringify(individualRow.rawData || {
                            name: individualRow.name,
                            email: individualRow.email,
                            phone: individualRow.phone,
                            age: individualRow.age
                        })
                    ]);
                    totalInvalidRecorded++;
                } finally {
                    cleanConnection.release();
                }
            }
        }
    }

    // 3. Structural update to metrics tracker ledger item
    const finalStatus = totalInvalidRecorded > 0 ? 'warning' : 'completed';
    const totalRows = totalValidInserted + totalInvalidRecorded;

    const updateSummaryQuery = `
        UPDATE imports 
        SET total_rows = ?, valid_rows = ?, invalid_rows = ?, status = ?
        WHERE id = ?
    `;
    await pool.execute(updateSummaryQuery, [
        totalRows,
        totalValidInserted,
        totalInvalidRecorded,
        finalStatus,
        importId
    ]);

    return {
        importId,
        totalRows,
        validCount: totalValidInserted,
        invalidCount: totalInvalidRecorded,
        status: finalStatus
    };
}

module.exports = {
    processDataImport
};
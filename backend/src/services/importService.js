const pool = require('../../db/connection');

/**
 * Processes data persistence using bounded transactions and high-speed batching.
 * Isolates and routes DB constraint updates safely without halting the importer.
 * 
 * @param {number} importId - The relational index pointing to the active tracking item in the imports table.
 * @param {Array<Object>} validRows - Sanitized row array matching { name, email, phone, age }.
 * @param {Array<Object>} preValidatedErrors - Rows that failed the Phase 3 validation engine stage.
 * @returns {Promise<Object>} Final state tracking information.
 */
async function processDataImport(importId, validRows, preValidatedErrors) {
    if (!importId) throw new Error('A valid importId must be provided.');

    let totalValidInserted = 0;
    let totalInvalidRecorded = 0;

    const BATCH_SIZE = 500;

    // 1. First, persist pre-validated validation errors directly to import_errors
    if (preValidatedErrors && preValidatedErrors.length > 0) {
        const errorInsertQuery = `
            INSERT INTO import_errors (import_id, \`row_number\`, reason, raw_data)
            VALUES (?, ?, ?, ?)
        `;
        for (const errorRow of preValidatedErrors) {
            try {
                await pool.execute(errorInsertQuery, [
                    importId,
                    errorRow.rowNumber,
                    errorRow.reason,
                    JSON.stringify(errorRow.rawData)
                ]);
                totalInvalidRecorded++;
            } catch (err) {
                console.error(`Failed to write pre-validated error log at row ${errorRow.rowNumber}:`, err);
            }
        }
    }

    // 2. Process valid rows in chunked sizes of 500
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE);

        // Get an isolated connection from the pool to secure manual transaction execution control
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Structure multi-row insertions parameters into arrays: [[importId, name, email, phone, age], ...]
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

            // Execute high-speed batch insertion statement
            await connection.query(bulkInsertQuery, [insertValues]);
            await connection.commit();

            totalValidInserted += batch.length;

        } catch (batchError) {
            // A conflict occurred (e.g., unique email violation). Roll back the entire batch.
            await connection.rollback();
            console.warn(`Batch processing boundary conflict encountered between indexes ${i} and ${i + batch.length}. Dropping down to singular row inspection mode.`);

            // Fall back to item-by-item processing to protect clean records and catch the database violation rows
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

                    // Determine if failure matches database duplicate constraints
                    const isDuplicate = singleRowError.code === 'ER_DUP_ENTRY' || singleRowError.errno === 1062;
                    const errorReason = isDuplicate
                        ? 'duplicate email in database'
                        : `Database integration constraint error: ${singleRowError.message}`;

                    const fallBackErrorLogQuery = `
                        INSERT INTO import_errors (import_id, \`row_number\`, reason, raw_data)
                        VALUES (?, ?, ?, ?)
                    `;

                    // Reconstruct an approximate row position index for context logging
                    const estimatedFileRowNumber = i + j + 2;

                    await pool.execute(fallBackErrorLogQuery, [
                        importId,
                        estimatedFileRowNumber,
                        errorReason,
                        JSON.stringify({
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

        } finally {
            connection.release();
        }
    }

    // 3. Update the primary metadata ledger tracking item status to 'completed'
    try {
        const updateSummaryQuery = `
            UPDATE imports 
            SET valid_rows = ?, invalid_rows = ?, status = 'completed'
            WHERE id = ?
        `;
        await pool.execute(updateSummaryQuery, [totalValidInserted, totalInvalidRecorded, importId]);
    } catch (summaryUpdateError) {
        console.error(`Critically failed to update summary ledger status metrics for import entry ID: ${importId}`, summaryUpdateError);
    }

    return {
        importId,
        validCount: totalValidInserted,
        invalidCount: totalInvalidRecorded,
        status: 'completed'
    };
}

module.exports = {
    processDataImport
};
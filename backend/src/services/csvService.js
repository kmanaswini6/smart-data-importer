const fs = require('fs');
const csvParser = require('csv-parser');

/**
 * Streams a CSV file to extract headers, a 5-row sample, and total row count.
 * @param {string} filePath - Path to the uploaded file on disk
 * @returns {Promise<{headers: string[], sample: Object[], rowCount: number}>}
 */
function parseCsvStream(filePath) {
    return new Promise((resolve, reject) => {
        const sample = [];
        let headers = [];
        let rowCount = 0;
        let headersCaptured = false;

        const stream = fs.createReadStream(filePath)
            .pipe(csvParser());

        stream.on('headers', (headerList) => {
            headers = headerList;
            headersCaptured = true;
        });

        stream.on('data', (row) => {
            rowCount++;

            if (!headersCaptured && rowCount === 1) {
                headers = Object.keys(row);
                headersCaptured = true;
            }

            if (sample.length < 5) {
                sample.push(row);
            }
        });

        stream.on('end', () => {
            resolve({
                headers,
                sample,
                rowCount
            });
        });

        stream.on('error', (error) => {
            reject(error);
        });
    });
}

module.exports = {
    parseCsvStream
};
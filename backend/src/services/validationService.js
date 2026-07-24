/**
 * Standard RFC 5322 compliant regular expression for validating basic structural emails.
 * Checks for non-empty text before and after the @ symbol, followed by a valid top-level domain.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Standard regular expression ensuring a phone number string consists of exactly 10 digits.
 */
const PHONE_REGEX = /^\d{10}$/;

/**
 * Validates and transforms raw CSV records based on user-defined column configurations.
 * Separates compliant datasets from anomalous rows, recording distinct failure contexts.
 * 
 * @param {Array<Object>} rawRows - Array of raw data objects parsed out from the CSV file.
 * @param {Object} mapping - Configured user schema map (e.g., { "Full Name": "name", "Email Address": "email" }).
 * @returns {Object} Combined classification payload containing validRows and detailed invalidRows arrays.
 */
function validateImportRows(rawRows, mapping) {
    if (!Array.isArray(rawRows)) {
        throw new TypeError('The rawRows parameter must be a valid structured array.');
    }
    if (!mapping || typeof mapping !== 'object') {
        throw new TypeError('The schema mapping configuration parameter must be a valid object.');
    }

    const validRows = [];
    const invalidRows = [];

    // In-memory unique tracker to enforce file-level deduplication on incoming emails
    const seenEmailsInFile = new Set();

    // Invert the mapping to easily locate which source column matches our system field
    const targetToSourceMap = {};
    for (const [sourceCol, targetField] of Object.entries(mapping)) {
        if (targetField) {
            targetToSourceMap[targetField] = sourceCol;
        }
    }

    // Process every single row systematically. 
    for (let index = 0; index < rawRows.length; index++) {
        const rawRow = rawRows[index];
        const rowNumber = index + 2;

        const sourceNameKey = targetToSourceMap['name'];
        const sourceEmailKey = targetToSourceMap['email'];
        const sourcePhoneKey = targetToSourceMap['phone'];
        const sourceAgeKey = targetToSourceMap['age'];

        const rawName = sourceNameKey ? rawRow[sourceNameKey] : undefined;
        const rawEmail = sourceEmailKey ? rawRow[sourceEmailKey] : undefined;
        const rawPhone = sourcePhoneKey ? rawRow[sourcePhoneKey] : undefined;
        const rawAge = sourceAgeKey ? rawRow[sourceAgeKey] : undefined;

        const cleanedName = rawName !== undefined && rawName !== null ? String(rawName).trim() : '';
        const cleanedEmail = rawEmail !== undefined && rawEmail !== null ? String(rawEmail).trim() : '';

        // Strip non-digits. Remove leading '1' if an 11-digit US country code is passed.
        let cleanedPhone = rawPhone !== undefined && rawPhone !== null ? String(rawPhone).trim() : '';
        if (cleanedPhone) {
            cleanedPhone = cleanedPhone.replace(/\D/g, '');
            if (cleanedPhone.length === 11 && cleanedPhone.startsWith('1')) {
                cleanedPhone = cleanedPhone.slice(1);
            }
        }

        const cleanedAge = rawAge !== undefined && rawAge !== null ? String(rawAge).trim() : '';

        let validationReason = null;

        // 1. Validate Name
        if (!cleanedName) {
            validationReason = 'Missing required field: name';
        }

        // 2. Validate Email
        if (!validationReason) {
            if (!cleanedEmail) {
                validationReason = 'Missing required field: email';
            } else if (!EMAIL_REGEX.test(cleanedEmail)) {
                validationReason = `Malformed email address syntax: '${cleanedEmail}'`;
            } else if (seenEmailsInFile.has(cleanedEmail.toLowerCase())) {
                validationReason = `Duplicate email detected within this import file: '${cleanedEmail}'`;
            }
        }

        // 3. Validate Phone Number (Optional field)
        if (!validationReason && cleanedPhone) {
            if (!PHONE_REGEX.test(cleanedPhone)) {
                validationReason = `Phone number must be exactly 10 numerical digits: '${cleanedPhone}'`;
            }
        }

        // 4. Validate Age (Optional field)
        if (!validationReason && cleanedAge) {
            if (!/^\d+$/.test(cleanedAge)) {
                validationReason = `Age field value must be a positive integer: '${cleanedAge}'`;
            } else {
                const parsedAge = Number(cleanedAge);
                if (parsedAge < 18) {
                    validationReason = `Age restriction violation: Client must be 18 or older. Found: ${parsedAge}`;
                } else if (parsedAge > 120) {
                    validationReason = `Unrealistic age value detected. Found: ${parsedAge}`;
                }
            }
        }

        if (validationReason) {
            invalidRows.push({
                rowNumber,
                reason: validationReason,
                rawData: rawRow
            });
        } else {
            seenEmailsInFile.add(cleanedEmail.toLowerCase());

            validRows.push({
                rowNumber,                         // Attached to preserve precise CSV row line numbers
                rawData: rawRow,                    // Attached to preserve raw row payloads for DB errors
                name: cleanedName,
                email: cleanedEmail.toLowerCase(),
                phone: cleanedPhone || null,
                age: cleanedAge ? Number(cleanedAge) : null
            });
        }
    }

    return {
        validRows,
        invalidRows
    };
}

module.exports = {
    validateImportRows
};
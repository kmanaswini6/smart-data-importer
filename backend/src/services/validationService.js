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
    // Result structure: { name: "Full Name", email: "Email Address" }
    const targetToSourceMap = {};
    for (const [sourceCol, targetField] of Object.entries(mapping)) {
        if (targetField) {
            targetToSourceMap[targetField] = sourceCol;
        }
    }

    // Process every single row systematically. 
    // Data rows in a CSV typically start at index 0, which corresponds to row number 2 in the physical file.
    for (let index = 0; index < rawRows.length; index++) {
        const rawRow = rawRows[index];
        const rowNumber = index + 2;

        // Extract and clean raw values using our inverted map configurations
        const sourceNameKey = targetToSourceMap['name'];
        const sourceEmailKey = targetToSourceMap['email'];
        const sourcePhoneKey = targetToSourceMap['phone'];
        const sourceAgeKey = targetToSourceMap['age'];

        const rawName = sourceNameKey ? rawRow[sourceNameKey] : undefined;
        const rawEmail = sourceEmailKey ? rawRow[sourceEmailKey] : undefined;
        const rawPhone = sourcePhoneKey ? rawRow[sourcePhoneKey] : undefined;
        const rawAge = sourceAgeKey ? rawRow[sourceAgeKey] : undefined;

        // Strip leading/trailing whitespaces to eliminate dirty formatting strings
        const cleanedName = rawName !== undefined && rawName !== null ? String(rawName).trim() : '';
        const cleanedEmail = rawEmail !== undefined && rawEmail !== null ? String(rawEmail).trim() : '';

        // Handle optional phone number fields. Clean out dashes, spaces or parenthesis commonly added by users.
        let cleanedPhone = rawPhone !== undefined && rawPhone !== null ? String(rawPhone).trim() : '';
        if (cleanedPhone) {
            cleanedPhone = cleanedPhone.replace(/[\s\-\(\)]/g, '');
        }

        const cleanedAge = rawAge !== undefined && rawAge !== null ? String(rawAge).trim() : '';

        // ---------------------------------------------------------------------
        // RULE SYSTEM PROCESSING (Short-circuiting on the first encountered validation error)
        // ---------------------------------------------------------------------
        let validationReason = null;

        // 1. Validate Name Field Constraints
        if (!cleanedName) {
            validationReason = 'Missing required field: name';
        }

        // 2. Validate Email Field Constraints
        if (!validationReason) {
            if (!cleanedEmail) {
                validationReason = 'Missing required field: email';
            } else if (!EMAIL_REGEX.test(cleanedEmail)) {
                validationReason = `Malformed email address syntax: '${cleanedEmail}'`;
            } else if (seenEmailsInFile.has(cleanedEmail.toLowerCase())) {
                validationReason = `Duplicate email detected within this import file: '${cleanedEmail}'`;
            }
        }

        // 3. Validate Phone Number Field Constraints (Optional field check)
        if (!validationReason && cleanedPhone) {
            if (!PHONE_REGEX.test(cleanedPhone)) {
                validationReason = `Phone number must be exactly 10 numerical digits: '${cleanedPhone}'`;
            }
        }

        // 4. Validate Age Field Constraints (Optional field check)
        if (!validationReason && cleanedAge) {
            const parsedAge = Number(cleanedAge);
            if (!Number.isInteger(parsedAge) || String(parsedAge) !== cleanedAge) {
                validationReason = `Age field value must be an integer: '${cleanedAge}'`;
            } else if (parsedAge < 18) {
                validationReason = `Age restriction violation: Client must be 18 or older. Found: ${parsedAge}`;
            }
        }

        // ---------------------------------------------------------------------
        // SEPARATION PIPELINE DISPATCH
        // ---------------------------------------------------------------------
        if (validationReason) {
            invalidRows.push({
                rowNumber,
                reason: validationReason,
                rawData: rawRow
            });
        } else {
            // Track valid email globally to trigger file deduplication errors on following loops
            seenEmailsInFile.add(cleanedEmail.toLowerCase());

            validRows.push({
                name: cleanedName,
                email: cleanedEmail.toLowerCase(), // Normalize down to lower-case for storage uniformity
                phone: cleanedPhone || null,        // Store clear null placeholders instead of empty strings
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
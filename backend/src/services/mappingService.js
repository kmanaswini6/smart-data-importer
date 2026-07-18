const TARGET_FIELDS = ['name', 'email', 'phone', 'age'];

// Below this confidence score, we don't trust the auto-suggestion enough
// to pre-select it in the UI — the user should map it manually instead.
const CONFIDENCE_THRESHOLD = 40;

/**
 * Computes the Levenshtein edit distance between two strings using a
 * classic dynamic programming table.
 *
 * dp[i][j] = edit distance between a[0..i) and b[0..j)
 *
 * Base cases:
 *   dp[0][j] = j  (turn empty string into b[0..j) via j insertions)
 *   dp[i][0] = i  (turn a[0..i) into empty string via i deletions)
 *
 * Transition:
 *   if a[i-1] === b[j-1]: dp[i][j] = dp[i-1][j-1]           (no edit needed)
 *   else:                 dp[i][j] = 1 + min(
 *                             dp[i-1][j],     // deletion from a
 *                             dp[i][j-1],     // insertion into a
 *                             dp[i-1][j-1]    // substitution
 *                           )
 */
function levenshteinDistance(a, b) {
    const aLen = a.length;
    const bLen = b.length;

    // Fast paths avoid allocating a table for trivial cases.
    if (aLen === 0) return bLen;
    if (bLen === 0) return aLen;

    // dp is (aLen+1) x (bLen+1). Row 0 and column 0 are the base cases.
    const dp = new Array(aLen + 1);
    for (let i = 0; i <= aLen; i++) {
        dp[i] = new Array(bLen + 1).fill(0);
        dp[i][0] = i; // deleting all of a[0..i) to reach ""
    }
    for (let j = 0; j <= bLen; j++) {
        dp[0][j] = j; // inserting all of b[0..j) into ""
    }

    for (let i = 1; i <= aLen; i++) {
        for (let j = 1; j <= bLen; j++) {
            if (a[i - 1] === b[j - 1]) {
                // Characters match — no edit needed, carry over the
                // diagonal (already-solved smaller subproblem).
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],     // delete a[i-1]
                    dp[i][j - 1],     // insert b[j-1]
                    dp[i - 1][j - 1]  // substitute a[i-1] -> b[j-1]
                );
            }
        }
    }

    return dp[aLen][bLen];
}

/**
 * Converts a raw edit distance into a 0-100 confidence score, normalized
 * against the length of the longer string. This keeps scores comparable
 * across target fields of different lengths (e.g. "age" vs "phone").
 */
function distanceToConfidence(distance, aLen, bLen) {
    const maxLen = Math.max(aLen, bLen);
    if (maxLen === 0) return 100; // both strings empty — treat as identical
    const similarity = 1 - (distance / maxLen);
    const clamped = Math.max(0, Math.min(1, similarity));
    return Math.round(clamped * 100 * 100) / 100; // round to 2 decimals
}

/**
 * For each source column, compares it (case-insensitively) against every
 * target field, and returns the single best match by confidence score.
 *
 * @param {string[]} sourceColumns - column headers from the uploaded CSV
 * @param {string[]} [targetFields] - defaults to TARGET_FIELDS
 * @returns {{sourceColumn: string, suggestedTarget: string|null, confidenceScore: number}[]}
 */
function generateMappings(sourceColumns, targetFields = TARGET_FIELDS) {
    if (!Array.isArray(sourceColumns)) {
        throw new TypeError('sourceColumns must be an array of strings');
    }

    // Empty header list — nothing to map, return empty array rather than
    // throwing, since an upload with zero columns is a valid (if useless) input.
    if (sourceColumns.length === 0) {
        return [];
    }

    return sourceColumns.map((rawSourceColumn) => {
        // Guard against null/undefined/non-string entries in the header list.
        const sourceColumn = String(rawSourceColumn ?? '');
        const normalizedSource = sourceColumn.trim().toLowerCase();

        let bestTarget = null;
        let bestConfidence = -1;

        for (const targetField of targetFields) {
            const normalizedTarget = targetField.trim().toLowerCase();
            const distance = levenshteinDistance(normalizedSource, normalizedTarget);
            const confidence = distanceToConfidence(
                distance,
                normalizedSource.length,
                normalizedTarget.length
            );

            if (confidence > bestConfidence) {
                bestConfidence = confidence;
                bestTarget = targetField;
            }
        }

        // If our best match still isn't confident enough, don't suggest
        // anything — force a manual decision in the UI instead of guessing.
        const suggestedTarget = bestConfidence >= CONFIDENCE_THRESHOLD ? bestTarget : null;

        return {
            sourceColumn,
            suggestedTarget,
            confidenceScore: bestConfidence
        };
    });
}

module.exports = {
    generateMappings,
    levenshteinDistance, // exported for unit testing
    TARGET_FIELDS,
    CONFIDENCE_THRESHOLD
};
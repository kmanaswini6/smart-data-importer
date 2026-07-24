const express = require('express');
const multer = require('multer');
const fs = require('fs');
const readline = require('readline');
const pool = require('../../db/connection');
const { processImport, getAllImports, getImportById } = require('../controllers/importController');
const verifyToken = require('../middleware/authMiddleware');
const { predictSchemaMapping } = require('../services/aiService');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/import/upload', verifyToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No data file provided for transmission.' });
    }

    let headers = [];
    try {
        if (fs.existsSync(req.file.path)) {
            const fileStream = fs.createReadStream(req.file.path);
            const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

            try {
                for await (const line of rl) {
                    if (line.trim()) {
                        headers = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
                            .map(h => h.replace(/^"|"$/g, '').trim())
                            .filter(h => h.length > 0);
                        break;
                    }
                }
            } finally {
                rl.close();
                fileStream.destroy();
            }
        }

        const targetFields = ['name', 'email', 'phone', 'age'];
        let predictedMap = {};
        try {
            predictedMap = await predictSchemaMapping(headers, targetFields);
        } catch (aiErr) {
            console.warn('AI alignment prediction down. Falling back to default empty schema.');
            targetFields.forEach(f => { predictedMap[f] = ''; });
        }

        const formattedMappings = headers.map(header => {
            const cleanedHeader = header.toLowerCase().trim();

            const matchedSystemField = Object.keys(predictedMap).find(key => {
                const aiValue = predictedMap[key];
                return aiValue && aiValue.toLowerCase().trim() === cleanedHeader;
            }) || '';

            return {
                sourceColumn: header,
                suggestedTarget: matchedSystemField,
                confidenceScore: matchedSystemField ? 98.4 : 0.0
            };
        });

        // Safe extraction prevents mysql2 bind parameter exceptions
        const userId = (req.user && req.user.id) ? req.user.id : null;

        const query = `
            INSERT INTO imports (filename, uploaded_at, total_rows, valid_rows, invalid_rows, status, user_id) 
            VALUES (?, NOW(), 0, 0, 0, 'uploaded', ?)
        `;
        const [result] = await pool.execute(query, [req.file.originalname, userId]);

        return res.status(201).json({
            message: 'File staged on disk successfully.',
            importId: result.insertId,
            filePath: req.file.path,
            filename: req.file.originalname,
            mappings: formattedMappings
        });

    } catch (error) {
        console.error('File registration sequence failed:', error.message || error);
        return res.status(500).json({ error: `Internal system tracking error: ${error.message}` });
    }
});

router.post('/import/:id/process', verifyToken, processImport);
router.get('/imports', verifyToken, getAllImports);
router.get('/import/:id', verifyToken, getImportById);

module.exports = router;
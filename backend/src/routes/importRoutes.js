const express = require('express');
const { getAllImports, getImportById, processImport } = require('../controllers/importController');

const router = express.Router();

router.get('/imports', getAllImports);
router.get('/imports/:id', getImportById);
router.post('/imports/:id/process', processImport); // Mount processing worker pipeline

module.exports = router;
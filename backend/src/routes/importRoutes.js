const express = require('express');
const { getAllImports, getImportById } = require('../controllers/importController');

const router = express.Router();

// Define ledger query endpoints
router.get('/imports', getAllImports);
router.get('/imports/:id', getImportById);

module.exports = router;
const express = require('express');
const multer = require('multer');
const path = require('path');
const { handleCsvUpload, confirmImport } = require('../controllers/uploadController');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.post('/upload', upload.single('csvFile'), handleCsvUpload);
router.post('/imports/:id/confirm', confirmImport); // Bind the validation action path

module.exports = router;
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { execSync } = require('child_process');
const { readJson, writeJson, escapeHtml } = require('../utils/db');

const DATA_FILE = 'content/data.json';

function readData() {
    return readJson(DATA_FILE, { folders: [], files: [] });
}

function writeData(data) {
    writeJson(DATA_FILE, data);
}

// Get files - all files if no parentId, or files in specific folder
router.get('/', (req, res) => {
    try {
        const data = readData();
        const parentId = req.query.parentId;
        // If parentId is not provided or is empty string, return all files
        if (parentId === undefined || parentId === '' || parentId === null) {
            res.json(data.files);
        } else {
            const files = data.files.filter(f => f.parentId === parentId);
            res.json(files);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 文件上传接口 - 保存到 data/files/，由 cron 脚本同步到数据库
const multerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create directory if it doesn't exist
        const uploadDir = path.join(__dirname, '..', 'data', 'content', 'files');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: multerStorage });

router.post('/upload', upload.any(), function(req, res) {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: '没有文件' });
        }
        const uploaded = req.files.map(f => ({ name: f.originalname, size: f.size }));
        res.json({ success: true, files: uploaded, message: '文件已上传，将在大约1分钟后同步到网站' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get single file (fudan/all is a special route before /:id)
router.get('/fudan/all', async (req, res) => {
    try {
        const fudanDir = path.join(__dirname, '..', 'data', 'content', 'files', '复旦文件');
        const result = {};
        
        if (!fs.existsSync(fudanDir)) {
            return res.json({ success: true, files: result });
        }
        
        const files = fs.readdirSync(fudanDir);
        for (const file of files) {
            if (file.endsWith('.md') || file.endsWith('.txt')) {
                const filePath = path.join(fudanDir, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                // 限制每个文件最大 10KB（摘要）
                result[file] = content.substring(0, 10240);
            }
        }
        
        res.json({ success: true, files: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', (req, res) => {
    try {
        const data = readData();
        const file = data.files.find(f => f.id === req.params.id);
        if (file) {
            res.json(file);
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get DOCX font sizes for styling
router.get('/:id/styles', (req, res) => {
    try {
        const data = readData();
        const file = data.files.find(f => f.id === req.params.id);
        if (!file) return res.status(404).json({ error: 'File not found' });
        if (!file.name.toLowerCase().endsWith('.docx')) {
            return res.json({ success: true, styleSizes: {} });
        }
        
        const scriptPath = path.join(__dirname, '..', 'tools', 'extract_docx_styles.py');
        const contentInput = String(file.content || '').slice(0, 5 * 1024 * 1024); // 限制 5MB
        const result = execSync(`python3 "${scriptPath}"`, {
            input: contentInput,
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
            timeout: 30000 // 30秒超时
        });
        res.json(JSON.parse(result));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Upload file (legacy content upload)
router.post('/', (req, res) => {
    try {
        const { name, content, parentId } = req.body;
        if (!name || !content) return res.status(400).json({ error: 'Name and content required' });
        
        const data = readData();
        const file = {
            id: Date.now().toString(),
            name: escapeHtml(name),
            content,
            parentId: parentId || null,
            size: content.length,
            createdAt: Date.now()
        };
        data.files.push(file);
        writeData(data);
        res.json({ id: file.id, name: file.name, createdAt: file.createdAt });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete file
router.delete('/:id', (req, res) => {
    try {
        const data = readData();
        const index = data.files.findIndex(f => f.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'File not found' });
        
        const deleted = data.files.splice(index, 1)[0];
        writeData(data);
        res.json({ success: true, deleted: deleted.name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { readJson, writeJson, escapeHtml } = require('../utils/db');

const DATA_FILE = 'content/data.json';

function readData() {
    return readJson(DATA_FILE, { folders: [], files: [] });
}

function writeData(data) {
    writeJson(DATA_FILE, data);
}

// Get all folders
router.get('/', (req, res) => {
    try {
        const data = readData();
        res.json(data.folders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create folder
router.post('/', (req, res) => {
    try {
        const { name, parentId } = req.body;
        if (!name) return res.status(400).json({ error: 'Name required' });
        
        const data = readData();
        const folder = {
            id: Date.now().toString(),
            name: escapeHtml(name),
            parentId: parentId || null,
            createdAt: Date.now()
        };
        data.folders.push(folder);
        writeData(data);
        res.json(folder);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete folder
router.delete('/:id', (req, res) => {
    try {
        const data = readData();
        const id = req.params.id;
        
        // Delete folder and all its contents recursively
        const idsToDelete = [id];
        
        // Find all child folders recursively
        function findChildren(parentId) {
            data.folders.filter(f => f.parentId === parentId).forEach(f => {
                idsToDelete.push(f.id);
                findChildren(f.id);
            });
        }
        findChildren(id);
        
        // Remove folders
        data.folders = data.folders.filter(f => !idsToDelete.includes(f.id));
        // Remove files in these folders
        data.files = data.files.filter(f => !idsToDelete.includes(f.parentId));
        
        writeData(data);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

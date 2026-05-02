const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const { readJson, writeJson, escapeHtml } = require('../utils/db');

// ---------- CHANGELOG ----------
const CHANGELOG_FILE = 'changelog.json';

function loadChangelog() {
    const data = readJson(CHANGELOG_FILE, { logs: [] });
    return data.logs || [];
}

function saveChangelog(logs) {
    writeJson(CHANGELOG_FILE, { logs });
}

// Get all changelog entries
router.get('/changelog', (req, res) => {
    try {
        const logs = loadChangelog();
        logs.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new changelog entry
router.post('/changelog', (req, res) => {
    try {
        const { date, version, content } = req.body;
        
        if (!date || !version) {
            return res.status(400).json({ error: 'date and version are required' });
        }
        
        const log = {
            id: Date.now().toString(),
            date,
            version: escapeHtml(version),
            content: content ? escapeHtml(content) : '',
            createdAt: new Date().toISOString()
        };
        
        const logs = loadChangelog();
        logs.unshift(log);
        saveChangelog(logs);
        
        res.json({ success: true, log });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ---------- LONGTERM ACTIVITIES ----------
const LONGTERM_FILE = 'content/longterm.json';

function loadLongTerm() {
    const data = readJson(LONGTERM_FILE, { activities: [] });
    return data.activities || [];
}

function saveLongTerm(activities) {
    writeJson(LONGTERM_FILE, { activities });
}

router.get('/longterm', (req, res) => {
    try {
        const activities = loadLongTerm();
        const now = new Date();
        const activeActivities = activities.filter(a => {
            if (!a.endDate) return true;
            return new Date(a.endDate) >= now;
        });
        res.json({ success: true, activities: activeActivities });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/longterm/all', (req, res) => {
    try {
        const activities = loadLongTerm();
        res.json({ success: true, total: activities.length, activities });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/longterm', (req, res) => {
    try {
        const { title, description, url, startDate, endDate, displayStart, displayEnd } = req.body;
        if (!title) return res.status(400).json({ error: 'title is required' });
        
        let sortDate = null;
        if (startDate) {
            sortDate = new Date(startDate).getTime();
        } else if (endDate) {
            sortDate = new Date(endDate).getTime() - 30 * 24 * 60 * 60 * 1000;
        }
        
        const activity = {
            id: Date.now().toString(),
            title: escapeHtml(title.trim()),
            description: description ? escapeHtml(description) : null,
            url: url || null,
            startDate: startDate || null,
            endDate: endDate || null,
            displayStart: displayStart || startDate || null,
            displayEnd: displayEnd || endDate || null,
            sortDate: sortDate,
            createdAt: new Date().toISOString()
        };
        
        const activities = loadLongTerm();
        activities.push(activity);
        saveLongTerm(activities);
        
        res.json({ success: true, activity });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/longterm/:id', (req, res) => {
    try {
        const activities = loadLongTerm();
        const index = activities.findIndex(a => a.id === req.params.id);
        
        if (index === -1) return res.status(404).json({ error: 'Activity not found' });
        
        const deleted = activities.splice(index, 1)[0];
        saveLongTerm(activities);
        
        res.json({ success: true, deleted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ---------- READ STATUS ----------
const READ_STATUS_FILE = path.join(__dirname, '..', 'data', 'read_status.json');

function loadReadStatus() {
    try {
        if (!fs.existsSync(READ_STATUS_FILE)) return {};
        return JSON.parse(fs.readFileSync(READ_STATUS_FILE, 'utf-8'));
    } catch (e) {
        return {};
    }
}

function saveReadStatus(data) {
    // Ensure dir exists
    const dir = path.dirname(READ_STATUS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(READ_STATUS_FILE, JSON.stringify(data, null, 2));
}

router.get('/read/:filekey', requireAuth, (req, res) => {
    try {
        const filekey = req.params.filekey;
        const readData = loadReadStatus();
        const readers = readData[filekey] || [];
        res.json({ filekey, readers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/read/:filekey', requireAuth, (req, res) => {
    try {
        const filekey = req.params.filekey;
        const login = req.user; // from requireAuth middleware
        
        const readData = loadReadStatus();
        if (!readData[filekey]) readData[filekey] = [];
        
        const existing = readData[filekey].findIndex(r => r.student_id === login.studentId);
        if (existing === -1) {
            readData[filekey].push({
                name: login.name,
                student_id: login.studentId,
                timestamp: new Date().toISOString()
            });
        }
        saveReadStatus(readData);
        res.json({ success: true, readers: readData[filekey] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ---------- LINKS ----------
const LINKS_FILE = 'links.json';

function loadLinks() {
    return readJson(LINKS_FILE, []);
}

router.get('/navi', (req, res) => {
    try {
        res.json(loadLinks());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ---------- EXPORT / IMPORT ----------
const DATA_FILE = 'content/data.json';

router.get('/export', (req, res) => {
    try {
        const data = readJson(DATA_FILE, { folders: [], files: [] });
        res.setHeader('Content-Disposition', 'attachment; filename=knowledge_base_backup.json');
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/import', (req, res) => {
    try {
        const { folders, files } = req.body;
        if (!folders || !files) return res.status(400).json({ error: 'Invalid format' });
        
        const { writeJson } = require('../utils/db');
        writeJson(DATA_FILE, { folders, files });
        res.json({ success: true, folders: folders.length, files: files.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

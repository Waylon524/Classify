const express = require('express');
const router = express.Router();
const { readJson, writeJson } = require('../utils/db');
const { requireAuth } = require('../middleware/auth');

const CONFIG = require('../config.json');
const ADMIN_USERS = CONFIG.admins || [];

function isAdmin(req, res, next) {
    if (!req.user) return res.status(401).json({ error: '未登录' });
    if (!ADMIN_USERS.includes(req.user.name)) {
        return res.status(403).json({ error: '无管理员权限' });
    }
    next();
}

// Check admin status
router.get('/check', requireAuth, (req, res) => {
    const ok = ADMIN_USERS.includes(req.user.name);
    res.json({ admin: ok, name: req.user.name });
});

// Bulk load all admin data
router.get('/data', requireAuth, isAdmin, (req, res) => {
    try {
        const schedules = readJson('content/schedules.json', { schedules: [] }).schedules || [];
        const longterm = readJson('content/longterm.json', { activities: [] }).activities || [];
        const notices = readJson('content/notices.json', null) || [];
        const votesConfig = readJson('content/votes.json', { votes: [] }).votes || [];
        const students = readJson('students_with_id.json', { students: [] }).students || [];
        const changelog = readJson('changelog.json', { logs: [] }).logs || [];
        const teams = readJson('teams.json', []) || [];

        res.json({
            success: true,
            schedules,
            longterm,
            notices: Array.isArray(notices) ? notices : (notices.notices || []),
            votes: votesConfig,
            students,
            changelog,
            teams
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update notices
router.put('/notices', requireAuth, isAdmin, (req, res) => {
    try {
        writeJson('content/notices.json', req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add student
router.post('/students', requireAuth, isAdmin, (req, res) => {
    try {
        const { name, student_id } = req.body;
        if (!name || !student_id) return res.status(400).json({ error: '姓名和学号必填' });

        const data = readJson('students_with_id.json', { students: [] });
        if (data.students.find(s => s.student_id === student_id)) {
            return res.status(400).json({ error: '学号已存在' });
        }
        data.students.push({ name: name.trim(), student_id: student_id.trim() });
        writeJson('students_with_id.json', data);
        res.json({ success: true, student: { name: name.trim(), student_id: student_id.trim() } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Remove student
router.delete('/students/:studentId', requireAuth, isAdmin, (req, res) => {
    try {
        const data = readJson('students_with_id.json', { students: [] });
        const before = data.students.length;
        data.students = data.students.filter(s => s.student_id !== req.params.studentId);
        if (data.students.length === before) return res.status(404).json({ error: '学生不存在' });
        writeJson('students_with_id.json', data);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Import students in bulk
router.post('/students/import', requireAuth, isAdmin, (req, res) => {
    try {
        const { students } = req.body;
        if (!Array.isArray(students)) return res.status(400).json({ error: '无效数据' });

        const data = readJson('students_with_id.json', { students: [] });
        const existing = new Set(data.students.map(s => s.student_id));
        let added = 0;
        for (const s of students) {
            if (s.student_id && s.name && !existing.has(s.student_id)) {
                data.students.push({ name: s.name.trim(), student_id: s.student_id.trim() });
                existing.add(s.student_id);
                added++;
            }
        }
        writeJson('students_with_id.json', data);
        res.json({ success: true, added, total: data.students.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { readJson, writeJson } = require('../utils/db');
const { requireAuth } = require('../middleware/auth');

const AUTH_FILE = 'auth_data.json';
const STUDENTS_FILE = 'students_with_id.json';

function loadAuth() {
    return readJson(AUTH_FILE, { devices: [], logins: [] });
}

function saveAuth(data) {
    writeJson(AUTH_FILE, data);
}

function loadStudents() {
    const data = readJson(STUDENTS_FILE, { students: [] });
    return data.students || [];
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Get device fingerprint
function getDeviceInfo(req) {
    return {
        userAgent: req.get('User-Agent') || '',
        acceptLanguage: req.get('Accept-Language') || '',
        ip: req.ip || req.connection.remoteAddress || '',
        fingerprint: req.get('Sec-Ch-Ua-Platform') || ''
    };
}

// IP-based rate limiting for login (prevent brute force)
const LOGIN_LIMIT = 10; // max 10 attempts per IP per 15 minutes
const LOGIN_WINDOW = 15 * 60 * 1000;
const loginAttempts = new Map();

function cleanupLoginAttempts() {
    const now = Date.now();
    for (const [ip, attempts] of loginAttempts) {
        const recent = attempts.filter(t => now - t < LOGIN_WINDOW);
        if (recent.length === 0) {
            loginAttempts.delete(ip);
        } else {
            loginAttempts.set(ip, recent);
        }
    }
}
setInterval(cleanupLoginAttempts, 5 * 60 * 1000);

// Login API
router.post('/login', (req, res) => {
    try {
        const { name, studentId } = req.body;

        if (!name || !studentId) {
            return res.status(400).json({ error: '姓名和学号必填' });
        }

        // Rate limit by IP
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        const attempts = loginAttempts.get(ip) || [];
        const recent = attempts.filter(t => now - t < LOGIN_WINDOW);
        if (recent.length >= LOGIN_LIMIT) {
            const retryAfter = Math.ceil((recent[0] + LOGIN_WINDOW - now) / 60000);
            return res.status(429).json({ error: `登录尝试过于频繁，请${retryAfter}分钟后重试` });
        }
        recent.push(now);
        loginAttempts.set(ip, recent);
        
        // Verify against student list
        const students = loadStudents();
        const student = students.find(s => s.name === name && s.student_id === studentId);
        
        if (!student) {
            return res.status(401).json({ error: '姓名或学号不正确' });
        }
        
        // Generate token
        const token = generateToken();
        const deviceInfo = getDeviceInfo(req);
        
        // Save auth data
        const auth = loadAuth();
        
        // Record login
        auth.logins.push({
            name,
            studentId,
            token,
            device: deviceInfo,
            loginTime: new Date().toISOString()
        });
        
        // Check if device is recognized
        const deviceKey = JSON.stringify({
            ua: deviceInfo.userAgent.slice(0, 50),
            platform: deviceInfo.fingerprint
        });
        
        // Save device (if not already saved)
        const existingDevice = auth.devices.find(d => 
            d.name === name && d.deviceKey === deviceKey
        );
        
        if (!existingDevice) {
            auth.devices.push({
                name,
                studentId,
                deviceKey,
                deviceInfo,
                lastLogin: new Date().toISOString(),
                token: token
            });
        } else {
            // Update existing device token
            existingDevice.lastLogin = new Date().toISOString();
            existingDevice.token = token;
        }
        
        saveAuth(auth);
        
        res.json({
            success: true,
            token,
            name,
            studentId
        });
        
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: '登录失败' });
    }
});

// Check login status
router.get('/check-login', (req, res) => {
    try {
        const authHeader = req.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const token = authHeader.slice(7);
        const auth = loadAuth();
        
        const login = auth.logins.find(l => l.token === token);
        if (!login) {
            return res.status(401).json({ error: 'token无效' });
        }
        
        res.json({
            success: true,
            name: login.name,
            studentId: login.studentId
        });
        
    } catch (err) {
        res.status(500).json({ error: '验证失败' });
    }
});

// Get user info (Protected)
router.get('/user', requireAuth, (req, res) => {
    try {
        const auth = loadAuth();
        const devices = auth.devices.filter(d => d.name === req.user.name);
        
        res.json({
            success: true,
            name: req.user.name,
            studentId: req.user.studentId,
            devices: devices.map(d => ({
                lastLogin: d.lastLogin,
                platform: d.deviceInfo.fingerprint || '未知设备',
                userAgent: d.deviceInfo.userAgent ? d.deviceInfo.userAgent.slice(0, 80) + '...' : '未知'
            }))
        });
        
    } catch (err) {
        res.status(500).json({ error: '获取用户信息失败' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    try {
        const authHeader = req.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            const auth = loadAuth();
            auth.logins = auth.logins.filter(l => l.token !== token);
            saveAuth(auth);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '登出失败' });
    }
});

// Check device (for auto-login)
router.get('/check-device', (req, res) => {
    try {
        const auth = loadAuth();
        const deviceInfo = getDeviceInfo(req);
        const deviceKey = JSON.stringify({
            ua: deviceInfo.userAgent.slice(0, 50),
            platform: deviceInfo.fingerprint
        });
        
        // Find matching device
        const device = auth.devices.find(d => d.deviceKey === deviceKey);
        
        if (device) {
            // Update this device's token in logins
            const login = auth.logins.find(l => 
                l.name === device.name && l.studentId === device.studentId
            );
            
            if (login) {
                return res.json({
                    success: true,
                    name: device.name,
                    studentId: device.studentId,
                    token: login.token
                });
            }
        }
        
        res.json({ success: false });
        
    } catch (err) {
        res.status(500).json({ error: '检查设备失败' });
    }
});

// Get student name list (for autocomplete, no auth required)
router.get('/students/names', (req, res) => {
    try {
        const students = loadStudents();
        const names = students.map(s => s.name).sort((a, b) => a.localeCompare(b, 'zh'));
        res.json({ success: true, names });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { readJson, writeJson } = require('../utils/db');

const RATE_LIMIT_FILE = 'rate_limit.json';
const RATE_LIMIT_MAX = 10;  // 10 requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;  // 1 hour in milliseconds

function loadRateLimits() {
    return readJson(RATE_LIMIT_FILE, { rate_limits: {} });
}

function saveRateLimits(data) {
    writeJson(RATE_LIMIT_FILE, data);
}

function getHourStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0).getTime();
}

// GET /api/rate-limit - Check rate limit status for current user
router.get('/', requireAuth, (req, res) => {
    try {
        const userId = req.user.studentId;
        const data = loadRateLimits();
        const userLimit = data.rate_limits[userId] || { count: 0, hour_start: 0 };
        const currentHourStart = getHourStart();
        
        // Reset if new hour
        if (userLimit.hour_start < currentHourStart) {
            userLimit.count = 0;
            userLimit.hour_start = currentHourStart;
        }
        
        const remaining = Math.max(0, RATE_LIMIT_MAX - userLimit.count);
        const isLimited = userLimit.count >= RATE_LIMIT_MAX;
        
        res.json({
            remaining,
            isLimited,
            max: RATE_LIMIT_MAX,
            resetAt: new Date(userLimit.hour_start + RATE_LIMIT_WINDOW).toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/rate-limit - Increment rate limit counter
router.post('/', requireAuth, (req, res) => {
    try {
        const userId = req.user.studentId;
        const data = loadRateLimits();
        const userLimit = data.rate_limits[userId] || { count: 0, hour_start: 0 };
        const currentHourStart = getHourStart();
        
        // Reset if new hour
        if (userLimit.hour_start < currentHourStart) {
            userLimit.count = 0;
            userLimit.hour_start = currentHourStart;
        }
        
        userLimit.count++;
        data.rate_limits[userId] = userLimit;
        saveRateLimits(data);
        
        const remaining = Math.max(0, RATE_LIMIT_MAX - userLimit.count);
        const isLimited = userLimit.count >= RATE_LIMIT_MAX;
        
        res.json({
            success: true,
            remaining,
            isLimited,
            max: RATE_LIMIT_MAX
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

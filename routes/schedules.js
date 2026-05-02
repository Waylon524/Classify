const express = require('express');
const router = express.Router();
const { readJson, writeJson, escapeHtml } = require('../utils/db');

const SCHEDULE_FILE = 'content/schedules.json';
const LONGTERM_FILE = 'content/longterm.json';

// Admin users loaded from config.json
const CONFIG = require('../config.json');
const ADMIN_USERS = CONFIG.admins || [];

function loadSchedules() {
    const data = readJson(SCHEDULE_FILE, { schedules: [] });
    return data.schedules || [];
}

function saveSchedules(schedules) {
    writeJson(SCHEDULE_FILE, { schedules });
}

function loadLongTerm() {
    const data = readJson(LONGTERM_FILE, { activities: [] });
    return data.activities || [];
}

function saveLongTerm(activities) {
    writeJson(LONGTERM_FILE, { activities });
}

// Cleanup expired schedules
function cleanupExpiredSchedules() {
    const now = new Date();
    const localOffset = 8 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const beijingNow = new Date(utc + (localOffset * 60000));
    
    // Clean up expired schedules (past dates, not within 15 days)
    let schedules = loadSchedules();
    const yesterday = new Date(beijingNow);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const parseBeijingDate = (dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d); // Creates date in local timezone
    };
    
    const beforeSchedules = schedules.length;
    schedules = schedules.filter(s => {
        const scheduleDate = parseBeijingDate(s.date);
        return scheduleDate >= yesterday; // Keep today and future
    });
    
    if (beforeSchedules !== schedules.length) {
        saveSchedules(schedules);
        console.log(`Cleaned up ${beforeSchedules - schedules.length} expired schedules`);
    }
    
    // Clean up expired long-term activities
    let activities = loadLongTerm();
    const beforeActivities = activities.length;
    activities = activities.filter(a => {
        if (!a.endDate) return true; // No end date = never expires
        return new Date(a.endDate) >= beijingNow;
    });
    if (beforeActivities !== activities.length) {
        saveLongTerm(activities);
        console.log(`Cleaned up ${beforeActivities - activities.length} expired long-term activities`);
    }
}

// Run cleanup asynchronously to avoid blocking server startup
setTimeout(cleanupExpiredSchedules, 1000);

// Get schedules for the next 15 days
router.get('/', async (req, res) => {
    try {
        const now = new Date();
        const localOffset = 8 * 60; // Beijing is UTC+8
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const beijingNow = new Date(utc + (localOffset * 60000));
        
        const startOfDay = new Date(beijingNow);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(beijingNow);
        endOfDay.setDate(endOfDay.getDate() + 14); // 15 days including today
        endOfDay.setHours(23, 59, 59, 999);
        
        const schedules = loadSchedules();
        
        const year = beijingNow.getFullYear();
        const month = String(beijingNow.getMonth() + 1).padStart(2, '0');
        const day = String(beijingNow.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        const endYear = endOfDay.getFullYear();
        const endMonth = String(endOfDay.getMonth() + 1).padStart(2, '0');
        const endDay = String(endOfDay.getDate()).padStart(2, '0');
        const endDateStr = `${endYear}-${endMonth}-${endDay}`;
        const activeSchedules = schedules.filter(s => {
            return s.date >= todayStr && s.date <= endDateStr;
        });
        
        // Sort by date, then by time (earliest first), all-day events at bottom
        activeSchedules.sort((a, b) => {
            // First sort by date
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA.getTime() !== dateB.getTime()) {
                return dateA.getTime() - dateB.getTime();
            }
            
            const getStartTimeStr = (s) => {
                if (s.startTime) return s.startTime.slice(11, 16);
                if (s.time) return s.time.split('-')[0];
                return null;
            };
            
            const getEndTimeStr = (s) => {
                if (s.endTime) return s.endTime.slice(11, 16);
                if (s.time && s.time.includes('-')) return s.time.split('-')[1];
                return null;
            };
            
            const timeToMin = (t) => {
                if (!t) return Infinity; // all-day events go to bottom
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
            };
            
            const startA = timeToMin(getStartTimeStr(a));
            const startB = timeToMin(getStartTimeStr(b));
            if (startA !== startB) return startA - startB;
            
            const endA = timeToMin(getEndTimeStr(a));
            const endB = timeToMin(getEndTimeStr(b));
            if (endA !== endB) return endA - endB;
            
            const createdA = new Date(a.createdAt || 0).getTime();
            const createdB = new Date(b.createdAt || 0).getTime();
            return createdA - createdB;
        });
        
        const formatDate = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        res.json({
            success: true,
            dateRange: {
                start: formatDate(startOfDay),
                end: formatDate(endOfDay),
                days: 15
            },
            schedules: activeSchedules
        });
    } catch (err) {
        console.error('Schedule error:', err);
        res.status(500).json({ error: err.message, schedules: [] });
    }
});

// Get all schedules (for admin/debugging)
router.get('/all', async (req, res) => {
    try {
        const schedules = loadSchedules();
        res.json({
            success: true,
            total: schedules.length,
            schedules: schedules
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new schedule
router.post('/', (req, res) => {
    try {
        const { title, date, time, location, description, source, articleUrl, organizer, startTime, endTime, maxParticipants } = req.body;
        
        // Validation for user-created activities (with organizer)
        if (organizer) {
            if (!title || title.length > 15) {
                return res.status(400).json({ error: '活动名称必填且不超过15字' });
            }
            if (description && description.length > 100) {
                return res.status(400).json({ error: '简介不超过100字' });
            }
            if (!startTime) {
                return res.status(400).json({ error: '开始时间必填' });
            }
            if (new Date(startTime) <= new Date()) {
                return res.status(400).json({ error: '开始时间不能选择过去的' });
            }
            // Validate end time
            if (endTime) {
                const startDate = startTime.slice(0, 10);
                const endDate = endTime.slice(0, 10);
                if (startDate !== endDate) {
                    return res.status(400).json({ error: '结束时间必须和开始时间在同一天' });
                }
                if (endTime <= startTime) {
                    return res.status(400).json({ error: '结束时间必须在开始时间之后' });
                }
            }
            if (!location) {
                return res.status(400).json({ error: '地点必填' });
            }
            
            // For user-created activities: derive date/time from startTime
            const dateParts = startTime.match(/^(\d{4})-(\d{2})-(\d{2})/);
            const dateStr = dateParts ? `${dateParts[1]}-${dateParts[2]}-${dateParts[3]}` : startTime.slice(0, 10);
            const timeStr = startTime.match(/T(\d{2}:\d{2})/)?.[1] || '00:00';
            let endTimeStr = null;
            if (endTime) {
                endTimeStr = endTime.match(/T(\d{2}:\d{2})/)?.[1] || null;
            }
            const displayTime = endTimeStr ? `${timeStr}-${endTimeStr}` : timeStr;
            
            const schedule = {
                id: Date.now().toString(),
                title: escapeHtml(title.trim()),
                date: dateStr,
                time: displayTime,
                location: escapeHtml(location.trim()),
                description: description ? escapeHtml(description.trim()) : null,
                source: 'user', // Mark as user-created
                articleUrl: null,
                organizer: escapeHtml(organizer.trim()),
                members: [escapeHtml(organizer.trim())], // Organizer is first member
                startTime: startTime,
                endTime: endTime || null,
                maxParticipants: maxParticipants || null,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            };
            
            const schedules = loadSchedules();
            schedules.push(schedule);
            saveSchedules(schedules);
            
            return res.json({ success: true, schedule });
        }
        
        // Legacy support for system-imported schedules
        if (!title || !date) {
            return res.status(400).json({ error: 'title and date are required' });
        }
        
        const schedule = {
            id: Date.now().toString(),
            title: escapeHtml(title.trim()),
            date: date,
            time: time || null,
            location: location ? escapeHtml(location) : null,
            description: description ? escapeHtml(description) : null,
            source: source || 'article',
            articleUrl: articleUrl || null,
            organizer: null,
            members: [],
            startTime: null,
            endTime: null,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        const schedules = loadSchedules();
        schedules.push(schedule);
        saveSchedules(schedules);
        
        res.json({ success: true, schedule });
    } catch (err) {
        console.error('Add schedule error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete a schedule (only organizer can delete, admin can delete any)
router.delete('/:id', (req, res) => {
    try {
        const { name } = req.query; // Get requester's name from query param
        const schedules = loadSchedules();
        const index = schedules.findIndex(s => s.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        
        const schedule = schedules[index];
        const isAdmin = name && ADMIN_USERS.includes(name);
        
        if (schedule.organizer) {
            if (isAdmin || (name && schedule.organizer === name)) {
                const deleted = schedules.splice(index, 1)[0];
                saveSchedules(schedules);
                return res.json({ success: true, deleted: deleted.title });
            } else if (name) {
                return res.status(403).json({ error: '只有发起人或管理员可删除此活动' });
            } else {
                return res.status(400).json({ error: '请提供你的姓名' });
            }
        }
        
        if (!isAdmin) {
            return res.status(403).json({ error: '系统日程只有管理员可删除' });
        }
        const deleted = schedules.splice(index, 1)[0];
        saveSchedules(schedules);
        
        res.json({ success: true, deleted: deleted.title });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a schedule
router.put('/:id', (req, res) => {
    try {
        const { name, title, description, startTime, endTime, location } = req.body;
        const schedules = loadSchedules();
        const index = schedules.findIndex(s => s.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        
        const schedule = schedules[index];
        const isAdmin = name && ADMIN_USERS.includes(name);
        
        if (!schedule.organizer) {
            if (!isAdmin) {
                return res.status(403).json({ error: '系统日程不可修改，管理员除外' });
            }
        } else if (!isAdmin && schedule.organizer !== name) {
            return res.status(403).json({ error: '只有发起人或管理员可修改此活动' });
        }
        
        if (!isAdmin) {
            if (!title || title.length > 20) return res.status(400).json({ error: '活动名称必填且不超过20字' });
            if (description && description.length > 200) return res.status(400).json({ error: '简介不超过200字' });
            if (!startTime) return res.status(400).json({ error: '开始时间必填' });
            if (new Date(startTime) <= new Date()) return res.status(400).json({ error: '开始时间不能选择过去的' });
            if (!location) return res.status(400).json({ error: '地点必填' });
        }
        
        const start = new Date(startTime);
        const dateStr = start.toISOString().slice(0, 10);
        const timeStr = start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
        let endTimeStr = null;
        if (endTime) {
            const end = new Date(endTime);
            endTimeStr = end.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        const displayTime = endTimeStr ? `${timeStr}-${endTimeStr}` : timeStr;
        
        schedules[index] = {
            ...schedule,
            title: escapeHtml(title.trim()),
            date: dateStr,
            time: displayTime,
            location: escapeHtml(location.trim()),
            description: description ? escapeHtml(description.trim()) : null,
            startTime: startTime,
            endTime: endTime || null
        };
        
        saveSchedules(schedules);
        res.json({ success: true, schedule: schedules[index] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Join a schedule
router.post('/:id/join', (req, res) => {
    try {
        const { name } = req.body;
        const { id } = req.params;
        
        if (!name) return res.status(400).json({ error: '姓名必填' });
        
        const schedules = loadSchedules();
        const schedule = schedules.find(s => s.id === id);
        
        if (!schedule) return res.status(404).json({ error: '日程不存在' });
        if (!schedule.members) schedule.members = [];
        if (schedule.members.includes(escapeHtml(name.trim()))) return res.status(400).json({ error: '你已经在队伍中了' });
        if (schedule.maxParticipants && schedule.members.length >= schedule.maxParticipants) return res.status(400).json({ error: '人数已满' });

        schedule.members.push(escapeHtml(name.trim()));
        saveSchedules(schedules);
        
        res.json({ success: true, members: schedule.members });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Leave a schedule
router.post('/:id/leave', (req, res) => {
    try {
        const { name } = req.body;
        const { id } = req.params;
        
        if (!name) return res.status(400).json({ error: '姓名必填' });
        
        const schedules = loadSchedules();
        const schedule = schedules.find(s => s.id === id);
        
        if (!schedule) return res.status(404).json({ error: '日程不存在' });
        if (!schedule.members) schedule.members = [];
        
        const idx = schedule.members.indexOf(escapeHtml(name.trim()));
        if (idx === -1) return res.status(400).json({ error: '你不在队伍中' });
        if (schedule.organizer === escapeHtml(name.trim())) return res.status(400).json({ error: '发起人不能退出，请删除日程' });
        
        schedule.members.splice(idx, 1);
        saveSchedules(schedules);
        
        res.json({ success: true, members: schedule.members });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

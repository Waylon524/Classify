// =============================================================================
// Classify 主服务器文件
// =============================================================================
//
// 【代码结构已重构】
// 路由逻辑已拆分至 /routes 目录下：
// - routes/folders.js   (API: /api/folders)
// - routes/files.js     (API: /api/files)
// - routes/schedules.js (API: /api/schedules)
// - routes/notices.js   (API: /api/notices)
// - routes/teams.js     (API: /api/teams)
// - routes/auth.js      (API: /api)  - /api/login, /api/user, etc.
// - routes/user.js      (API: /api)  - /api/navi/personal...
// - routes/votes.js     (API: /api/votes)
// - routes/rateLimit.js (API: /api/rate-limit)
// - routes/misc.js      (API: /api)  - /api/changelog, /api/longterm, /api/navi, etc.
//
// =============================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// 加载站点配置
const CONFIG = require('./config.json');

// Initialize necessary directories (auto-created for fresh deployments)
['data',
 'data/content',
 'data/content/files',
 'data/content/notices',
 'data/content/votes',
 'data/personal'
].forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

// 向客户端暴露配置（JS 格式）
app.get('/config.js', (req, res) => {
    res.type('application/javascript');
    res.send('window.__SITE_CONFIG__ = ' + JSON.stringify(CONFIG) + ';');
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Reduced from 100mb for security. File uploads use multer in routes/files.js
app.use(express.static(path.join(__dirname, "public")));

// 兼容本地测试与旧版本前端的静态资源路由
app.use('/files', express.static(path.join(__dirname, 'data', 'content', 'files')));
app.use('/notices', express.static(path.join(__dirname, 'data', 'content', 'notices')));
app.get('/api-data/memos.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'data', 'content', 'memos.json'));
});

// Route imports
const foldersRouter = require('./routes/folders');
const filesRouter = require('./routes/files');
const schedulesRouter = require('./routes/schedules');
const noticesRouter = require('./routes/notices');
const teamsRouter = require('./routes/teams');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const votesRouter = require('./routes/votes');
const rateLimitRouter = require('./routes/rateLimit');
const miscRouter = require('./routes/misc');
const adminRouter = require('./routes/admin');

// Map routes
app.use('/api/folders', foldersRouter);
app.use('/api/files', filesRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/notices', noticesRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/votes', votesRouter);
app.use('/api/rate-limit', rateLimitRouter);

// Flat routes that were mapped directly under /api/
app.use('/api', authRouter);
app.use('/api', userRouter);
app.use('/api', miscRouter);
app.use('/api/admin', adminRouter);

// ----------------------------------------------------
// ICS Subscriptions (kept here for simplicity as they map to root paths)
// ----------------------------------------------------
app.get('/api/subscribe.ics', (req, res) => {
    // Generate ICS logic from schedules
    try {
        const { readJson } = require('./utils/db');
        const schedules = readJson('content/schedules.json', { schedules: [] }).schedules || [];
        
        const VTIMEZONE_TEMPLATE = `
BEGIN:VTIMEZONE
TZID:Asia/Shanghai
X-LIC-LOCATION:Asia/Shanghai
BEGIN:STANDARD
TZOFFSETFROM:+0900
TZOFFSETTO:+0800
TZNAME:CST
DTSTART:19701001T020000
RRULE:FREQ=YEARLY;INTERVAL=1;BYMONTH=10;BYDAY=-1SU
END:STANDARD
BEGIN:DAYLIGHT
TZOFFSETFROM:+0800
TZOFFSETTO:+0900
TZNAME:CDT
DTSTART:19700401T020000
RRULE:FREQ=YEARLY;INTERVAL=1;BYMONTH=4;BYDAY=-1SU
END:DAYLIGHT
END:VTIMEZONE
`.trim();

        function escapeICSText(text) {
            if (!text) return '';
            return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\\n/g, '\\n').replace(/<[^>]*>/g, '');
        }

        function generateICSEvent(schedule) {
            const [year, month, day] = schedule.date.split('-');
            let hours = '00', minutes = '00', endHours = '23', endMinutes = '59';
            
            if (schedule.time) {
                if (schedule.time.includes('-')) {
                    const [start, end] = schedule.time.split('-');
                    [hours, minutes] = start.split(':');
                    [endHours, endMinutes] = end.split(':');
                } else {
                    [hours, minutes] = schedule.time.split(':');
                    endHours = String(parseInt(hours) + 1).padStart(2, '0');
                }
            }
            
            const start = `${year}${month}${day}T${hours}${minutes}00`;
            const end = `${year}${month}${day}T${endHours}${endMinutes}00`;
            const uid = schedule.id + '@' + CONFIG.site.domain;
            const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

            const lines = [
                'BEGIN:VEVENT',
                `DTSTART;TZID=Asia/Shanghai:${start}`,
                `DTEND;TZID=Asia/Shanghai:${end}`,
                `DTSTAMP:${dtstamp}`,
                `UID:${uid}`,
                `SUMMARY:${escapeICSText(schedule.title)}`
            ];

            if (schedule.description) lines.push(`DESCRIPTION:${escapeICSText(schedule.description)}`);
            if (schedule.location) lines.push(`LOCATION:${escapeICSText(schedule.location)}`);
            if (schedule.articleUrl) lines.push(`URL:${schedule.articleUrl}`);

            lines.push('END:VEVENT');
            return lines.join('\r\n');
        }

        const now = new Date();
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            `PRODID:${CONFIG.ics.productId}`,
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:${CONFIG.ics.calendarName}`,
            'X-WR-TIMEZONE:Asia/Shanghai',
        ];
        
        lines.push(VTIMEZONE_TEMPLATE);
        
        const sixtyDaysLater = new Date(now);
        sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 60);
        
        schedules.forEach(s => {
            const scheduleDate = new Date(s.date);
            if (scheduleDate >= now && scheduleDate <= sixtyDaysLater) {
                lines.push(generateICSEvent(s));
            }
        });
        
        lines.push('END:VCALENDAR');
        
        const icsContent = lines.join('\r\n');
        const buffer = Buffer.from(icsContent, 'utf-8');
        
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Content-Disposition', `attachment; filename="${CONFIG.ics.filename}"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Last-Modified', new Date().toUTCString());
        res.setHeader('ETag', '"' + buffer.toString('base64').slice(0, 32) + '"');
        res.setHeader('Accept-Ranges', 'none');
        
        res.send(buffer);
    } catch (err) {
        console.error('ICS generation error:', err);
        res.status(500).send('Error generating calendar');
    }
});

app.get('/' + CONFIG.ics.filename, (req, res) => res.redirect(302, '/api/subscribe.ics'));
app.get('/calendar/subscribe', (req, res) => res.redirect(302, '/api/subscribe.ics'));

// Start server
app.listen(PORT, () => {
    console.log(`Knowledge Base API running on port ${PORT}`);
});

const express = require('express');
const router = express.Router();
const { readJson } = require('../utils/db');

const NOTICES_FILE = 'content/notices.json';

function getDefaultNotices() {
    return [
        {
            id: 1,
            title: '欢迎使用 e 生君平台',
            content: '欢迎使用复旦大学生物技术强基计划一站式服务平台！\n\n本平台整合了 e 日程、e 文件、e 导航等多个实用工具，帮助您更好地规划学习和生活。\n\n如有疑问，请联系管理员。',
            date: '2026-04-01',
            source: '系统通知',
            unread: false
        },
        {
            id: 2,
            title: 'e 日程功能升级公告',
            content: 'e 日程功能已全新升级！\n\n新增功能：\n• 支持 iCalendar 订阅\n• 活动参与功能\n• 企业微信日历同步\n• 更多精彩功能陆续上线中...',
            date: '2026-04-15',
            source: '系统通知',
            unread: true
        }
    ];
}

function loadNotices() {
    const data = readJson(NOTICES_FILE, null);
    if (!data) return getDefaultNotices();
    return data;
}

router.get('/', (req, res) => {
    try {
        let notices = loadNotices();
        if (!Array.isArray(notices)) {
            // in case the root of notices.json is an object like { notices: [] }
            notices = notices.notices || getDefaultNotices();
        }
        // Sort: pinned first, then unread, then date descending
        notices.sort((a, b) => {
            if (a.pinned !== b.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
            if (a.unread !== b.unread) return b.unread - a.unread;
            return new Date(b.date) - new Date(a.date);
        });
        res.json(notices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

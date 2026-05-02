const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const { escapeHtml } = require('../utils/db');

const PERSONAL_DATA_DIR = path.join(__dirname, '..', 'data', 'personal');

// Ensure personal data directory exists
if (!fs.existsSync(PERSONAL_DATA_DIR)) {
    fs.mkdirSync(PERSONAL_DATA_DIR, { recursive: true });
}

// Default links
const DEFAULT_LINKS = [
    { id: "d1", name: "复旦大学", url: "https://www.fudan.edu.cn", icon: "🏛️", description: "复旦大学官方网站", isDefault: true },
    { id: "d2", name: "教务处", url: "https://jwc.fudan.edu.cn", icon: "📚", description: "复旦大学教务处", isDefault: true },
    { id: "d3", name: "选课系统", url: "https://xk.fudan.edu.cn", icon: "🎓", description: "本科生选课系统", isDefault: true },
    { id: "d4", name: "eLearning", url: "https://elearning.fudan.edu.cn", icon: "💻", description: "复旦大学在线学习平台", isDefault: true },
    { id: "d5", name: "教务管理系统", url: "https://fdjwgl.fudan.edu.cn/student/home", icon: "📋", description: "复旦教务管理系统", isDefault: true },
    { id: "d6", name: "超星学习平台", url: "https://i.mooc.chaoxing.com/space/index?ws=1", icon: "📱", description: "超星尔雅网络学习平台", isDefault: true },
    { id: "d7", name: "复旦 eHall", url: "https://ehall.fudan.edu.cn/pages/fusionH5Mh/site/home", icon: "🏢", description: "复旦一网通办移动端", isDefault: true },
    { id: "d8", name: "复旦总务", url: "https://workflow5.fudan.edu.cn/fe/site/m_themeServiceTALl?topic_id=18&platform_id=43", icon: "🏗️", description: "复旦总务服务平台", isDefault: true },
    { id: "d9", name: "生命科学学院", url: "https://life.fudan.edu.cn", icon: "🧬", description: "复旦大学生命科学学院", isDefault: true },
    { id: "d10", name: "哔哩哔哩", url: "https://www.bilibili.com", icon: "📺", description: "世界上最大的线上学习平台", isDefault: true },
    { id: "d11", name: "Web of Science", url: "https://www.webofscience.com", icon: "🔬", description: "学术文献检索平台", isDefault: true }
];

function isValidName(name) {
    if (!name || typeof name !== 'string') return false;
    // 只允许中文字符、英文字母、数字、空格、下划线
    return /^[一-鿿\w\s]{1,50}$/.test(name);
}

function getUserFile(studentId, name) {
    if (!/^\d{5,20}$/.test(studentId)) {
        throw new Error('无效的学号格式');
    }
    if (!isValidName(name)) {
        throw new Error('无效的姓名格式');
    }
    const userFolderName = `${studentId}_${name}`;
    return path.join(PERSONAL_DATA_DIR, `${userFolderName}.json`);
}

function readUserData(userFile) {
    if (fs.existsSync(userFile)) {
        return JSON.parse(fs.readFileSync(userFile, 'utf-8'));
    }
    return { links: DEFAULT_LINKS.map(l => ({...l})), selectedEngine: 'bing' };
}

function writeUserData(userFile, data) {
    fs.writeFileSync(userFile, JSON.stringify(data, null, 2));
}

// Get personal links for a user
router.get('/navi/personal', requireAuth, (req, res) => {
    try {
        const userFile = getUserFile(req.user.studentId, req.user.name);
        const data = readUserData(userFile);
        
        // If it's new, we need to write the default data back to make sure it exists
        if (!fs.existsSync(userFile)) {
            writeUserData(userFile, data);
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a personal link
router.post('/navi/personal', requireAuth, (req, res) => {
    try {
        const { name, url, description, icon } = req.body;
        if (!name || !url) {
            return res.status(400).json({ error: '名称和网址不能为空' });
        }
        
        const userFile = getUserFile(req.user.studentId, req.user.name);
        const data = readUserData(userFile);
        
        // Add new link
        const newLink = {
            id: Date.now().toString(),
            name: escapeHtml(name),
            url,
            description: description ? escapeHtml(description) : '',
            icon: icon || '🔗',
            createdAt: new Date().toISOString()
        };
        data.links.push(newLink);
        
        writeUserData(userFile, data);
        res.json(newLink);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a personal link
router.delete('/navi/personal/:id', requireAuth, (req, res) => {
    try {
        const userFile = getUserFile(req.user.studentId, req.user.name);
        if (fs.existsSync(userFile)) {
            let data = readUserData(userFile);
            data.links = data.links.filter(l => l.id !== req.params.id);
            writeUserData(userFile, data);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save/reorder personal links
router.put('/navi/personal/save', requireAuth, (req, res) => {
    try {
        const { links } = req.body;
        if (!Array.isArray(links)) {
            return res.status(400).json({ error: '无效的数据' });
        }
        
        const userFile = getUserFile(req.user.studentId, req.user.name);
        let data = readUserData(userFile);
        data.links = links;
        writeUserData(userFile, data);
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get selected search engine
router.get('/navi/personal/engine', requireAuth, (req, res) => {
    try {
        const userFile = getUserFile(req.user.studentId, req.user.name);
        const data = readUserData(userFile);
        res.json({ selectedEngine: data.selectedEngine || 'bing' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save selected search engine
router.put('/navi/personal/engine', requireAuth, (req, res) => {
    try {
        const userFile = getUserFile(req.user.studentId, req.user.name);
        let data = readUserData(userFile);
        data.selectedEngine = req.body.selectedEngine || 'bing';
        writeUserData(userFile, data);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

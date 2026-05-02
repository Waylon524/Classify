const { readJson } = require('../utils/db');

function requireAuth(req, res, next) {
    try {
        const authHeader = req.get('Authorization') || req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: '未登录或Token无效' });
        }
        
        const token = authHeader.slice(7);
        const auth = readJson('auth_data.json', { devices: [], logins: [] });
        
        const login = auth.logins.find(l => l.token === token);
        if (!login) {
            return res.status(401).json({ error: '无效的Token' });
        }
        
        // Attach user info to request
        req.user = {
            name: login.name,
            studentId: login.studentId,
            token: token
        };
        
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ error: '服务器验证失败' });
    }
}

module.exports = {
    requireAuth
};

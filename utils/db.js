const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 文件锁：保证同一文件的读写操作串行化，防止竞争条件
const locks = new Map();

function acquireLock(filename) {
    if (!locks.has(filename)) {
        locks.set(filename, Promise.resolve());
    }
    let release;
    const wait = new Promise(resolve => { release = resolve; });
    const prev = locks.get(filename);
    locks.set(filename, prev.then(() => new Promise(resolve => {
        release = resolve;
    })));
    return { wait: prev.then(() => {}), release };
}

/**
 * 原子化读-改-写操作，避免并发竞争
 * @param {string} filePath 文件路径 (相对于 data 目录的文件名，或绝对路径)
 * @param {function} modifier 接收当前数据，返回修改后的数据
 * @param {object} defaultData 文件不存在时的默认数据
 * @returns {Promise<object>} 修改后的数据
 */
async function withLock(filePath, modifier, defaultData = {}) {
    const { wait, release } = acquireLock(filePath);
    try {
        await wait;
        let data;
        if (path.isAbsolute(filePath)) {
            try {
                if (fs.existsSync(filePath)) {
                    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                } else {
                    fs.mkdirSync(path.dirname(filePath), { recursive: true });
                    data = defaultData;
                }
            } catch (e) {
                data = defaultData;
            }
        } else {
            data = readJson(filePath, defaultData);
        }
        const result = modifier(typeof data === 'object' && data !== null ? data : defaultData);
        if (path.isAbsolute(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
        } else {
            writeJson(filePath, result);
        }
        return result;
    } finally {
        release();
    }
}

/**
 * 读取 JSON 文件
 * @param {string} filename 文件名 (相对于 data 目录)
 * @param {object} defaultData 文件不存在时的默认数据
 * @returns {object}
 */
function readJson(filename, defaultData = {}) {
    const filePath = path.join(DATA_DIR, filename);
    try {
        if (!fs.existsSync(filePath)) {
            // 初始化文件
            fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading ${filename}:`, err.message);
        return defaultData;
    }
}

/**
 * 写入 JSON 文件
 * @param {string} filename 文件名 (相对于 data 目录)
 * @param {object} data 要写入的数据
 */
function writeJson(filename, data) {
    const filePath = path.join(DATA_DIR, filename);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`Error writing ${filename}:`, err.message);
    }
}

/**
 * HTML 转义，防止 XSS
 */
function escapeHtml(str) {
    if (!str || typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

module.exports = {
    readJson,
    writeJson,
    withLock,
    escapeHtml
};

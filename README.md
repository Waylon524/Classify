# Classify

一站式班级服务平台 —— 日程管理、知识库、导航、通知、投票、组队、AI 助手。

基于 **Node.js + Express 5** 构建，JSON 文件存储，开箱即用。

## 目录

- [功能模块](#功能模块)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [配置指南](#配置指南)
- [API 文档](#api-文档)
  - [认证](#认证)
  - [日程](#日程)
  - [文件](#文件)
  - [通知](#通知)
  - [表单 / 投票](#表单--投票)
  - [组队](#组队)
  - [导航 / 个人链接](#导航--个人链接)
  - [杂项](#杂项)
  - [频率限制](#频率限制)
- [部署指南](#部署指南)
- [运维脚本](#运维脚本)

## 功能模块

| 模块 | 页面 | 功能 |
|------|------|------|
| 🏠 首页 | `index.html` | 功能卡片导航，含日程/文件/表单数量统计 |
| 📅 日程 | `schedule.html` | 15天日历视图，活动 CRUD，加入/退出，iCalendar 订阅 |
| 📚 文件 | `files.html` | 文件夹管理，Markdown 知识库浏览，文件上传 |
| 💻 导航 | `navi.html` | 浏览器主页，搜索引擎切换，个人链接管理 |
| 📢 通知 | `notices.html` | 通知列表 + 学工备忘阅读与已读追踪 |
| 📋 表单 | `form.html` | 投票创建与管理，带并发锁防重复投票 |
| 👥 组队 | `vote.html` | 活动组队，加入/退出队伍 |
| 🤖 AI 助手 | `aichat.html` | AI 对话，带频率限制 |
| 🔑 登录 | `login.html` | 姓名+学号登录，设备记忆自动登录 |

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/Waylon524/Classify.git
cd Classify

# 2. 安装依赖
npm install

# 3. 修改配置（可选）
# 编辑 config.json，设置站点名称、管理员列表等

# 4. 启动
node server.js

# 访问 http://localhost:3000
```

首次启动会自动创建 `data/` 目录结构。导入学生名单后即可登录使用。

## 项目结构

```
Classify/
├── server.js              # Express 主入口（端口 3000）
├── config.json            # 站点配置（名称、栏目、管理员等）
├── package.json
├── public/                # 前端静态文件
│   ├── index.html         # 首页
│   ├── schedule.html      # 日程
│   ├── files.html         # 文件
│   ├── navi.html          # 导航
│   ├── notices.html       # 通知
│   ├── form.html          # 表单
│   ├── vote.html          # 组队
│   ├── memo.html          # 学工备忘
│   ├── aichat.html        # AI 助手
│   ├── login.html         # 登录
│   ├── upload.html        # 文件上传
│   ├── add-schedule.html  # 新建活动
│   ├── common.css         # 公共样式
│   ├── config-init.js     # 配置自动注入
│   ├── auth-check.js      # 统一登录验证
│   └── theme.js           # 主题切换
├── routes/                # API 路由
│   ├── auth.js            # 登录 / Token / 设备管理
│   ├── schedules.js       # 日程 CRUD
│   ├── files.js           # 文件上传与管理
│   ├── folders.js         # 文件夹管理
│   ├── notices.js         # 通知列表
│   ├── votes.js           # 投票系统
│   ├── teams.js           # 组队系统
│   ├── user.js            # 个人导航链接
│   ├── misc.js            # 更新日志 / 长期活动 / 导入导出
│   └── rateLimit.js       # AI 对话频率限制
├── middleware/
│   └── auth.js            # Bearer Token 认证中间件
├── utils/
│   └── db.js              # JSON 文件读写 / HTML 转义 / 并发锁
├── scripts/               # 运维脚本（部署/备份/同步）
└── tools/                 # Python 工具
```

## 配置指南

编辑 `config.json` 即可自定义整个站点：

```json
{
  "site": {
    "name": "Classify",            // 站点英文名
    "nameCN": "班级服务",           // 站点中文名
    "logo": "🏫",                   // Logo emoji
    "domain": "example.com",       // 域名（用于 ICS 生成）
    "heroBadge": "学校 · 班级",
    "heroTitle": "Classify",
    "heroSubtitle": "一站式班级服务平台"
  },
  "sections": {
    "schedule": { "name": "日程", "icon": "📅", "page": "/schedule.html" },
    "files":    { "name": "文件", "icon": "📚", "page": "/files.html" },
    // ... 更多栏目，可自由增删
  },
  "admins": ["管理员姓名"],           // 日程/文件管理员
  "ics": {
    "productId": "-//Classify//Schedule//CN",
    "calendarName": "班级日程",
    "filename": "schedule.ics"
  }
}
```

- **修改后重启服务器即可生效**，前后端自动同步
- `admins` 中填写管理员的**姓名**（需与学生名单一致）
- 客户端页面通过 `window.__SITE_CONFIG__` 访问配置

## API 文档

所有 API 以 `/api` 为前缀。除登录外，大部分接口需要 Bearer Token 认证。

### 认证

#### POST /api/login

登录并获取 Token。

```
Content-Type: application/json

{
  "name": "张三",
  "studentId": "20240001"
}
```

成功响应：
```json
{
  "success": true,
  "token": "a1b2c3...",
  "name": "张三",
  "studentId": "20240001"
}
```

失败响应：
```json
{ "error": "姓名或学号不正确" }
```

> 限制：同一 IP 15 分钟内最多 10 次尝试，超过返回 429。

#### GET /api/check-login

验证 Token 是否有效。

```
Authorization: Bearer <token>
```

成功响应：
```json
{ "success": true, "name": "张三", "studentId": "20240001" }
```

失败响应：`401 { "error": "token无效" }`

#### GET /api/check-device

根据设备指纹尝试自动登录（无需 Token）。返回匹配的设备信息或 `{ "success": false }`。

#### GET /api/user

获取当前用户信息及登录设备列表。

```
Authorization: Bearer <token>
```

响应：
```json
{
  "success": true,
  "name": "张三",
  "studentId": "20240001",
  "devices": [
    { "lastLogin": "2026-05-01T...", "platform": "Windows", "userAgent": "..." }
  ]
}
```

#### POST /api/logout

登出，清除服务端 Token。

#### GET /api/students/names

获取全部学生姓名列表（按拼音排序），用于前端自动补全。

响应：
```json
{ "success": true, "names": ["张三", "李四", "王五", ...] }
```

---

### 日程

#### GET /api/schedules

获取未来 15 天的日程列表。

响应：
```json
{
  "success": true,
  "dateRange": { "start": "2026-05-02", "end": "2026-05-16", "days": 15 },
  "schedules": [
    {
      "id": "1234567890",
      "title": "班会",
      "date": "2026-05-05",
      "time": "14:00-15:00",
      "location": "教室 A101",
      "description": "五月班会",
      "source": "user",
      "organizer": "张三",
      "members": ["张三", "李四"],
      "maxParticipants": 30,
      "startTime": "2026-05-05T14:00:00.000Z",
      "endTime": "2026-05-05T15:00:00.000Z",
      "createdAt": "2026-05-02T..."
    }
  ]
}
```

排序规则：日期 → 开始时间 → 结束时间 → 创建时间，全天活动排在最后。

#### GET /api/schedules/all

获取全部日程（含历史）。

#### POST /api/schedules

创建新活动。

```json
{
  "title": "学习小组",           // 必填，≤15字
  "startTime": "2026-05-10T14:00", // 必填，不能是过去
  "endTime": "2026-05-10T16:00",   // 可选，需与 startTime 同天
  "location": "图书馆",           // 必填
  "description": "一起复习",      // 可选，≤100字
  "maxParticipants": 10,         // 可选
  "organizer": "张三"            // 必填
}
```

> 系统导入的日程（source=article）可省略 organizer，走旧格式。

#### PUT /api/schedules/:id

修改活动（发起人或管理员）。

```json
{
  "name": "张三",        // 操作者姓名（用于权限校验）
  "title": "更新标题",    // ≤20字
  "startTime": "2026-05-10T14:00",
  "endTime": "2026-05-10T16:00",
  "location": "新地点",
  "description": "新描述"  // ≤200字
}
```

#### DELETE /api/schedules/:id?name=张三

删除活动。用户只能删除自己发起的，管理员可删除任意活动。

#### POST /api/schedules/:id/join

加入活动。

```json
{ "name": "李四" }
```

- 已在队伍中 → 400
- 人数已满 → 400

#### POST /api/schedules/:id/leave

退出活动。

```json
{ "name": "李四" }
```

- 发起人不能退出 → 400

#### GET /api/subscribe.ics

生成 iCalendar 订阅文件（未来 60 天），可导入系统日历 App。

---

### 文件

#### GET /api/folders

获取全部文件夹。

#### POST /api/folders

创建文件夹。

```json
{ "name": "课程笔记", "parentId": null }
```

#### DELETE /api/folders/:id

递归删除文件夹及其所有子文件夹和文件。

#### GET /api/files?parentId=<id>

获取文件列表。不传 `parentId` 返回全部文件。

#### GET /api/files/:id

获取单个文件详情（含内容）。

#### POST /api/files

创建文本文件。

```json
{
  "name": "笔记.md",
  "content": "# 标题\n内容...",
  "parentId": "folder_id"
}
```

#### POST /api/files/upload

上传文件（multipart/form-data）。文件保存到 `data/content/files/`。

#### DELETE /api/files/:id

删除文件。

#### GET /api/files/fudan/all

获取 `复旦文件` 目录下所有 Markdown 文件的内容摘要（每文件限 10KB）。

#### GET /api/files/:id/styles

提取 DOCX 文件的字体样式（调用 Python 脚本）。

---

### 通知

#### GET /api/notices

获取通知列表。排序：置顶优先 → 未读优先 → 日期倒序。

---

### 表单 / 投票

#### GET /api/votes

获取投票列表（不含候选人详情）。

```json
[{
  "id": "vote_001",
  "title": "五月评优",
  "description": "...",
  "deadline": "2026-05-10T...",
  "type": "vote",
  "maxVotes": 5,
  "candidateCount": 10
}]
```

#### GET /api/votes/:id

获取投票详情及候选人列表。

#### GET /api/votes/:id/candidate/:candidateId

获取单个候选人详细信息。

#### GET /api/votes/:id/check/:studentId

检查某学生是否已投票。

```json
{ "hasVoted": false }
// 或
{ "hasVoted": true, "submission": { "voterName": "张三", ... } }
```

#### GET /api/votes/voted/:studentId

查询某学生在所有投票中的已投记录。

#### POST /api/votes/:id/submit

提交投票（带并发锁，防止重复投票）。

```json
{
  "voterName": "张三",
  "voterStudentId": "20240001",
  "selectedCandidates": ["cand_1", "cand_2"]
}
```

验证：仅限截止前、选择数须等于 `maxVotes`、候选人 ID 须有效、不可重复投票。

---

### 组队

#### GET /api/teams

获取队伍列表（按创建时间倒序）。

#### POST /api/teams

创建队伍。

```json
{
  "activityName": "数学建模比赛",   // 必填，≤20字
  "description": "参加校赛",       // 必填，≤200字
  "eventTime": "2026-06-01T09:00", // 必填，不能是过去
  "location": "线上",              // 必填
  "organizer": "张三"              // 必填
}
```

创建者自动加入队伍。

#### POST /api/teams/:id/join

加入队伍。

```json
{ "name": "李四" }
```

---

### 导航 / 个人链接

所有接口需要认证。

#### GET /api/navi

获取系统级导航链接列表。

#### GET /api/navi/personal

获取当前用户的个人链接列表。

```json
{
  "links": [
    {
      "id": "d1",
      "name": "学校官网",
      "url": "https://www.example.edu.cn",
      "icon": "🏛️",
      "description": "学校官方网站",
      "isDefault": true
    }
  ],
  "selectedEngine": "bing"
}
```

#### POST /api/navi/personal

添加个人链接。

```json
{ "name": "GitHub", "url": "https://github.com", "description": "代码托管", "icon": "🐱" }
```

#### DELETE /api/navi/personal/:id

删除个人链接。

#### PUT /api/navi/personal/save

批量保存/排序链接。

```json
{ "links": [...] }
```

#### GET /api/navi/personal/engine

获取当前用户的默认搜索引擎。

#### PUT /api/navi/personal/engine

保存默认搜索引擎。

```json
{ "selectedEngine": "google" }
```

---

### 杂项

#### GET /api/changelog

获取更新日志列表（按日期倒序）。

#### POST /api/changelog

添加更新日志。

```json
{ "date": "2026-05-01", "version": "v1.2.0", "content": "更新内容..." }
```

#### GET /api/longterm

获取未过期的长期活动。

#### GET /api/longterm/all

获取全部长期活动。

#### POST /api/longterm

添加长期活动。

```json
{
  "title": "期末考试",
  "description": "...",
  "url": "https://...",
  "startDate": "2026-06-20",
  "endDate": "2026-06-30"
}
```

#### DELETE /api/longterm/:id

删除长期活动。

#### GET /api/read/:filekey

获取学工备忘的已读用户列表。

#### POST /api/read/:filekey

标记当前用户已读（需认证）。

#### GET /api/export

导出知识库完整数据（含文件夹和文件内容）。

#### POST /api/import

导入知识库数据。

```json
{ "folders": [...], "files": [...] }
```

---

### 频率限制

用于 AI 对话的频率控制。

#### GET /api/rate-limit

查询当前用户剩余调用次数。

```json
{ "remaining": 8, "isLimited": false, "max": 10 }
```

#### POST /api/rate-limit

消耗一次调用额度。

## 部署指南

### 使用 Nginx + PM2（推荐）

```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 启动服务
pm2 start server.js --name classify

# 3. Nginx 配置 /etc/nginx/sites-enabled/classify
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/classify/public;

    location / {
        try_files $uri $uri/ @node;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location @node {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

```bash
# 4. 重启 Nginx
nginx -s reload

# 5. 保存 PM2 进程（开机自启）
pm2 save
pm2 startup
```

### 首次部署数据准备

```bash
# 将学生名单（JSON 格式）放入 data/
# 文件格式：{ "students": [{ "name": "张三", "student_id": "20240001" }, ...] }
cp students_with_id.json data/

# 重启服务
pm2 restart classify
```

## 运维脚本

| 脚本 | 用途 |
|------|------|
| `scripts/start.sh` | 启动 Node.js 服务 |
| `scripts/deploy.sh` | 部署（备份 + 重启 PM2） |
| `scripts/backup.sh` | 备份网站源码 + 同步知识库 |
| `scripts/schedule_sync.sh` | 每天 0 点：清理过期日程 + 生成静态 .ics |
| `scripts/changelog_sync.sh` | 每天 0 点：自动添加更新日志 |
| `scripts/efile_upload_sync.sh` | 从 `/root/efile/` 同步文件到知识库 |

## License

MIT

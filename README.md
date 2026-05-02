<!-- omit in toc -->
# Classify

一站式班级服务平台 — 日程管理、知识库、导航、通知、投票、组队、AI 助手。

![screenshot](https://img.shields.io/badge/Node.js-18+-green) ![screenshot](https://img.shields.io/badge/Express-5.2-blue) ![license](https://img.shields.io/badge/license-MIT-orange)

基于 **Node.js + Express 5** 构建，JSON 文件存储，零数据库依赖，开箱即用。

## 目录

- [功能模块](#功能模块)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [配置指南](#配置指南)
- [数据准备](#数据准备)
- [管理员后台](#管理员后台)
- [API 文档](#api-文档)
- [AI 助手配置](#ai-助手配置)
- [部署指南](#部署指南)
- [运维脚本](#运维脚本)
- [技术栈](#技术栈)

## 功能模块

| 页面 | 路径 | 功能描述 |
|------|------|---------|
| 首页 | `/` | 5 卡片导航（日程/文件/导航/通知/表单），实时统计数量 |
| 日程 | `/schedule.html` | 15 天视图，活动 CRUD，加入/退出，iCalendar 订阅 |
| 文件 | `/files.html` | 文件夹管理，Markdown 知识库浏览，文件上传 |
| 导航 | `/navi.html` | 浏览器主页，多搜索引擎切换，个人链接管理 |
| 通知 | `/notices.html` | 通知列表 + 备忘侧栏，已读追踪 |
| 表单 | `/form.html` | 投票系统，候选人详情查看，并发锁防重复投票 |
| 组队 | `/vote.html` | 活动组队，加入/退出队伍 |
| AI 助手 | `/aichat.html` | 流式 AI 对话，上下文感知，频率限制 |
| 备忘 | `/memo.html` | Markdown 阅读 + 已读确认（倒计时机制） |
| 登录 | `/login.html` | 姓名+学号登录，设备指纹自动登录 |
| 管理后台 | `/admin.html` | 日程/人员/通知/表单/日志管理 |

## 快速开始

```bash
git clone https://github.com/Waylon524/Classify.git
cd Classify
npm install
node server.js
```

访问 `http://localhost:3000`。首次启动自动创建 `data/` 目录。

> **最小配置**：编辑 `config.json` → 导入学生名单 → 重启服务器即可登录使用。

## 项目结构

```
Classify/
├── server.js              # Express 入口（端口 3000）
├── config.json            # 站点配置（名称/栏目/管理员/AI）
├── package.json
│
├── public/                # 前端（纯 HTML/CSS/JS，无框架）
│   ├── index.html         # 首页
│   ├── schedule.html      # 日程
│   ├── files.html         # 文件
│   ├── form.html          # 表单
│   ├── vote.html          # 组队
│   ├── navi.html          # 导航
│   ├── notices.html       # 通知
│   ├── memo.html          # 备忘
│   ├── aichat.html        # AI 助手
│   ├── login.html         # 登录
│   ├── admin.html         # 管理后台
│   ├── upload.html        # 文件上传
│   ├── add-schedule.html  # 新建活动
│   ├── common.css         # 全局样式（Design Token 体系）
│   ├── theme-light.css    # 深色模式覆盖
│   ├── config-init.js     # 配置自动注入
│   ├── auth-check.js      # 统一登录验证
│   └── theme.js           # 深浅色切换
│
├── routes/                # API 路由（10 模块）
│   ├── auth.js            # 登录 / Token / 设备管理
│   ├── schedules.js       # 日程 CRUD + 加入/退出
│   ├── files.js           # 文件上传与管理
│   ├── folders.js         # 文件夹管理
│   ├── notices.js         # 通知
│   ├── votes.js           # 投票（含并发锁）
│   ├── teams.js           # 组队
│   ├── user.js            # 个人导航链接
│   ├── misc.js            # 更新日志/长期活动/导入导出
│   ├── admin.js           # 管理员 API
│   └── rateLimit.js       # AI 频率限制
│
├── middleware/auth.js      # Bearer Token 认证
├── utils/db.js            # JSON 读写 / HTML 转义 / 并发锁
├── scripts/               # 部署/备份/同步脚本
├── tools/                 # Python 工具（DOCX 样式提取）
└── data/                  # 运行时数据（.gitignore 排除）
```

## 配置指南

所有配置集中于 `config.json`，修改后重启服务器生效。前端通过 `/config.js` 动态获取。

### 站点信息

```json
{
  "site": {
    "name": "Classify",              // 英文名
    "nameCN": "班级服务",             // 中文名
    "logo": "🏫",                     // Logo emoji
    "domain": "example.com",         // 域名（ICS 日历用）
    "heroBadge": "一站式班级服务平台",
    "heroTitle": "Classify",
    "heroSubtitle": "日程 · 文件 · 导航 · 通知 · 表单",
    "footer": "Classify",
    "icp": "",                       // 备案号（为空不显示）
    "icpUrl": "https://beian.miit.gov.cn"
  }
}
```

### 栏目配置

```json
{
  "sections": {
    "schedule": { "name": "日程", "icon": "📅", "page": "/schedule.html", "desc": "班级日程与活动管理" },
    "files":    { "name": "文件", "icon": "📚", "page": "/files.html",    "desc": "知识库与文件共享" },
    "navi":     { "name": "导航", "icon": "💻", "page": "/navi.html",     "desc": "常用网站一站式导航" }
    // ... 可自由增删
  }
}
```

修改 `name`、`icon` 即可自定义栏目名称和图标，前端自动同步。

### 管理员

```json
{
  "admins": ["姓名1", "姓名2"]
}
```

姓名须与学生名单一致。管理员可访问 `/admin.html`。

### ICS 日历

```json
{
  "ics": {
    "productId": "-//Classify//Schedule//CN",
    "calendarName": "班级日程",
    "filename": "schedule.ics"
  }
}
```

## 数据准备

所有数据存储在 `data/` 目录，服务器首次访问时自动创建空文件。

### 1. 导入学生名单

将 `students_with_id.json` 放入 `data/` 目录：

```json
{
  "students": [
    { "name": "张三", "student_id": "20240001" },
    { "name": "李四", "student_id": "20240002" }
  ]
}
```

也可通过管理后台 → 人员标签批量导入（格式：`姓名,学号` 每行一条）。

### 2. 数据文件速查

| 文件 | 说明 | 管理员后台 |
|------|------|-----------|
| `data/students_with_id.json` | 学生名单 | 添加/删除/批量导入 |
| `data/content/schedules.json` | 日程活动 | 添加/编辑/删除 |
| `data/content/longterm.json` | 长期活动 | 通过 API |
| `data/content/notices.json` | 通知 | 添加/置顶/删除 |
| `data/content/votes.json` | 投票配置 | 查看（编辑 JSON 文件） |
| `data/content/memos.json` | 学工备忘 | 通过 API |
| `data/changelog.json` | 更新日志 | 添加 |

### 3. 日程数据格式

```json
{
  "schedules": [{
    "id": "1712345678000",
    "title": "开班会",
    "date": "2026-05-10",
    "time": "14:00-15:00",
    "location": "A101 教室",
    "description": "讨论班级事务",
    "source": "user",
    "organizer": "张三",
    "members": ["张三"],
    "maxParticipants": 30
  }]
}
```

### 4. 投票数据格式

```json
{
  "votes": [{
    "id": "vote_001",
    "title": "五月评优",
    "description": "每人最多投 5 票",
    "deadline": "2026-05-15T23:59:59.000Z",
    "type": "vote",
    "maxVotes": 5,
    "candidates": [{
      "id": "cand_1",
      "name": "候选人 A",
      "studentId": "20240001",
      "details": { "简介": "品学兼优" }
    }]
  }]
}
```

## 管理员后台

访问 `/admin.html`，提供：

| 标签 | 功能 |
|------|------|
| 📅 日程 | 添加 / 编辑 / 删除活动 |
| 👥 人员 | 搜索 / 单个添加 / 批量导入 / 删除学生 |
| 📢 通知 | 添加 / 置顶 / 删除通知 |
| 📋 表单 | 查看投票状态，通过 JSON 配置 |
| 📝 日志 | 添加版本更新记录 |

顶部 4 张统计卡片实时显示数据总量。

## API 文档

全部接口以 `/api` 为前缀。认证使用 `Authorization: Bearer <token>` 头。

### 认证

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/login` | - | `{ name, studentId }` 登录，返回 token。IP 限速 10次/15分钟 |
| GET | `/api/check-login` | Token | 验证 token 有效性 |
| GET | `/api/check-device` | - | 设备指纹自动登录 |
| GET | `/api/user` | Token | 用户信息 + 登录设备列表 |
| POST | `/api/logout` | Token | 登出 |
| GET | `/api/students/names` | - | 学生姓名列表（拼音排序） |

### 日程

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/schedules` | 未来 15 天日程，按日期/时间排序 |
| GET | `/api/schedules/all` | 全部日程 |
| POST | `/api/schedules` | 创建活动 |
| PUT | `/api/schedules/:id` | 修改（发起人或管理员） |
| DELETE | `/api/schedules/:id?name=...` | 删除（发起人或管理员） |
| POST | `/api/schedules/:id/join` | `{ name }` 加入 |
| POST | `/api/schedules/:id/leave` | `{ name }` 退出 |
| GET | `/api/subscribe.ics` | iCalendar 订阅（60 天范围） |

**创建活动请求体**：

```json
{
  "title": "学习小组", "date": "2026-05-10",
  "time": "14:00-15:00", "location": "图书馆",
  "description": "一起复习", "organizer": "张三",
  "startTime": "2026-05-10T06:00:00.000Z",
  "endTime": "2026-05-10T08:00:00.000Z",
  "maxParticipants": 10
}
```

### 文件

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/folders` | 文件夹列表 |
| POST | `/api/folders` | `{ name, parentId }` 创建 |
| DELETE | `/api/folders/:id` | 递归删除 |
| GET | `/api/files?parentId=...` | 文件列表 |
| GET | `/api/files/:id` | 文件详情 |
| POST | `/api/files` | `{ name, content, parentId }` 创建 |
| POST | `/api/files/upload` | multipart 上传 |
| DELETE | `/api/files/:id` | 删除 |
| GET | `/api/export` | 导出知识库 |
| POST | `/api/import` | `{ folders, files }` 导入 |

### 通知

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notices` | 列表（置顶 → 未读 → 日期倒序） |

### 表单

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/votes` | 投票列表（不含候选人详情） |
| GET | `/api/votes/:id` | 投票详情 + 候选人 |
| GET | `/api/votes/:id/candidate/:cid` | 候选人详情 |
| GET | `/api/votes/:id/check/:studentId` | 是否已投票 |
| GET | `/api/votes/voted/:studentId` | 已投票列表 |
| POST | `/api/votes/:id/submit` | 提交投票（并发锁防重复） |

### 组队

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/teams` | 队伍列表 |
| POST | `/api/teams` | `{ activityName, description, eventTime, location, organizer }` |
| POST | `/api/teams/:id/join` | `{ name }` 加入 |

### 导航

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/navi` | - | 系统导航链接 |
| GET | `/api/navi/personal` | Token | 个人链接 |
| POST | `/api/navi/personal` | Token | `{ name, url, icon, description }` |
| DELETE | `/api/navi/personal/:id` | Token | 删除链接 |
| PUT | `/api/navi/personal/save` | Token | `{ links }` 批量保存 |
| GET/PUT | `/api/navi/personal/engine` | Token | `{ selectedEngine }` |

### 杂项

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/changelog` | 更新日志 |
| GET/POST | `/api/longterm` | 长期活动 |
| DELETE | `/api/longterm/:id` | 删除 |
| GET/POST | `/api/read/:filekey` | 阅读状态 |

### 管理员

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/check` | 是否管理员 |
| GET | `/api/admin/data` | 全部管理数据 |
| PUT | `/api/admin/notices` | 更新通知 |
| POST | `/api/admin/students` | 添加学生 |
| DELETE | `/api/admin/students/:id` | 删除学生 |
| POST | `/api/admin/students/import` | `{ students }` 批量导入 |

### 频率限制

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/rate-limit` | AI 调用配额（10次/小时） |

## AI 助手配置

支持 OpenAI 兼容 API（DeepSeek / OpenAI / Ollama 等）。

```json
{
  "aiConfig": {
    "provider": "deepseek",
    "baseUrl": "https://api.deepseek.com",
    "apiKey": "sk-your-key",
    "model": "deepseek-chat"
  }
}
```

| 提供商 | baseUrl | model 示例 |
|--------|---------|-----------|
| DeepSeek | `https://api.deepseek.com` | `deepseek-chat` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| Ollama | `http://localhost:11434/v1` | `qwen2.5:7b` |

> `apiKey` 会暴露给浏览器端。公开部署建议用后端代理转发请求。

## 部署指南

```bash
npm install -g pm2
pm2 start server.js --name classify
pm2 save && pm2 startup
```

Nginx 配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/classify/public;

    location / { try_files $uri $uri/ @node; }
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location @node { proxy_pass http://127.0.0.1:3000; }
}
```

## 运维脚本

| 脚本 | 用途 |
|------|------|
| `start.sh` | 启动服务 |
| `deploy.sh` | 部署（备份 + 重启） |
| `backup.sh` | 备份源码 + 同步知识库 |
| `schedule_sync.sh` | 每天 0 点清理过期日程 + 生成 .ics |
| `changelog_sync.sh` | 每天 0 点自动添加更新日志 |
| `efile_upload_sync.sh` | 从 `/root/efile/` 同步到知识库 |

## 技术栈

- **后端**：Node.js + Express 5
- **存储**：JSON 文件（读写锁 + 原子操作）
- **前端**：原生 HTML/CSS/JS（零框架依赖）
- **设计**：Cream canvas + Coral accent + Serif display（DESIGN.md）
- **认证**：crypto.randomBytes Token + Bearer 中间件
- **安全**：HTML 转义防 XSS、文件锁防竞争、登录限速防暴力破解

## License

MIT © [Waylon524](https://github.com/Waylon524)

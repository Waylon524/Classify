# Classify

一站式班级服务平台 —— 日程管理、知识库、导航、通知、投票、组队、AI 助手。

基于 **Node.js + Express 5** 构建，JSON 文件存储，开箱即用。

## 目录

- [快速开始](#快速开始)
- [配置指南](#配置指南)
- [数据导入指南](#数据导入指南)
- [管理员后台](#管理员后台)
- [AI 助手配置](#ai-助手配置)
- [项目结构](#项目结构)
- [API 文档](#api-文档)
- [部署指南](#部署指南)
- [运维脚本](#运维脚本)

## 快速开始

```bash
git clone https://github.com/Waylon524/Classify.git
cd Classify
npm install
node server.js
# 访问 http://localhost:3000
```

首次启动自动创建 `data/` 目录。按以下顺序完成配置：

1. [配置站点信息](#配置指南) — 修改 `config.json`
2. [导入学生名单](#1-导入学生名单) — 让同学可以登录
3. [指定管理员](#2-指定管理员) — 赋予管理权限
4. [导入内容数据](#3-导入日程活动通知表单) — 填充网站内容
5. [配置 AI 助手](#ai-助手配置) — 启用 AI 对话

---

## 配置指南

所有站点配置集中于 `config.json`，**修改后重启服务器即生效**。

### 站点基本信息

```json
"site": {
  "name": "Classify",              // 英文名（页面标题）
  "nameCN": "班级服务",             // 中文名
  "logo": "🏫",                     // Logo emoji
  "domain": "example.com",         // 部署域名（ICS 日历用）
  "heroBadge": "一站式班级服务平台", // 首页角标
  "heroTitle": "Classify",         // 首页大标题
  "heroSubtitle": "日程 · 文件 · 导航 · 通知 · 表单",
  "footer": "Classify"             // 页脚文字
}
```

### 栏目名称

`config.json` → `sections`，可自由增删、修改栏目的名称和图标：

```json
"sections": {
  "schedule": { "name": "日程", "icon": "📅", "page": "/schedule.html" },
  "files":    { "name": "文件", "icon": "📚", "page": "/files.html" },
  "navi":     { "name": "导航", "icon": "💻", "page": "/navi.html" },
  "notices":  { "name": "通知", "icon": "📢", "page": "/notices.html" },
  "forms":    { "name": "表单", "icon": "📋", "page": "/form.html" }
}
```

### 管理员

```json
"admins": ["张三", "李四"]
```

姓名需与学生名单一致。管理员可访问 `/admin.html` 后台。

---

## 数据导入指南

网站的日程、通知、文件、表单等均存储在 `data/` 目录。支持**直接编辑 JSON 文件**和**通过管理员后台**两种导入方式。

### 1. 导入学生名单

学生名单是登录系统的基础。文件位置：`data/students_with_id.json`

**方式一：手动创建 JSON 文件**

```json
{
  "students": [
    { "name": "张三", "student_id": "20240001" },
    { "name": "李四", "student_id": "20240002" }
  ]
}
```

放入 `data/students_with_id.json`，重启服务器。

**方式二：管理员后台导入**

1. 先在 `config.json` 的 `admins` 中将自己设为管理员
2. 登录后访问 `/admin.html` → 「人员」标签
3. 单个添加：填写姓名 + 学号，点击"添加"
4. 批量导入：在文本框中粘贴，格式 `姓名,学号`，每行一条：

```
张三,20240001
李四,20240002
王五,20240003
```

### 2. 指定管理员

编辑 `config.json` → `admins`，填入管理员姓名（需与学生名单一致）：

```json
"admins": ["你的姓名"]
```

重启服务器后该用户即可访问 `/admin.html` 后台。

### 3. 导入日程、活动、通知、表单

所有内容数据位于 `data/content/` 目录。

#### 日程

文件：`data/content/schedules.json`

```json
{
  "schedules": [
    {
      "id": "1712345678000",
      "title": "开班会",
      "date": "2026-05-10",
      "time": "14:00-15:00",
      "location": "A101 教室",
      "description": "讨论近期班级事务",
      "source": "system",
      "organizer": null,
      "members": [],
      "createdAt": "2026-05-01T08:00:00.000Z",
      "expiresAt": "2027-05-01T08:00:00.000Z"
    }
  ]
}
```

> 也可通过前端 `/schedule.html` 页面直接创建活动。后台 `/admin.html` → 「日程」标签可查看和删除。

#### 长期活动

文件：`data/content/longterm.json`

```json
{
  "activities": [
    {
      "id": "1712345678001",
      "title": "期末考试",
      "description": "注意复习重点",
      "url": "https://example.com/exam",
      "startDate": "2026-06-20",
      "endDate": "2026-06-30",
      "createdAt": "2026-05-01T08:00:00.000Z"
    }
  ]
}
```

#### 通知

文件：`data/content/notices.json`

```json
[
  {
    "id": 1,
    "title": "欢迎使用 Classify",
    "content": "欢迎使用班级服务平台！\n\n本平台整合了日程、文件、导航等功能。",
    "date": "2026-05-01",
    "source": "系统通知",
    "unread": false,
    "pinned": false
  }
]
```

> 后台 `/admin.html` → 「通知」标签可置顶或删除通知。

#### 投票/表单

文件：`data/content/votes.json`

```json
{
  "votes": [
    {
      "id": "vote_001",
      "title": "五月评优",
      "description": "每人最多投 5 票",
      "deadline": "2026-05-15T23:59:59.000Z",
      "type": "vote",
      "maxVotes": 5,
      "candidates": [
        {
          "id": "cand_1",
          "name": "候选人A",
          "studentId": "20240001",
          "details": { "简介": "积极奉献，热爱集体" }
        }
      ]
    }
  ]
}
```

投票结果自动存储在 `data/content/votes/<投票ID>.json`。

> 后台 `/admin.html` → 「表单」标签可查看各投票的状态和候选人数量。

#### 更新日志

文件：`data/changelog.json`

```json
{
  "logs": [
    {
      "id": "1712345678000",
      "date": "2026-05-01",
      "version": "v1.0.0",
      "content": "平台正式上线"
    }
  ]
}
```

> 后台 `/admin.html` → 「更新日志」标签可直接添加。

---

## 管理员后台

访问 `/admin.html`，提供以下功能：

```
┌──────────────────────────────────────────────────────┐
│  ⚙️ 管理后台                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                │
│  │ N日程 │ │ N学生 │ │ N通知 │ │ N投票 │  统计卡片      │
│  └──────┘ └──────┘ └──────┘ └──────┘                │
│                                                      │
│  [📅日程] [👥人员] [📢通知] [📋表单] [📝更新日志]    │
│  ─────────────────────────────────────────────────── │
│  （根据所选标签显示对应的管理界面）                     │
└──────────────────────────────────────────────────────┘
```

| 标签 | 功能 |
|------|------|
| 📅 日程 | 查看全部日程列表、删除活动 |
| 👥 人员 | 搜索学生、单个添加、批量导入（`姓名,学号` 每行一条）、删除学生 |
| 📢 通知 | 查看通知列表、置顶/取消置顶、删除通知 |
| 📋 表单 | 查看投票状态（进行中/已截止）、候选人数量 |
| 📝 更新日志 | 添加版本更新记录（日期 + 版本号 + 内容） |

---

## AI 助手配置

AI 对话功能对接 **OpenAI 兼容 API**，支持 DeepSeek、OpenAI、Ollama 等。

### 配置方式

编辑 `config.json` → `aiConfig`：

```json
"aiConfig": {
  "provider": "deepseek",
  "baseUrl": "https://api.deepseek.com",
  "apiKey": "sk-your-api-key-here",
  "model": "deepseek-chat"
}
```

> **注意**：`config.json` 通过 `/config.js` 暴露给浏览器端，`apiKey` 对用户可见。生产环境建议通过后端代理转发 AI 请求以保护密钥。

### 支持的 API 提供商

| 提供商 | baseUrl | model 示例 |
|--------|---------|-------------|
| DeepSeek | `https://api.deepseek.com` | `deepseek-chat` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| Ollama (本地) | `http://localhost:11434/v1` | `qwen2.5:7b` |
| 其他兼容接口 | 自定义地址 | 对应模型名 |

### 工作流程

1. 用户在 AI 对话页（`/aichat.html`）输入问题
2. 系统自动加载日程、通知、文件等数据作为上下文
3. 将上下文 + 用户问题发送到 AI API
4. 流式输出回复

### 自定义 System Prompt

编辑 `public/aichat.html` 中的 `systemPrompt` 变量：

```js
const systemPrompt = `你是班级智能助手。请根据以下数据回答用户问题...`;
```

### 频率限制

AI 对话每小时限 10 次（可在 `routes/rateLimit.js` 中修改 `RATE_LIMIT_MAX`）。

---

## 项目结构

```
Classify/
├── server.js              # Express 主入口（端口 3000）
├── config.json            # 站点配置（名称/栏目/管理员/AI）
├── package.json
├── public/                # 前端静态页面
│   ├── index.html         # 首页（5 功能卡片 + 统计）
│   ├── schedule.html      # 日程（日历 + iCal 订阅）
│   ├── files.html         # 文件（知识库 + 上传）
│   ├── navi.html          # 导航（浏览器主页）
│   ├── notices.html       # 通知（列表 + 备忘）
│   ├── form.html          # 表单（投票）
│   ├── vote.html          # 组队
│   ├── memo.html          # 备忘阅读 + 已读确认
│   ├── aichat.html        # AI 助手
│   ├── admin.html         # 管理后台
│   ├── login.html         # 登录
│   ├── common.css         # 公共样式
│   ├── config-init.js     # 配置自动注入页面
│   ├── auth-check.js      # 统一登录验证
│   └── theme.js           # 明暗主题切换
├── routes/                # API 路由（10 个模块）
├── middleware/             # 认证中间件
├── utils/                 # 工具函数
├── scripts/               # 运维脚本
└── tools/                 # Python 工具
```

## API 文档

全部 API 以 `/api` 为前缀。除登录外需 `Authorization: Bearer <token>` 认证。

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login` | `{ "name": "...", "studentId": "..." }` 登录，返回 token。IP 限速 10次/15分钟 |
| GET | `/api/check-login` | 验证 token 是否有效 |
| GET | `/api/check-device` | 设备指纹自动登录 |
| GET | `/api/user` | 当前用户信息 + 登录设备列表 |
| POST | `/api/logout` | 登出 |
| GET | `/api/students/names` | 全部学生姓名列表（拼音排序） |

### 日程

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/schedules` | 未来 15 天日程 |
| GET | `/api/schedules/all` | 全部日程 |
| POST | `/api/schedules` | 创建活动（title/date/time/location/organizer） |
| PUT | `/api/schedules/:id` | 修改活动 |
| DELETE | `/api/schedules/:id?name=张三` | 删除（发起人或管理员） |
| POST | `/api/schedules/:id/join` | `{ "name": "..." }` 加入 |
| POST | `/api/schedules/:id/leave` | `{ "name": "..." }` 退出 |
| GET | `/api/subscribe.ics` | iCalendar 订阅（60天范围） |

### 文件

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/folders` | 文件夹列表 |
| POST | `/api/folders` | `{ "name": "...", "parentId": null }` 创建 |
| DELETE | `/api/folders/:id` | 递归删除 |
| GET | `/api/files?parentId=<id>` | 文件列表 |
| GET | `/api/files/:id` | 文件详情 |
| POST | `/api/files` | 创建文本文件 |
| POST | `/api/files/upload` | 文件上传（multipart） |
| DELETE | `/api/files/:id` | 删除 |
| GET | `/api/export` | 导出知识库 |
| POST | `/api/import` | 导入知识库 |

### 通知

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notices` | 通知列表（置顶→未读→日期倒序） |

### 表单 / 投票

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/votes` | 投票列表 |
| GET | `/api/votes/:id` | 投票详情 + 候选人 |
| GET | `/api/votes/:id/candidate/:cid` | 候选人详情 |
| GET | `/api/votes/:id/check/:studentId` | 是否已投票 |
| GET | `/api/votes/voted/:studentId` | 已投票列表 |
| POST | `/api/votes/:id/submit` | 提交投票（带并发锁） |

### 组队

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/teams` | 队伍列表 |
| POST | `/api/teams` | 创建（创建者自动加入） |
| POST | `/api/teams/:id/join` | `{ "name": "..." }` 加入 |

### 导航 / 个人链接

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/navi` | 系统导航链接 |
| GET | `/api/navi/personal` | 个人链接列表（需认证） |
| POST | `/api/navi/personal` | 添加链接 |
| DELETE | `/api/navi/personal/:id` | 删除链接 |
| PUT | `/api/navi/personal/save` | 批量保存 |
| GET/PUT | `/api/navi/personal/engine` | 搜索引擎偏好 |

### 杂项

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/changelog` | 更新日志 |
| GET/POST | `/api/longterm` | 长期活动 |
| DELETE | `/api/longterm/:id` | 删除长期活动 |
| GET/POST | `/api/read/:filekey` | 备忘阅读状态 |

### 管理员

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/check` | 是否管理员 |
| GET | `/api/admin/data` | 全部管理数据 |
| PUT | `/api/admin/notices` | 更新通知 |
| POST | `/api/admin/students` | 添加学生 |
| DELETE | `/api/admin/students/:id` | 删除学生 |
| POST | `/api/admin/students/import` | 批量导入学生 |

### 频率限制

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/rate-limit` | AI 调用配额（10次/小时） |

## 部署指南

```bash
# PM2
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
| `scripts/start.sh` | 启动服务 |
| `scripts/deploy.sh` | 部署（备份 + 重启） |
| `scripts/backup.sh` | 备份源码 + 同步知识库 |
| `scripts/schedule_sync.sh` | 每天 0 点：清理过期日程 + 生成 .ics |
| `scripts/changelog_sync.sh` | 每天 0 点：自动添加更新日志 |
| `scripts/efile_upload_sync.sh` | 从 `/root/efile/` 同步文件到知识库 |

## License

MIT

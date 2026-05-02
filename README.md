# Ecolany 网站代码结构

复旦大学班级网站 ecolany.cn 的源代码仓库。

## 目录结构

```
ecolony.cn/
├── public/                 # 静态网页文件（Nginx直接托管）
│   ├── index.html          # 首页（4卡片导航）
│   ├── schedule.html       # e日程 - 日历视图
│   ├── add-schedule.html   # e日程 - 新建/编辑活动
│   ├── files.html          # e文件 - 知识库/文件浏览
│   ├── navi.html           # e导航 - 导航页
│   ├── notices.html        # e通知 - 通知列表 + 学工备忘
│   ├── memo.html           # 学工备忘 - 通用阅读页（?id=）
│   ├── login.html          # 登录页
│   ├── aichat.html         # e生菌AI对话页
│   ├── ecolony_schedules.ics   # iCal静态订阅文件
│   └── MP_verify_*.txt     # 微信公众平台验证文件
│
├── server.js               # Node.js主服务器（Express）
│                          # 端口：3000
│                          # API路由：/api/*
│
├── package.json            # Node.js依赖
├── package-lock.json
├── node_modules/           # 依赖包
│
├── data/                    # 统一数据目录
│   ├── content/            # 内容数据（外部抓取/后台上传）
│   │   ├── files/          # e文件 — 上传的Markdown知识库
│   │   ├── notices/        # e通知 — 学工备忘
│   │   ├── votes/          # e表单 — 投票结果
│   │   └── *.json          # e日程/文件/通知/表单的JSON数据
│   ├── personal/           # 用户个人数据（按学号_姓名命名）
│   └── *.json              # 系统数据（认证、限速、导航链接等）
│
├── scripts/                # 运维脚本
│   ├── start.sh            # 启动服务器
│   ├── deploy.sh           # 部署脚本（备份+重启）
│   ├── backup.sh           # 备份网站+同步知识库
│   ├── efile_upload_sync.sh   # 从/root/efile上传到服务器data.json
│   ├── changelog_sync.sh   # 定时添加更新日志
│   └── schedule_sync.sh    # 定时生成iCal+清理过期日程
│
├── tools/                  # 工具脚本
│   └── extract_docx_styles.py  # 从Word文档提取字体样式
│
```


## 服务器架构

```
用户请求
    │
    ▼
Nginx (端口80/443)
    ├── 静态文件 → /var/www/ecolony.cn/public/ (try_files)
    └── /api/*   → Node.js服务器 (端口3000) → server.js
```

## 快速启动

```bash
# 启动服务器
cd /var/www/ecolony.cn
./scripts/start.sh

# 或直接
node server.js

# PM2托管（生产环境）
pm2 start server.js --name "ecolany-web"
pm2 save
```

## 定时任务

| 脚本 | 周期 | 功能 |
|------|------|------|
| changelog_sync.sh | 每天0点 | 自动添加当天更新日志 |
| schedule_sync.sh | 每天0点 | 清理过期日程+生成iCal备份 |
| efile_upload_sync.sh | 手动 | 从/root/efile同步文件到服务器 |

## Nginx配置

配置文件：`/etc/nginx/sites-enabled/ecolony.cn`
- 静态文件根目录：`/var/www/ecolony.cn/public`
- API代理：`/api/*` → `http://127.0.0.1:3000/api/`

## 重要说明

1. **静态文件**：所有HTML/ICS文件在 `public/` 目录，Nginx直接托管
2. **PM2进程**：使用 `pm2 start server.js --name "ecolany-web"` 托管，重启后自动恢复
3. **知识库同步**：上传文件到 `/root/efile/` 后，运行 `scripts/efile_upload_sync.sh` 同步到网站数据库

## 版本历史

- 2026-04-24：代码结构重组，HTML文件迁移至public/目录，明确各目录用途

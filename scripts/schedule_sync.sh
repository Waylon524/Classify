#!/bin/bash
# Ecolany e日程定时同步脚本
# 每天0点执行：清理过期日程 + 生成静态.ics备份

DATA_DIR="/var/www/ecolony.cn"
LOG_FILE="/tmp/ical_sync.log"

echo "[$(date)] 开始同步e日程..." >> $LOG_FILE

# 调用API生成静态.ics备份
curl -s "http://localhost:3000/api/subscribe.ics" > "$DATA_DIR/public/ecolony_schedules.ics"

if [ $? -eq 0 ]; then
    echo "[$(date)] ICS文件已生成: $(wc -c < $DATA_DIR/public/ecolony_schedules.ics) bytes" >> $LOG_FILE
else
    echo "[$(date)] 错误: ICS生成失败" >> $LOG_FILE
fi

# 清理过期数据（通过调用清理接口或直接处理）
node -e "
const fs = require('fs');
const path = require('path');

const schedulesFile = '$DATA_DIR/data/content/schedules.json';
const data = JSON.parse(fs.readFileSync(schedulesFile, 'utf-8'));
const schedules = data.schedules || [];

const now = new Date();
const cutoffDate = new Date(now);
cutoffDate.setDate(cutoffDate.getDate() - 1);

const before = schedules.length;
const filtered = schedules.filter(s => new Date(s.date) >= cutoffDate);

if (before !== filtered.length) {
    fs.writeFileSync(schedulesFile, JSON.stringify({ schedules: filtered }, null, 2));
    console.log('[Cleanup] Removed ' + (before - filtered.length) + ' expired schedules');
} else {
    console.log('[Cleanup] No expired schedules to remove');
}
"

echo "[$(date)] 同步完成" >> $LOG_FILE

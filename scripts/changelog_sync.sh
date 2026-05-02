#!/bin/bash
# Ecolany 更新日志定时添加脚本
# 每天0点执行：自动添加当天的更新日志

API_URL="http://localhost:3000/api/changelog"
LOG_FILE="/tmp/changelog_sync.log"

# 获取昨天的日期 (格式: YYYY-MM-DD)
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)

echo "[$(date)] 开始添加更新日志..." >> $LOG_FILE

# 检查今天是否已有日志
TODAY_COUNT=$(curl -s "$API_URL" | grep -o "\"$YESTERDAY\"" | wc -l)

if [ $TODAY_COUNT -gt 0 ]; then
    echo "[$(date)] 今天的日志已存在，跳过" >> $LOG_FILE
else
    # 调用API添加日志（版本号留空，内容由用户后续补充）
    RESULT=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"date\": \"$YESTERDAY\", \"version\": \"\", \"content\": \"\"}")
    
    if echo "$RESULT" | grep -q "success"; then
        echo "[$(date)] 更新日志已添加: $YESTERDAY" >> $LOG_FILE
    else
        echo "[$(date)] 添加失败: $RESULT" >> $LOG_FILE
    fi
fi

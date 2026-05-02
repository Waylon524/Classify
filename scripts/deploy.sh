#!/bin/bash
# Deploy script: backup website + restart server

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.." # Move to root directory
"$SCRIPT_DIR/backup.sh"

# Restart the node server to ensure changes are loaded
echo "[$(date)] Restarting server..."
pkill -f "node server.js" 2>/dev/null
sleep 1
nohup node server.js > /tmp/ecolony_server.log 2>&1 &
sleep 2

# Check if server is running
if curl -s "http://localhost:3000/api/folders" > /dev/null 2>&1; then
    echo "[$(date)] Server restarted successfully"
else
    echo "[$(date)] Warning: Server may not be running properly"
fi

echo "[$(date)] Deployment completed!"

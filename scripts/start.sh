#!/bin/bash
# Start the ecolony.cn Node.js server
# Usage: ./scripts/start.sh

cd /var/www/ecolony.cn
pkill -f "node server.js" 2>/dev/null
sleep 1
node server.js > /tmp/ecolony_server.log 2>&1 &
echo "Server started on port 3000"

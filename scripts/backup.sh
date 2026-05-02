#!/bin/bash
# Website backup and knowledge base sync script

BACKUP_DIR="/root/website backup"
KB_SOURCE="/root/efile"
KB_TARGET="/var/www/ecolony.cn"
DATA_FILE="/var/www/ecolony.cn/data/content/data.json"

# Create directories if not exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$KB_SOURCE"

# === Part 1: Backup website source code ===
echo "[$(date)] Starting website backup..."

# Find and delete oldest backup if more than 3 exist
BACKUP_COUNT=$(ls -d "$BACKUP_DIR"/backup_* 2>/dev/null | wc -l)
echo "Current backup count: $BACKUP_COUNT"

if [ "$BACKUP_COUNT" -ge 3 ]; then
    OLDEST=$(ls -td "$BACKUP_DIR"/backup_* | tail -1)
    echo "Deleting oldest backup: $OLDEST"
    rm -rf "$OLDEST"
fi

# Create new backup with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"
mkdir -p "$BACKUP_PATH"

# Backup website source files (not node_modules, not api-data files)
cp "$KB_TARGET/index.html" "$BACKUP_PATH/"
cp "$KB_TARGET/server.js" "$BACKUP_PATH/"
cp "$KB_TARGET/files.html" "$BACKUP_PATH/"
cp "$KB_TARGET/package.json" "$BACKUP_PATH/"
cp "$KB_TARGET/package-lock.json" "$BACKUP_PATH/"

echo "Backup created: $BACKUP_PATH"
echo "Backup files:"
ls -la "$BACKUP_PATH/"

# === Part 2: Sync knowledge base from server to source ===
echo "[$(date)] Syncing knowledge base from server to $KB_SOURCE..."

# Get current knowledge base structure from data.json
if [ -f "$DATA_FILE" ]; then
    # Read folders and files from data.json, create directory structure in KB_SOURCE
    python3 << PYSYNC
import json
import os
import shutil
import base64

data_file = "$DATA_FILE"
kb_source = "$KB_SOURCE"

with open(data_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Clean and recreate KB source directory
if os.path.exists(kb_source):
    shutil.rmtree(kb_source)
os.makedirs(kb_source)

# Create folder structure
folder_map = {}
for folder in data.get('folders', []):
    folder_id = folder['id']
    folder_name = folder['name']
    parent_id = folder['parentId']
    
    # Build path
    if parent_id and parent_id in folder_map:
        folder_path = os.path.join(folder_map[parent_id], folder_name)
    else:
        folder_path = os.path.join(kb_source, folder_name)
    
    os.makedirs(folder_path, exist_ok=True)
    folder_map[folder_id] = folder_path

# Save files
for file in data.get('files', []):
    file_name = file['name']
    file_content = file.get('content', '')
    parent_id = file['parentId']
    
    if parent_id and parent_id in folder_map:
        file_path = os.path.join(folder_map[parent_id], file_name)
    else:
        file_path = os.path.join(kb_source, file_name)
    
    # Handle binary files (base64 encoded)
    if file_name.endswith('.pdf') or file_name.endswith('.docx') or file_name.endswith('.doc'):
        try:
            decoded = base64.b64decode(file_content)
            with open(file_path, 'wb') as f:
                f.write(decoded)
        except Exception as e:
            print(f"Warning: Failed to decode binary file {file_name}: {e}")
    else:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(file_content)

print(f"Synced {len(data.get('folders', []))} folders and {len(data.get('files', []))} files to knowledge base")
PYSYNC
else
    echo "Warning: data.json not found"
fi

echo "[$(date)] Backup and sync completed!"

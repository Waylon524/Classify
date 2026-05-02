#!/bin/bash
# Sync files from /root/knowledge base TO server's data.json
# This allows uploading files by dropping them into /root/knowledge base

KB_SOURCE="/root/efile"
DATA_FILE="/var/www/ecolony.cn/data/content/data.json"

echo "[$(date)] Starting sync from knowledge base to server..."

python3 << PYSYNC
import json
import os
import base64

kb_source = "$KB_SOURCE"
data_file = "$DATA_FILE"

# Read current data
with open(data_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Build a map of current files by path
def get_all_paths(parent_path, parent_id, path_map, id_to_path):
    if not os.path.exists(parent_path):
        return
    
    for entry in os.scandir(parent_path):
        if entry.is_dir():
            folder_name = entry.name
            # Find folder id
            folder_id = None
            for f in data['folders']:
                if f['name'] == folder_name and f['parentId'] == parent_id:
                    folder_id = f['id']
                    break
            if folder_id:
                id_to_path[folder_id] = entry.path
                get_all_paths(entry.path, folder_id, path_map, id_to_path)
        elif entry.is_file() and (entry.name.endswith('.md') or entry.name.endswith('.txt') or entry.name.endswith('.pdf') or entry.name.endswith('.docx') or entry.name.endswith('.doc')):
            file_name = entry.name
            # Find file id
            file_id = None
            for f in data['files']:
                if f['name'] == file_name and f['parentId'] == parent_id:
                    file_id = f['id']
                    break
            if file_id:
                path_map[file_id] = entry.path

# Map file IDs to their actual paths
path_map = {}
id_to_path = {}
get_all_paths(kb_source, None, path_map, id_to_path)

# Remove files from data.json that no longer exist on disk
files_to_remove = []
for f in data['files']:
    if f['id'] not in path_map:
        files_to_remove.append(f['id'])

for file_id in files_to_remove:
    data['files'] = [f for f in data['files'] if f['id'] != file_id]
    print(f"Removed deleted file: {file_id}")

# Remove empty folders from data.json
folders_to_remove = []
for folder in data['folders']:
    if folder['id'] not in id_to_path:
        # Check if this folder has no children
        has_children = any(f['parentId'] == folder['id'] for f in data['folders'])
        has_files = any(f['parentId'] == folder['id'] for f in data['files'])
        if not has_children and not has_files:
            folders_to_remove.append(folder['id'])

for folder_id in folders_to_remove:
    data['folders'] = [f for f in data['folders'] if f['id'] != folder_id]
    print(f"Removed empty folder: {folder_id}")

# Now add/update files from knowledge base
folder_name_to_id = {}
for folder in data['folders']:
    folder_name_to_id[(folder['parentId'], folder['name'])] = folder['id']

def sync_folder(parent_path, parent_id):
    if not os.path.exists(parent_path):
        return
    
    for entry in os.scandir(parent_path):
        if entry.is_dir():
            folder_name = entry.name
            # Get or create folder id
            folder_key = (parent_id, folder_name)
            if folder_key not in folder_name_to_id:
                folder_id = str(hash(folder_name + str(parent_id)) % 1000000000000)
                data['folders'].append({
                    'id': folder_id,
                    'name': folder_name,
                    'parentId': parent_id,
                    'createdAt': int(os.path.getmtime(entry.path) * 1000)
                })
                folder_name_to_id[folder_key] = folder_id
                print(f"Added folder: {folder_name}")
            else:
                folder_id = folder_name_to_id[folder_key]
            
            sync_folder(entry.path, folder_id)
        
        elif entry.is_file() and (entry.name.endswith('.md') or entry.name.endswith('.txt') or entry.name.endswith('.pdf') or entry.name.endswith('.docx') or entry.name.endswith('.doc')):
            file_name = entry.name
            # Read content based on file type
            file_content = ''
            if file_name.endswith('.pdf') or file_name.endswith('.docx') or file_name.endswith('.doc'):
                with open(entry.path, 'rb') as f:
                    file_content = base64.b64encode(f.read()).decode('ascii')
            else:
                with open(entry.path, 'r', encoding='utf-8') as f:
                    file_content = f.read()
            
            # Find existing file
            existing = None
            for f in data['files']:
                if f['name'] == file_name and f['parentId'] == parent_id:
                    existing = f
                    break
            
            if existing:
                # Update content
                existing['content'] = file_content
                existing['size'] = len(file_content.encode('utf-8'))
            else:
                # Add new file
                file_id = str(hash(file_name + str(parent_id) + str(os.path.getmtime(entry.path))) % 1000000000000)
                data['files'].append({
                    'id': file_id,
                    'name': file_name,
                    'content': file_content,
                    'parentId': parent_id,
                    'size': len(file_content.encode('utf-8')),
                    'createdAt': int(os.path.getmtime(entry.path) * 1000)
                })
                print(f"Added file: {file_name}")

sync_folder(kb_source, None)

# Write back
with open(data_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Final: {len(data['folders'])} folders, {len(data['files'])} files")
PYSYNC

echo "[$(date)] Sync completed!"

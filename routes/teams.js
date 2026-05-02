const express = require('express');
const router = express.Router();
const { readJson, writeJson, escapeHtml } = require('../utils/db');

const TEAMS_FILE = 'teams.json';

function readTeams() {
    const data = readJson(TEAMS_FILE, []);
    return data;
}

function saveTeams(teams) {
    writeJson(TEAMS_FILE, teams);
}

// Get all teams
router.get('/', (req, res) => {
    try {
        const teams = readTeams();
        // Sort by creation time descending (newest first)
        teams.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(teams);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new team
router.post('/', (req, res) => {
    try {
        const { activityName, description, eventTime, location, organizer } = req.body;
        
        // Validation
        if (!activityName || activityName.length > 20) {
            return res.status(400).json({ error: '活动名称必填且不超过20字' });
        }
        if (!description || description.length > 200) {
            return res.status(400).json({ error: '简介必填且不超过200字' });
        }
        if (!eventTime) {
            return res.status(400).json({ error: '时间必填' });
        }
        if (new Date(eventTime) <= new Date()) {
            return res.status(400).json({ error: '时间不能选择过去的时间' });
        }
        if (!location) {
            return res.status(400).json({ error: '地点必填' });
        }
        if (!organizer) {
            return res.status(400).json({ error: '姓名必填' });
        }
        
        const team = {
            id: Date.now().toString(),
            activityName: escapeHtml(activityName.trim()),
            description: escapeHtml(description.trim()),
            eventTime,
            location: escapeHtml(location.trim()),
            organizer: escapeHtml(organizer.trim()),
            members: [escapeHtml(organizer.trim())], // Organizer is the first member
            createdAt: new Date().toISOString()
        };
        
        const teams = readTeams();
        teams.push(team);
        saveTeams(teams);
        
        res.json(team);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Join a team
router.post('/:id/join', (req, res) => {
    try {
        const { name } = req.body;
        const { id } = req.params;
        
        if (!name) {
            return res.status(400).json({ error: '姓名必填' });
        }
        
        const teams = readTeams();
        const team = teams.find(t => t.id === id);
        
        if (!team) {
            return res.status(404).json({ error: '组队不存在' });
        }
        
        // Check if already joined
        if (team.members.includes(escapeHtml(name.trim()))) {
            return res.status(400).json({ error: '你已经在队伍中了' });
        }

        team.members.push(escapeHtml(name.trim()));
        saveTeams(teams);
        
        res.json(team);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { readJson, withLock } = require('../utils/db');

const VOTES_CONFIG_FILE = 'content/votes.json';
const VOTES_DATA_DIR = path.join(__dirname, '..', 'data', 'content', 'votes');

// Ensure votes data directory exists
if (!fs.existsSync(VOTES_DATA_DIR)) {
    fs.mkdirSync(VOTES_DATA_DIR, { recursive: true });
}

function loadVotesConfig() {
    return readJson(VOTES_CONFIG_FILE, { votes: [] });
}

function saveVotesConfig(data) {
    const { writeJson } = require('../utils/db');
    writeJson(VOTES_CONFIG_FILE, data);
}

function loadVoteResults(voteId) {
    const file = path.join(VOTES_DATA_DIR, `${voteId}.json`);
    try {
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf-8'));
        }
        return { submissions: [] };
    } catch (e) {
        return { submissions: [] };
    }
}

function saveVoteResults(voteId, data) {
    const file = path.join(VOTES_DATA_DIR, `${voteId}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// GET /api/votes - List all votes (metadata only, no candidates)
router.get('/', (req, res) => {
    try {
        const config = loadVotesConfig();
        const votes = config.votes.map(v => ({
            id: v.id,
            title: v.title,
            description: v.description,
            deadline: v.deadline,
            type: v.type || 'vote',
            maxVotes: v.maxVotes,
            candidateCount: (v.candidates || []).length
        }));
        res.json(votes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/votes/voted/:studentId - Check which votes a student has voted
router.get('/voted/:studentId', (req, res) => {
    try {
        const studentId = req.params.studentId;
        const config = loadVotesConfig();
        const votedIds = [];

        for (const vote of config.votes) {
            const results = loadVoteResults(vote.id);
            const hasVoted = results.submissions.some(s => s.voterStudentId === studentId);
            if (hasVoted) {
                votedIds.push(vote.id);
            }
        }

        res.json(votedIds);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/votes/:id - Get vote details with candidates
router.get('/:id', (req, res) => {
    try {
        const config = loadVotesConfig();
        const vote = config.votes.find(v => v.id === req.params.id);
        if (!vote) {
            return res.status(404).json({ error: '投票不存在' });
        }

        const candidates = (vote.candidates || []).map(c => ({
            id: c.id,
            name: c.name,
            studentId: c.studentId
        }));

        res.json({
            id: vote.id,
            title: vote.title,
            description: vote.description,
            deadline: vote.deadline,
            type: vote.type || 'vote',
            maxVotes: vote.maxVotes || 5,
            requireViewDetails: vote.requireViewDetails !== false,
            minOpenTime: vote.minOpenTime || 60,
            candidates
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/votes/:id/candidate/:candidateId - Get candidate details
router.get('/:id/candidate/:candidateId', (req, res) => {
    try {
        const config = loadVotesConfig();
        const vote = config.votes.find(v => v.id === req.params.id);
        if (!vote) return res.status(404).json({ error: '投票不存在' });

        const candidate = (vote.candidates || []).find(c => c.id === req.params.candidateId);
        if (!candidate) return res.status(404).json({ error: '候选人不存在' });

        res.json({
            id: candidate.id,
            name: candidate.name,
            studentId: candidate.studentId,
            details: candidate.details || {}
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/votes/:id/check/:studentId - Check if student has voted in this vote
router.get('/:id/check/:studentId', (req, res) => {
    try {
        const config = loadVotesConfig();
        const vote = config.votes.find(v => v.id === req.params.id);
        if (!vote) return res.status(404).json({ error: '投票不存在' });

        const results = loadVoteResults(vote.id);
        const submission = results.submissions.find(s => s.voterStudentId === req.params.studentId);

        if (submission) {
            res.json({
                hasVoted: true,
                submission: {
                    voterName: submission.voterName,
                    voterStudentId: submission.voterStudentId,
                    selectedCandidates: submission.selectedCandidates,
                    submitTime: submission.submitTime
                }
            });
        } else {
            res.json({ hasVoted: false });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/votes/:id/submit - Submit a vote (with lock to prevent double-voting race)
router.post('/:id/submit', async (req, res) => {
    try {
        const { voterName, voterStudentId, selectedCandidates } = req.body;

        if (!voterName || !voterStudentId) return res.status(400).json({ error: '姓名和学号必填' });
        if (!selectedCandidates || !Array.isArray(selectedCandidates)) return res.status(400).json({ error: '请选择候选人' });

        const voteId = req.params.id;
        const config = loadVotesConfig();
        const vote = config.votes.find(v => v.id === voteId);
        if (!vote) return res.status(404).json({ error: '投票不存在' });

        const now = new Date();
        const deadline = new Date(vote.deadline);
        if (now > deadline) return res.status(400).json({ error: '投票已截止' });

        if (selectedCandidates.length !== vote.maxVotes) return res.status(400).json({ error: `请选择${vote.maxVotes}位候选人` });

        const validIds = (vote.candidates || []).map(c => c.id);
        for (const cid of selectedCandidates) {
            if (!validIds.includes(cid)) return res.status(400).json({ error: '无效的候选人' });
        }

        const resultFile = path.join(VOTES_DATA_DIR, `${voteId}.json`);
        const updated = await withLock(resultFile, (results) => {
            if (!results.submissions) results.submissions = [];
            const alreadyVoted = results.submissions.find(s => s.voterStudentId === voterStudentId);
            if (alreadyVoted) throw new Error('你已经投过票了');

            const submission = {
                voterName,
                voterStudentId,
                selectedCandidates,
                submitTime: new Date().toISOString()
            };
            results.submissions.push(submission);
            return results;
        }, { submissions: [] });

        res.json({ success: true, message: '投票成功' });
    } catch (err) {
        if (err.message === '你已经投过票了') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

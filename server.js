const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');
require('dotenv').config();
const axios = require('axios');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); // Serve static files (HTML, CSS, JS)

// API Endpoints

// GET all drafts (for history/dashboard)
app.get('/api/drafts', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const sql = `
        SELECT drafts.*, projects.name as project_name, roles.name as role_name 
        FROM drafts 
        LEFT JOIN projects ON drafts.project_id = projects.id 
        LEFT JOIN roles ON drafts.role_id = roles.id 
        ORDER BY drafts.created_at DESC 
        LIMIT ?`;
    db.all(sql, [limit], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// DELETE a draft
app.delete('/api/drafts/:id', (req, res) => {
    const sql = 'DELETE FROM drafts WHERE id = ?';
    const params = [req.params.id];
    db.run(sql, params, function (err, result) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "deleted", changes: this.changes });
    });
});

// POST new draft
app.post('/api/drafts', (req, res) => {
    const { type, content, project_id, role_id } = req.body;
    const sql = "INSERT INTO drafts (type, content, project_id, role_id) VALUES (?, ?, ?, ?)";
    const params = [type, content, project_id, role_id];

    db.run(sql, params, function (err, result) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": {
                id: this.lastID,
                type,
                content
            }
        });
    });
});

// --- Projects & Roles Endpoints ---

// GET all projects
app.get('/api/projects', (req, res) => {
    db.all("SELECT * FROM projects", [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "success", data: rows });
    });
});

// POST new project
app.post('/api/projects', (req, res) => {
    const { name } = req.body;
    db.run("INSERT INTO projects (name) VALUES (?)", [name], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "success", data: { id: this.lastID, name } });
    });
});

// DELETE project
app.delete('/api/projects/:id', (req, res) => {
    db.run("DELETE FROM projects WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "deleted" });
    });
});

// GET roles for project
app.get('/api/projects/:id/roles', (req, res) => {
    db.all("SELECT * FROM roles WHERE project_id = ?", [req.params.id], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "success", data: rows });
    });
});

// POST new role
app.post('/api/roles', (req, res) => {
    const { name, project_id } = req.body;
    db.run("INSERT INTO roles (name, project_id) VALUES (?, ?)", [name, project_id], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "success", data: { id: this.lastID, name, project_id } });
    });
});

// DELETE role
app.delete('/api/roles/:id', (req, res) => {
    db.run("DELETE FROM roles WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "deleted" });
    });
});

// AI Enhance Endpoint
app.post('/api/enhance', async (req, res) => {
    const { fields } = req.body;

    if (!fields || typeof fields !== 'object') {
        return res.status(400).json({ error: "Fields object is required" });
    }

    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: process.env.OPENROUTER_MODEL || 'tngtech/deepseek-r1t2-chimera:free',
                messages: [
                    {
                        role: 'system',
                        content: `You are a professional corporate editor. 
                        I will give you a JSON object containing status update fields (e.g., taskTitle, taskDesc, blockers, nextSteps). 
                        Your job is to rewrite the content of EACH field to be concise, professional, and action-oriented.
                        Do NOT change the keys.
                        Do NOT add conversational filler.
                        Return ONLY the valid JSON object.`
                    },
                    {
                        role: 'user',
                        content: JSON.stringify(fields)
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        let content = response.data.choices[0].message.content.trim();

        // Clean up markdown code blocks if present
        if (content.startsWith('```json')) {
            content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (content.startsWith('```')) {
            content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const enhancedFields = JSON.parse(content);
        res.json({ enhanced: enhancedFields });

    } catch (error) {
        console.error("AI Error:", error.response ? error.response.data : error.message);
        // Fallback: just return original fields if AI fails
        res.status(500).json({ error: "Failed to enhance text", details: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

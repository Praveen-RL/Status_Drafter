const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'drafts.db');
const db = new sqlite3.Database(dbPath);

console.log("🌱 Seeding Extended Data...");

db.serialize(() => {
    // 1. Drop Tables
    db.run("DROP TABLE IF EXISTS drafts");
    db.run("DROP TABLE IF EXISTS roles");
    db.run("DROP TABLE IF EXISTS projects");

    // 2. Create Tables
    db.run(`CREATE TABLE projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE
    )`);

    db.run(`CREATE TABLE roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        name TEXT,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        content TEXT,
        project_id INTEGER,
        role_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 3. Prepare Statements
    const stmtProject = db.prepare("INSERT INTO projects (name) VALUES (?)");
    const stmtRole = db.prepare("INSERT INTO roles (name, project_id) VALUES (?, ?)");
    const stmtDraft = db.prepare("INSERT INTO drafts (type, content, project_id, role_id, created_at) VALUES (?, ?, ?, ?, ?)");

    const PROJECTS = [
        {
            name: "Android App",
            roles: ["Kotlin Developer", "Android UI/UX", "QA Automator", "Release Manager", "API Integrator"]
        },
        {
            name: "Website App",
            roles: ["Frontend React Dev", "Backend Node.js", "DevOps Engineer", "Fullstack Lead", "SEO Specialist"]
        },
        {
            name: "Desktop App",
            roles: ["C# Developer", "WPF Designer", "System Architect", "Installer Specialist", "Performance Analyst"]
        }
    ];

    const TASKS = [
        "Debugged crash on login screen",
        "Implemented new dashboard widget",
        "Refactored user authentication module",
        "Optimized database queries for performance",
        "Updated documentation for API endpoints",
        "Fixed responsive layout issues on mobile",
        "Configured CI/CD pipeline",
        "Investigated memory leak in background service",
        "Designed new icons for settings menu",
        "Conducted code review for PR #42"
    ];

    const BLOCKERS = [
        "", "", "",
        "Waiting for API keys",
        "Server downtime",
        "Ambiguous requirements",
        "Dependency conflict"
    ];

    // Keep track of IDs manually since we are in a synchronous-style serialize loop and starting from fresh DB
    let pIdCounter = 1;
    let rIdCounter = 1;

    PROJECTS.forEach(p => {
        stmtProject.run(p.name);
        const currentPId = pIdCounter++;

        // Store role IDs for this project to assign drafts later
        const roleIdsForProject = [];

        p.roles.forEach(r => {
            stmtRole.run(r, currentPId);
            roleIdsForProject.push(rIdCounter++);
        });

        // Generate ~50 drafts per project to reach 150 total
        for (let i = 0; i < 50; i++) {
            const isDaily = Math.random() > 0.3;
            const rId = roleIdsForProject[Math.floor(Math.random() * roleIdsForProject.length)];
            const task = TASKS[Math.floor(Math.random() * TASKS.length)];
            const blocker = BLOCKERS[Math.floor(Math.random() * BLOCKERS.length)];
            const date = new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000); // Last 60 days

            let content = "";
            let formattedDate = date.toLocaleDateString();

            if (isDaily) {
                content = `Daily Update (${formattedDate})\nTask: ${task}\nStatus: In Progress\n\nDone: ${task}\n${blocker ? 'Blocker: ' + blocker : ''}`;
            } else {
                content = `Weekly Summary (${formattedDate})\nHighlight: ${task}\n\nAccomplished: Completed core modules for ${task}.\nNext: Testing phase.`;
            }

            stmtDraft.run(isDaily ? 'daily' : 'weekly', content, currentPId, rId, date.toISOString());
        }
    });

    stmtProject.finalize();
    stmtRole.finalize();
    stmtDraft.finalize();

    console.log("✅ Database populated with 3 Projects, 15 Roles, and ~150 Drafts.");
});

db.close();

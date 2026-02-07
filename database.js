const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database (creates file if not exists)
const dbPath = path.resolve(__dirname, 'drafts.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    // Create Drafts Table
    db.run(`CREATE TABLE IF NOT EXISTS drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        content TEXT,
        project_id INTEGER,
        role_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create Projects Table
    db.run(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE
    )`);

    // Create Roles Table
    db.run(`CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        name TEXT,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`);

    // Attempt to add columns to existing drafts table if they don't exist
    // (This is a hacky migration for this simple setup)
    db.run("ALTER TABLE drafts ADD COLUMN project_id INTEGER", (err) => { /* ignore error if exists */ });
    db.run("ALTER TABLE drafts ADD COLUMN role_id INTEGER", (err) => { /* ignore error if exists */ });
}

module.exports = db;

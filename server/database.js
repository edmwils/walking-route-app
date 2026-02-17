const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'routes.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    fingerprint TEXT,
    start_location TEXT,
    distance REAL,
    unit TEXT,
    maps_url TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
        if (err) {
            console.error("Error creating table:", err.message);
        } else {
            console.log("Logs table ready.");
        }
    });
});

module.exports = db;

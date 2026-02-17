const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Allows all origins by default (OK for MVP)
app.use(bodyParser.json());

// Serve static files (React Frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback: Send index.html for any other route (React Router support)
app.get(/(.*)/, (req, res, next) => {
    // If request is for API, skip to next handler (which will 404)
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const { appendRow } = require('./sheets');

// API: Log a route
app.post('/api/log', (req, res) => {
    const { user_id, fingerprint, start_location, distance, unit, maps_url } = req.body;

    // Validate required fields
    if (!user_id || !maps_url) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Log to SQLite (Local/Ephemeral)
    const sql = `INSERT INTO logs (user_id, fingerprint, start_location, distance, unit, maps_url) VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [user_id, JSON.stringify(fingerprint), start_location, distance, unit, maps_url];

    db.run(sql, params, function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: err.message });
        }

        // 2. Log to Google Sheets (Persistent)
        appendRow({ user_id, fingerprint, start_location, distance, unit, maps_url });

        res.json({ message: 'Log saved', id: this.lastID });
    });
});

// API: Get all logs
app.get('/api/logs', (req, res) => {
    const sql = "SELECT * FROM logs ORDER BY timestamp DESC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Parse fingerprint JSON
        const parsedRows = rows.map(row => ({
            ...row,
            fingerprint: JSON.parse(row.fingerprint || '{}')
        }));

        res.json({ data: parsedRows });
    });
});

// Dashboard Route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Admin Dashboard available at http://localhost:${PORT}/admin`);
});

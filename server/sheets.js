const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Path to the key file (Try multiple locations for Docker/Render compatibility)
const POSSIBLE_PATHS = [
    path.join(__dirname, 'credentials.json'),        // Local / Docker (server/)
    path.join(__dirname, '../credentials.json'),     // Docker Root
    '/etc/secrets/credentials.json'                  // Render Native Secret Path
];

const authenticate = async () => {
    console.log("🔍 Attempting to authenticate with Google Sheets...");
    let keyPath = null;
    for (const p of POSSIBLE_PATHS) {
        console.log(`Checking path: ${p}`);
        if (fs.existsSync(p)) {
            keyPath = p;
            console.log(`✅ Found credentials at: ${keyPath}`);
            break;
        }
    }

    if (!keyPath) {
        console.error("❌ ERROR: credentials.json not found in any standard path.");
        console.error("Checked paths:", POSSIBLE_PATHS);
        console.error("Current Directory:", __dirname);
        try {
            console.error("Root Dir listing:", fs.readdirSync(path.join(__dirname, '..')));
            console.error("Server Dir listing:", fs.readdirSync(__dirname));
        } catch (e) { console.error("Could not list dirs:", e.message); }
        return null;
    }

    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: keyPath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const client = await auth.getClient();
        console.log("✅ OAuth Client created successfully.");
        return client;
    } catch (e) {
        console.error("❌ Authentication Failed:", e.message);
        return null;
    }
};

const appendRow = async (data) => {
    console.log("📝 appendRow called with data:", JSON.stringify(data));
    try {
        const client = await authenticate();
        if (!client) {
            console.error("❌ Aborting appendRow: No auth client.");
            return;
        }
        if (!SPREADSHEET_ID) {
            console.warn("⚠️ Warning: SPREADSHEET_ID not set.");
            return;
        }

        const sheets = google.sheets({ version: 'v4', auth: client });

        // Prepare the row: [Timestamp, UserID, Fingerprint, Location, Distance, Unit, MapsURL]
        const row = [
            new Date().toISOString(),
            data.user_id,
            JSON.stringify(data.fingerprint),
            data.start_location,
            data.distance,
            data.unit,
            data.maps_url
        ];

        console.log("📤 Sending data to Google Sheets API...");
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:G', // Appends to Sheet1
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [row],
            },
        });

        console.log("✅ SUCCESS: Logged to Google Sheets");

    } catch (error) {
        console.error("❌ Google Sheets Error:", error.message);
        if (error.response) {
            console.error("API Response:", JSON.stringify(error.response.data));
        }
    }
};

module.exports = { appendRow };

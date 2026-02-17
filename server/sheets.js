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
    let keyPath = null;
    for (const p of POSSIBLE_PATHS) {
        if (fs.existsSync(p)) {
            keyPath = p;
            console.log(`✅ Found credentials at: ${keyPath}`);
            break;
        }
    }

    if (!keyPath) {
        console.warn("⚠️ Warning: credentials.json not found in any standard path. Google Sheets logging will be skipped.");
        console.warn("Checked paths:", POSSIBLE_PATHS);
        return null;
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return auth.getClient();
};

const appendRow = async (data) => {
    try {
        const client = await authenticate();
        if (!client || !SPREADSHEET_ID) {
            if (!SPREADSHEET_ID) console.warn("⚠️ Warning: SPREADSHEET_ID not set.");
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

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:G', // Appends to Sheet1
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [row],
            },
        });

        console.log("✅ Logged to Google Sheets");

    } catch (error) {
        console.error("❌ Google Sheets Error:", error.message);
    }
};

module.exports = { appendRow };

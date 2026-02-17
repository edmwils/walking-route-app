const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Path to the key file (User must provide this)
const KEY_FILE_PATH = path.join(__dirname, 'credentials.json');

// Spreadsheet ID (Hardcoded for simplicity)
const SPREADSHEET_ID = '1Row6afvksoxHOQ-FCMiF-OLAb3UmIEw8thHGgLor3Fo';

const authenticate = async () => {
    if (!fs.existsSync(KEY_FILE_PATH)) {
        console.warn("⚠️ Warning: credentials.json not found in server/. Google Sheets logging will be skipped.");
        return null;
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE_PATH,
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

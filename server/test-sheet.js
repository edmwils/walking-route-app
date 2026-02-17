const { appendRow } = require('./sheets');

console.log("Testing Google Sheets Connection...");

const testData = {
    user_id: "test_user",
    fingerprint: { test: "true" },
    start_location: "Test Location",
    distance: 123,
    unit: "km",
    maps_url: "http://test.com"
};

appendRow(testData).then(() => {
    console.log("Test execution finished. Check the sheet.");
}).catch(err => {
    console.error("Test execution failed:", err);
});

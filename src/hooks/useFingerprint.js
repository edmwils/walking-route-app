import { useState, useEffect } from 'react';

export const useFingerprint = () => {
    const [fingerprint, setFingerprint] = useState(null);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        // 1. Get or Create User ID (UUID)
        let storedUserId = localStorage.getItem('walking_app_user_id');
        if (!storedUserId) {
            // Generate simple UUID
            storedUserId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('walking_app_user_id', storedUserId);
        }
        setUserId(storedUserId);

        // 2. Gather Device Info
        const info = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screen: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            browser: getBrowserName(navigator.userAgent),
            os: getOSName(navigator.userAgent)
        };
        setFingerprint(info);

    }, []);

    return { userId, fingerprint };
};

// Helpers
function getBrowserName(userAgent) {
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("SamsungBrowser")) return "Samsung Internet";
    if (userAgent.includes("Opera") || userAgent.includes("OPR")) return "Opera";
    if (userAgent.includes("Trident")) return "Internet Explorer";
    if (userAgent.includes("Edge")) return "Edge";
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Safari")) return "Safari";
    return "Unknown";
}

function getOSName(userAgent) {
    if (userAgent.indexOf("Win") !== -1) return "Windows";
    if (userAgent.indexOf("Mac") !== -1) return "MacOS";
    if (userAgent.indexOf("X11") !== -1) return "UNIX";
    if (userAgent.indexOf("Linux") !== -1) return "Linux";
    if (userAgent.indexOf("Android") !== -1) return "Android";
    if (userAgent.indexOf("like Mac") !== -1) return "iOS";
    return "Unknown";
}

/**
 * Calculates a new coordinate based on a start point, distance, and bearing.
 * 
 * @param {number} lat - Starting latitude
 * @param {number} lng - Starting longitude
 * @param {number} distanceKm - Distance to travel in kilometers
 * @param {number} bearingDegrees - Bearing in degrees (0-360)
 * @returns {Object} { lat: number, lng: number } - Destination coordinates
 */
export const calculateCoordinate = (lat, lng, distanceKm, bearingDegrees) => {
    const R = 6371; // Earth Radius in km
    const brng = bearingDegrees * (Math.PI / 180);
    const lat1 = lat * (Math.PI / 180);
    const lon1 = lng * (Math.PI / 180);

    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(distanceKm / R) +
        Math.cos(lat1) * Math.sin(distanceKm / R) * Math.cos(brng)
    );

    const lon2 = lon1 + Math.atan2(
        Math.sin(brng) * Math.sin(distanceKm / R) * Math.cos(lat1),
        Math.cos(distanceKm / R) - Math.sin(lat1) * Math.sin(lat2)
    );

    return {
        lat: lat2 * (180 / Math.PI),
        lng: lon2 * (180 / Math.PI)
    };
};

/**
 * Generates waypoints for a loop route (Triangle).
 * Start -> W1 -> W2 -> Start
 * Total Distance ~= 3 * SideLength.
 * Real World Distance ~= 3 * SideLength * Tortuosity(1.3).
 * So SideLength ~= TotalDistance / (3 * 1.3) ~= TotalDistance / 3.9
 * 
 * Triangle Logic ensures minimal overlap as it maximizes the area for the perimeter 
 * (closest to a circle we can get with 3 points).
 * 
 * @param {number} startLat 
 * @param {number} startLng 
 * @param {number} totalDistanceKm 
 * @param {string|number} seed - Random seed for variety
 * @returns {Array} [ {lat, lng}, {lat, lng} ]
 */
export const calculateLoopWaypoints = (startLat, startLng, totalDistanceKm, seed) => {
    // Tortuosity factor: Roads aren't straight. 
    // 1.3 is a standard urban correction factor.
    // However, Google Maps optimizes for shortest path, so it might "shortcut" our triangle.
    // To ensure we get CLOSE to the target, we should be slightly aggressive.
    // Let's use 4.0 divider.
    const sideLength = totalDistanceKm / 4.0;

    // Seeded Random function
    const seededRandom = (s) => {
        const str = s.toString();
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
        }
        const x = Math.sin(hash++) * 10000;
        return x - Math.floor(x);
    };

    const randomValue = seededRandom(seed);
    // Initial bearing
    const initialBearing = randomValue * 360;

    // Triangle: 60 degrees turn? 
    // If we walk Triangle, we turn 120 degrees at each vertex to close loop.
    // Bearing W1 from Start = initial
    // Bearing W2 from W1 = initial + 120
    // Bearing Start from W2 = initial + 240

    // Waypoint 1
    const w1 = calculateCoordinate(startLat, startLng, sideLength, initialBearing);

    // Waypoint 2: Turn 120 degrees from the first leg
    // This creates an equilateral triangle loop back to start.
    const w2 = calculateCoordinate(w1.lat, w1.lng, sideLength, (initialBearing + 120) % 360);

    return [w1, w2];
};

/**
 * Converts step count to kilometers using height.
 * Stride Length ~= Height * 0.415
 * 
 * @param {number} steps 
 * @param {number} heightCm 
 * @returns {number} - Distance in kilometers
 */
export const stepsToKm = (steps, heightCm) => {
    // Default height 170cm if not provided or 0
    const h = heightCm > 0 ? heightCm : 170;
    // Stride in Cm
    const strideCm = h * 0.415;
    const strideKm = strideCm / 100000;
    return steps * strideKm;
};

/**
 * Generates a Google Maps URL for a walking route with waypoints.
 * 
 * @param {Object} start - { lat, lng }
 * @param {Array} waypoints - Array of { lat, lng }
 * @returns {string} - Google Maps URL
 */
export const generateMapsUrl = (start, waypoints = []) => {
    const formatCoord = (point) => `${point.lat},${point.lng}`;
    const origin = formatCoord(start); // Start and End are same

    const destination = origin;

    // Waypoints parameter
    const waypointsStr = waypoints.map(formatCoord).join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypointsStr}&travelmode=walking`;
};

/**
 * Logs the generated route to the backend.
 * 
 * @param {Object} routeData - { startLocation, distance, unit, mapsUrl }
 * @param {Object} userSession - { userId, fingerprint }
 */
export const logRouteToBackend = async (routeData, userSession) => {
    // UNIFIED URL:
    // We use the full Render URL for ALL Production builds (Docker, Surge, Android).
    // This ensures mobile apps know where to send data.
    const API_URL = import.meta.env.DEV
        ? 'http://localhost:3000'
        : 'https://walking-route-app-docker.onrender.com';

    try {
        const response = await fetch(`${API_URL}/api/log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userSession.userId,
                fingerprint: userSession.fingerprint,
                start_location: routeData.startLocation,
                distance: routeData.distance,
                unit: routeData.unit,
                maps_url: routeData.mapsUrl
            })
        });
        console.log("Route logged successfully to", API_URL);
    } catch (error) {
        console.error("Failed to log route:", error);
    }
};

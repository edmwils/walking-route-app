import { useState, useEffect } from 'react'
import './App.css'
import { calculateLoopWaypoints, stepsToKm, generateMapsUrl, logRouteToBackend } from './utils/routeLogic'
import { useFingerprint } from './hooks/useFingerprint'

function App() {
  const [distance, setDistance] = useState(5)
  const [unit, setUnit] = useState('km') // 'km', 'miles', 'steps'
  const [height, setHeight] = useState(170) // cm
  const [startLocation, setStartLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [locationError, setLocationError] = useState('')

  const { userId, fingerprint } = useFingerprint();

  const handleUseCurrentLocation = () => {
    setLoading(true)
    setLocationError('')
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setStartLocation(`${latitude}, ${longitude}`)
        setLoading(false)
      },
      (error) => {
        console.error(error)
        setLocationError('Unable to retrieve your location')
        setLoading(false)
      }
    )
  }

  const handleGenerateRoute = () => {
    if (!startLocation) {
      alert("Please enter a starting location")
      return;
    }

    // Parse distance
    let distKm = parseFloat(distance);

    // Check constraints
    if (distKm <= 0) {
      alert("Please enter a valid distance.");
      return;
    }

    // Keep original units for logging before conversion
    const displayDistance = distance;
    const displayUnit = unit;

    if (unit === 'steps') {
      // Use height for stride length
      let h = parseFloat(height);
      if (!h || h < 50) h = 170; // Fallback or strict?
      distKm = stepsToKm(distKm, h);
    } else if (unit === 'miles') {
      distKm = distKm * 1.60934;
    }

    // Determine Seed
    // User requested "not the same one for the same inputs", so we use a random seed
    // or current timestamp to ensure uniqueness every time they click.
    const seed = Date.now().toString();

    const coords = startLocation.split(',').map(s => parseFloat(s.trim()));

    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      const startLat = coords[0];
      const startLng = coords[1];

      // Generate Loop Waypoints
      // We want a Loop. Start -> W1 -> W2 -> Start.
      const waypoints = calculateLoopWaypoints(startLat, startLng, distKm, seed);

      const url = generateMapsUrl({ lat: startLat, lng: startLng }, waypoints);

      // Log to Backend (Fire and Forget)
      if (userId) {
        logRouteToBackend({
          startLocation: startLocation,
          distance: displayDistance,
          unit: displayUnit,
          mapsUrl: url
        }, { userId, fingerprint });
      }

      window.open(url, '_blank');

    } else {
      alert("For the loop generator to work accurately, please use 'Current Location' or enter precise 'Lat, Long' coordinates.")
    }
  }

  return (
    <div className="container">
      <h1>Daily Walker</h1>
      <p className="subtitle">Discover a new loop every time.</p>

      <div className="input-group">
        <label>I want to walk</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
        </div>
      </div>

      <div className="toggle-group">
        <button
          className={`toggle-btn ${unit === 'km' ? 'active' : ''}`}
          onClick={() => setUnit('km')}
        >km</button>
        <button
          className={`toggle-btn ${unit === 'miles' ? 'active' : ''}`}
          onClick={() => setUnit('miles')}
        >miles</button>
        <button
          className={`toggle-btn ${unit === 'steps' ? 'active' : ''}`}
          onClick={() => setUnit('steps')}
        >steps</button>
      </div>

      {unit === 'steps' && (
        <div className="input-group animation-fade-in">
          <label>Your Height (cm) <span style={{ fontWeight: 'normal', fontSize: '0.8em', color: '#666' }}>- for stride accuracy</span></label>
          <input
            type="number"
            value={height}
            placeholder="170"
            onChange={(e) => setHeight(e.target.value)}
          />
        </div>
      )}

      <div className="input-group">
        <label>Start & End Point</label>
        <div className="location-input-wrapper">
          <input
            type="text"
            placeholder="Lat, Long or use button ->"
            value={startLocation}
            onChange={(e) => setStartLocation(e.target.value)}
          />
          <button
            className="geo-btn"
            onClick={handleUseCurrentLocation}
            title="Use Current Location"
          >
            📍
          </button>
        </div>
        {locationError && <p style={{ color: 'red', fontSize: '0.8rem' }}>{locationError}</p>}
        <p className="helper-text">Generates a meaningful loop starting and ending here.</p>
      </div>

      <button className="action-btn" onClick={handleGenerateRoute} disabled={loading}>
        {loading ? 'Locating...' : 'Generate Route'}
      </button>

      {/* Debug Info (Optional, verify ID creation) */}
      {/* <p style={{fontSize: '10px', color: '#333', marginTop: '20px'}}>Session: {userId}</p> */}
    </div>
  )
}

export default App

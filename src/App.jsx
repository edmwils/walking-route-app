import { useState, useEffect } from 'react'
import { Geolocation } from '@capacitor/geolocation';
import './App.css'
import { calculateLoopWaypoints, stepsToKm, generateMapsUrl, logRouteToBackend } from './utils/routeLogic'
import { useFingerprint } from './hooks/useFingerprint'

function App() {
  const [distance, setDistance] = useState(5)
  const [unit, setUnit] = useState('km') // 'km', 'miles', 'steps'
  const [height, setHeight] = useState(170) // cm
  const [mode, setMode] = useState('walking') // 'walking', 'cycling'
  const [startLocation, setStartLocation] = useState('')
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false) // Track if using GPS
  const [loading, setLoading] = useState(false)
  const [locationError, setLocationError] = useState('')

  const { userId, fingerprint } = useFingerprint();

  // Auto-fetch location on mount
  useEffect(() => {
    handleUseCurrentLocation();
  }, []);

  const handleUseCurrentLocation = async () => {
    setLoading(true)
    setLocationError('')

    try {
      const position = await Geolocation.getCurrentPosition();
      const { latitude, longitude } = position.coords;
      setStartLocation(`${latitude}, ${longitude}`);
      setIsUsingCurrentLocation(true);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLocationError('Could not auto-locate. Please enter location.');
      setIsUsingCurrentLocation(false);
      setLoading(false);
    }
  }

  const handleManualInput = (e) => {
    setStartLocation(e.target.value);
    setIsUsingCurrentLocation(false);
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

      const url = generateMapsUrl({ lat: startLat, lng: startLng }, waypoints, mode);

      // Log to Backend (Fire and Forget)
      if (userId) {
        logRouteToBackend({
          startLocation: startLocation,
          distance: displayDistance,
          unit: displayUnit,
          mapsUrl: url,
          mode: mode
        }, { userId, fingerprint });
      }

      window.open(url, '_blank');

    } else {
      alert("For the loop generator to work accurately, please use 'Current Location' or enter precise 'Lat, Long' coordinates.")
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Daily Loop</h1>
      </header>

      <main className="controls-wrapper">
        {/* Mode & Distance Row */}
        <div className="control-row">
          <div className="segmented-control">
            <button
              className={`segment-btn ${mode === 'walking' ? 'active' : ''}`}
              onClick={() => { setMode('walking'); if (unit === 'steps') setUnit('km'); }}
            >
              Walk
            </button>
            <button
              className={`segment-btn ${mode === 'cycling' ? 'active' : ''}`}
              onClick={() => { setMode('cycling'); setUnit('km'); }}
            >
              Cycle
            </button>
          </div>
        </div>

        <div className="control-row input-row">
          <div className="input-field-group">
            <label>Distance</label>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="5"
            />
          </div>
          <div className="unit-toggles">
            <button
              className={`unit-btn ${unit === 'km' ? 'active' : ''}`}
              onClick={() => setUnit('km')}
            >km</button>
            <button
              className={`unit-btn ${unit === 'miles' ? 'active' : ''}`}
              onClick={() => setUnit('miles')}
            >mi</button>
            {mode === 'walking' && (
              <button
                className={`unit-btn ${unit === 'steps' ? 'active' : ''}`}
                onClick={() => setUnit('steps')}
              >steps</button>
            )}
          </div>
        </div>

        {unit === 'steps' && mode === 'walking' && (
          <div className="control-row">
            <div className="input-field-group">
              <label>Height (cm)</label>
              <input
                type="number"
                value={height}
                placeholder="170"
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Location Section - Simplified */}
        <div className="control-row location-row">
          <div className="input-field-group full-width">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label>Start Location</label>
              {isUsingCurrentLocation && (
                <button
                  className="text-link-btn"
                  onClick={() => setIsUsingCurrentLocation(false)}
                >
                  Change
                </button>
              )}
            </div>

            {isUsingCurrentLocation ? (
              <div className="location-badge">
                <span className="location-dot"></span>
                <span className="location-text">Current Location</span>
              </div>
            ) : (
              <div className="location-input-container">
                <input
                  type="text"
                  placeholder="Current Location or Lat, Long"
                  value={startLocation}
                  onChange={handleManualInput}
                  autoFocus
                />
                <button
                  className="icon-btn"
                  onClick={handleUseCurrentLocation}
                  title="Use Current Location"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                </button>
              </div>
            )}
          </div>
        </div>
        {locationError && <p className="error-text">{locationError}</p>}

        <button className="primary-action-btn" onClick={handleGenerateRoute} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Route'}
        </button>
      </main>
    </div>
  )
}

export default App

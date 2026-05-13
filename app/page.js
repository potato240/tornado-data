'use client';

import { useState, useEffect, useRef } from 'react';

const EF_COLORS = {
  'EF0': '#4caf50',
  'EF1': '#8bc34a',
  'EF2': '#ffc107',
  'EF3': '#ff9800',
  'EF4': '#f44336',
  'EF5': '#9c27b0',
};

const US_STATES = [
  'ALABAMA','ALASKA','ARIZONA','ARKANSAS','CALIFORNIA','COLORADO','CONNECTICUT',
  'DELAWARE','FLORIDA','GEORGIA','HAWAII','IDAHO','ILLINOIS','INDIANA','IOWA',
  'KANSAS','KENTUCKY','LOUISIANA','MAINE','MARYLAND','MASSACHUSETTS','MICHIGAN',
  'MINNESOTA','MISSISSIPPI','MISSOURI','MONTANA','NEBRASKA','NEVADA','NEW HAMPSHIRE',
  'NEW JERSEY','NEW MEXICO','NEW YORK','NORTH CAROLINA','NORTH DAKOTA','OHIO',
  'OKLAHOMA','OREGON','PENNSYLVANIA','RHODE ISLAND','SOUTH CAROLINA','SOUTH DAKOTA',
  'TENNESSEE','TEXAS','UTAH','VERMONT','VIRGINIA','WASHINGTON','WEST VIRGINIA',
  'WISCONSIN','WYOMING'
];

function efColor(ef) {
  return EF_COLORS[ef] || '#888';
}

function fadeLine(map, line, onDone) {
  let opacity = 1.0;
  const fade = setInterval(() => {
    opacity -= 0.05;
    if (opacity <= 0) {
      clearInterval(fade);
      map.removeLayer(line);
      if (onDone) onDone();
    } else {
      line.setStyle({ opacity });
    }
  }, 40);
  return fade;
}

function animateLine(map, L, lat1, lon1, lat2, lon2, color, trackMiles, onDone) {
  const duration = Math.min(4000, Math.max(800, trackMiles * 100));
  const steps = 60;
  const interval = duration / steps;

  const points = [];
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    points.push([lat1 + (lat2 - lat1) * frac, lon1 + (lon2 - lon1) * frac]);
  }

  const animLine = L.polyline([], { color, weight: 6, opacity: 1 }).addTo(map);
  const dot = L.circleMarker(points[0], {
    radius: 8, color: 'white', fillColor: color, fillOpacity: 1, weight: 2,
  }).addTo(map);

  let step = 0;
  const timer = setInterval(() => {
    if (step > steps) {
      clearInterval(timer);
      map.removeLayer(dot);
      setTimeout(() => fadeLine(map, animLine, onDone), 400);
      return;
    }
    animLine.setLatLngs(points.slice(0, step + 1));
    dot.setLatLng(points[step]);
    step++;
  }, interval);

  return { animLine, dot, timer };
}

export default function Home() {
  const [tornadoes, setTornadoes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [efScale, setEfScale] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const layersRef = useRef([]);
  const playbackRef = useRef(null);

  const fetchData = async (ef, state) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (ef) params.append('ef', ef);
    if (state) params.append('state', state);
    params.append('limit', '2000');
    const res = await fetch(`/api/tornadoes?${params}`);
    const json = await res.json();
    setTornadoes(json.data || []);
    setTotal(json.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    if (leafletMapRef.current) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      const L = window.L;
      const map = L.map(mapRef.current).setView([37.5, -93], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
      leafletMapRef.current = map;
      fetchData('', '');
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return;
    const L = window.L;
    const map = leafletMapRef.current;

    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];

    tornadoes.forEach(t => {
      const lat1 = parseFloat(t.beginLat);
      const lon1 = parseFloat(t.beginLon);
      const lat2 = parseFloat(t.endLat);
      const lon2 = parseFloat(t.endLon);
      if (isNaN(lat1) || isNaN(lon1)) return;

      const color = efColor(t.efScale);
      const hasTrack = !isNaN(lat2) && !isNaN(lon2) && (lat2 !== 0 || lon2 !== 0);
      const trackMiles = parseFloat(t.trackLengthMiles) || 1;

      let layer;
      if (hasTrack) {
        layer = L.polyline([[lat1, lon1], [lat2, lon2]], { color, weight: 3, opacity: 0.8 }).addTo(map);
      } else {
        layer = L.circleMarker([lat1, lon1], { radius: 5, color, fillColor: color, fillOpacity: 0.8 }).addTo(map);
      }

      const playBtn = hasTrack
        ? `<button onclick="window._animateSingle(${lat1},${lon1},${lat2},${lon2},'${color}',${trackMiles})"
            style="margin-top:8px;padding:5px 12px;background:${color};color:white;border:none;border-radius:4px;cursor:pointer;font-family:monospace;font-size:0.85rem;width:100%;">
            ▶ Play track
           </button>`
        : '';

      const narrative = t.eventNarrative || t.episodeNarrative;
      const narrativeHtml = narrative
        ? `<hr style="margin:6px 0"/><div style="font-size:0.78rem;color:#333;line-height:1.4;max-height:120px;overflow-y:auto;white-space:normal;word-wrap:break-word;">${narrative}</div>`
        : '';
      const name = t.eventName
        ? `<div style="font-size:0.95rem;font-weight:bold;margin-bottom:4px;">${t.eventName}</div>`
        : '';

      const popup = `
        <div style="font-family:monospace;width:260px;">
          ${name}
          <span style="font-size:1.1rem;font-weight:bold;color:${color}">${t.efScale}</span>
          &nbsp;<span style="font-size:0.82rem;">${t.date}</span><br/>
          <span style="font-size:0.85rem;">${t.county}, ${t.state}</span>
          <hr style="margin:6px 0"/>
          <table style="font-size:0.8rem;border-collapse:collapse;width:100%;">
            <tr><td style="color:#666;padding:1px 6px 1px 0;">Track length</td><td><b>${t.trackLengthMiles || '?'} miles</b></td></tr>
            <tr><td style="color:#666;padding:1px 6px 1px 0;">Track width</td><td><b>${t.trackWidthYards || '?'} yards</b></td></tr>
            <tr><td style="color:#666;padding:1px 6px 1px 0;">Deaths</td><td><b>${t.deaths || 0}</b></td></tr>
            <tr><td style="color:#666;padding:1px 6px 1px 0;">Injuries</td><td><b>${t.injuries || 0}</b></td></tr>
            <tr><td style="color:#666;padding:1px 6px 1px 0;">Property damage</td><td><b>${t.propertyDamage || 'Unknown'}</b></td></tr>
            <tr><td style="color:#666;padding:1px 6px 1px 0;">Crops lost</td><td><b>${t.cropsLost || 'None'}</b></td></tr>
          </table>
          ${playBtn}
          ${narrativeHtml}
        </div>`;

      layer.bindPopup(popup, { maxWidth: 280 });
      layersRef.current.push(layer);
    });

    // Single tornado animation (from popup)
    window._animateSingle = (lat1, lon1, lat2, lon2, color, trackMiles) => {
      const L = window.L;
      const map = leafletMapRef.current;
      setTimeout(() => map.closePopup(), 50);
      if (window._singleAnim) {
        clearInterval(window._singleAnim.timer);
        map.removeLayer(window._singleAnim.animLine);
        map.removeLayer(window._singleAnim.dot);
      }
      window._singleAnim = animateLine(map, L, lat1, lon1, lat2, lon2, color, trackMiles, null);
    };

  }, [tornadoes]);

  // State playback
  const handleStatePlay = () => {
    if (!selectedState) return;
    if (isPlaying) {
      // Stop
      if (playbackRef.current) clearTimeout(playbackRef.current);
      setIsPlaying(false);
      return;
    }

    const map = leafletMapRef.current;
    const L = window.L;
    map.closePopup();

    // Get tornadoes with valid tracks, sorted by date
    const playable = tornadoes
      .filter(t => {
        const lat2 = parseFloat(t.endLat);
        const lon2 = parseFloat(t.endLon);
        return !isNaN(parseFloat(t.beginLat)) && !isNaN(parseFloat(t.beginLon))
          && !isNaN(lat2) && !isNaN(lon2) && (lat2 !== 0 || lon2 !== 0);
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (playable.length === 0) return;

    setIsPlaying(true);

    // Zoom to state
    const lats = playable.map(t => parseFloat(t.beginLat)).filter(Boolean);
    const lons = playable.map(t => parseFloat(t.beginLon)).filter(Boolean);
    if (lats.length) {
      const bounds = L.latLngBounds(
        [Math.min(...lats) - 1, Math.min(...lons) - 1],
        [Math.max(...lats) + 1, Math.max(...lons) + 1]
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    let index = 0;
    const playNext = () => {
      if (index >= playable.length) {
        setIsPlaying(false);
        return;
      }
      const t = playable[index];
      index++;
      const lat1 = parseFloat(t.beginLat);
      const lon1 = parseFloat(t.beginLon);
      const lat2 = parseFloat(t.endLat);
      const lon2 = parseFloat(t.endLon);
      const color = efColor(t.efScale);
      const trackMiles = parseFloat(t.trackLengthMiles) || 1;

      animateLine(map, L, lat1, lon1, lat2, lon2, color, trackMiles, null);

      // Start next one 500ms after this one starts
      playbackRef.current = setTimeout(playNext, 500);
    };

    playNext();
  };

  const handleEfFilter = (ef) => {
    setEfScale(ef);
    fetchData(ef, selectedState);
  };

  const handleStateChange = (e) => {
    setSelectedState(e.target.value);
    fetchData(efScale, e.target.value);
  };

  return (
    <main style={{ fontFamily: 'monospace', height: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a2e' }}>
      <div style={{ padding: '0.75rem 1.5rem', background: '#16213e', color: 'white', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem' }}>🌪 Tornado Explorer — 2011</h1>

        {/* EF filters */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ color: '#aaa', fontSize: '0.8rem' }}>EF:</span>
          <button onClick={() => handleEfFilter('')} style={btnStyle(efScale === '', '#555')}>All</button>
          {Object.entries(EF_COLORS).map(([ef, color]) => (
            <button key={ef} onClick={() => handleEfFilter(ef)} style={btnStyle(efScale === ef, color)}>{ef}</button>
          ))}
        </div>

        {/* State playback */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
          <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Play state:</span>
          <select
            value={selectedState}
            onChange={handleStateChange}
            style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem', background: '#0f3460', color: 'white', border: '1px solid #444', borderRadius: '4px', fontFamily: 'monospace' }}
          >
            <option value=''>All states</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={handleStatePlay}
            disabled={!selectedState}
            style={{
              padding: '0.3rem 1rem',
              fontSize: '0.85rem',
              background: isPlaying ? '#e63946' : (selectedState ? '#4caf50' : '#333'),
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedState ? 'pointer' : 'not-allowed',
              fontFamily: 'monospace',
            }}
          >
            {isPlaying ? '⏹ Stop' : '▶ Play'}
          </button>
        </div>

        {/* Count */}
        <div style={{ color: '#aaa', fontSize: '0.8rem' }}>
          {loading ? 'Loading...' : `${total} tornadoes`}
        </div>
      </div>

      <div ref={mapRef} style={{ flex: 1 }} />
    </main>
  );
}

function btnStyle(active, color) {
  return {
    padding: '0.25rem 0.6rem',
    fontSize: '0.8rem',
    background: active ? color : 'transparent',
    color: active ? 'white' : '#ccc',
    border: `1px solid ${color}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'monospace',
  };
}

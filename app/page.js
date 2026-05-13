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

function efColor(ef) {
  return EF_COLORS[ef] || '#888';
}

export default function Home() {
  const [tornadoes, setTornadoes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [efScale, setEfScale] = useState('');
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const layersRef = useRef([]);
  const animationRef = useRef(null);

  const fetchData = async (ef) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (ef) params.append('ef', ef);
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
      fetchData('');
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

      // Draw the static line or marker
      let layer;
      if (hasTrack) {
        layer = L.polyline([[lat1, lon1], [lat2, lon2]], {
          color, weight: 3, opacity: 0.8,
        }).addTo(map);
      } else {
        layer = L.circleMarker([lat1, lon1], {
          radius: 5, color, fillColor: color, fillOpacity: 0.8,
        }).addTo(map);
      }

      // Build popup with Play button if we have a track
      const playBtn = hasTrack
        ? `<button onclick="window._animateTornado('${t.id}',${lat1},${lon1},${lat2},${lon2},'${color}')" 
            style="margin-top:8px; padding:4px 12px; background:${color}; color:white; border:none; border-radius:4px; cursor:pointer; font-family:monospace; font-size:0.85rem; width:100%;">
            ▶ Play track
           </button>`
        : '';

      const narrative = t.eventNarrative || t.episodeNarrative;
      const narrativeHtml = narrative
        ? `<hr style="margin:6px 0"/><div style="font-size:0.78rem; color:#333; line-height:1.4; max-height:120px; overflow-y:auto; white-space:normal; word-wrap:break-word;">${narrative}</div>`
        : '';

      const name = t.eventName ? `<div style="font-size:0.95rem; font-weight:bold; margin-bottom:4px;">${t.eventName}</div>` : '';

      const popup = `
        <div style="font-family:monospace; width:260px;">
          ${name}
          <span style="font-size:1.1rem; font-weight:bold; color:${color}">${t.efScale}</span>
          &nbsp;<span style="font-size:0.82rem;">${t.date}</span><br/>
          <span style="font-size:0.85rem;">${t.county}, ${t.state}</span>
          <hr style="margin:6px 0"/>
          <table style="font-size:0.8rem; border-collapse:collapse; width:100%;">
            <tr><td style="color:#666;padding:1px 6px 1px 0;">Track length</td><td><b>${t.trackLengthMiles || '?'} miles</b></td></tr>
            <tr><td style="color:#666;padding:1px 6px 1px 0;">Track width</td><td><b>${t.trackWidthYards || '?'} yards</b></td></tr>
            <tr><td style="color:#666;padding:1px 6px 1px 0;">Deaths</td><td><b>${t.deaths || 0}</b></td></tr>
            <tr><td style="color:#666;padding:1px 6px 1px 0;">Injuries</td><td><b>${t.injuries || 0}</b></td></tr>
            <tr><td style="color:#666;padding:1px 6px 1px 0;">Property damage</td><td><b>${t.propertyDamage || 'Unknown'}</b></td></tr>
            <tr><td style="color:#666;padding:1px 6px 1px 0;">Crops lost</td><td><b>${t.cropsLost || 'None'}</b></td></tr>
          </table>
          ${playBtn}
          ${narrativeHtml}
        </div>
      `;

      layer.bindPopup(popup, { maxWidth: 280 });
      layersRef.current.push(layer);
    });

    // Global animation function called from popup button
    window._animateTornado = (id, lat1, lon1, lat2, lon2, color) => {
      const L = window.L;
      const map = leafletMapRef.current;

      // Remove any existing animation layer
      if (window._animLayer) map.removeLayer(window._animLayer);
      if (window._animMarker) map.removeLayer(window._animMarker);

      // Animated line starts empty
      const animLine = L.polyline([], {
        color, weight: 5, opacity: 1,
      }).addTo(map);
      window._animLayer = animLine;

      // Moving dot at the tip
      const dot = L.circleMarker([lat1, lon1], {
        radius: 7, color: 'white', fillColor: color, fillOpacity: 1, weight: 2,
      }).addTo(map);
      window._animMarker = dot;

      // Animate over 2 seconds
      const steps = 60;
      const duration = 2000;
      const interval = duration / steps;
      let step = 0;

      const points = [];
      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        points.push([
          lat1 + (lat2 - lat1) * frac,
          lon1 + (lon2 - lon1) * frac,
        ]);
      }

      const timer = setInterval(() => {
        if (step > steps) {
          clearInterval(timer);
          map.removeLayer(dot);
          return;
        }
        animLine.setLatLngs(points.slice(0, step + 1));
        dot.setLatLng(points[step]);
        step++;
      }, interval);
    };

  }, [tornadoes]);

  const handleFilter = (ef) => {
    setEfScale(ef);
    fetchData(ef);
  };

  return (
    <main style={{ fontFamily: 'monospace', height: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a2e' }}>
      <div style={{ padding: '1rem 1.5rem', background: '#16213e', color: 'white', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>🌪 Tornado Explorer — 2011</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Filter:</span>
          <button onClick={() => handleFilter('')} style={btnStyle(efScale === '', '#555')}>All</button>
          {Object.entries(EF_COLORS).map(([ef, color]) => (
            <button key={ef} onClick={() => handleFilter(ef)} style={btnStyle(efScale === ef, color)}>{ef}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {loading
            ? <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Loading...</span>
            : <span style={{ color: '#aaa', fontSize: '0.85rem' }}>{total} tornadoes</span>
          }
        </div>
      </div>
      <div ref={mapRef} style={{ flex: 1 }} />
    </main>
  );
}

function btnStyle(active, color) {
  return {
    padding: '0.3rem 0.75rem',
    fontSize: '0.85rem',
    background: active ? color : 'transparent',
    color: active ? 'white' : '#ccc',
    border: `1px solid ${color}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'monospace',
  };
}

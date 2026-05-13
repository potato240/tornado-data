'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [tornadoes, setTornadoes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState('');
  const [efScale, setEfScale] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (efScale) params.append('ef', efScale);
    params.append('limit', '50');

    const res = await fetch(`/api/tornadoes?${params}`);
    const json = await res.json();
    setTornadoes(json.data || []);
    setTotal(json.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌪 Tornado Data Explorer</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>2011 NOAA Storm Events Database</p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Filter by state e.g. ALABAMA"
          value={state}
          onChange={e => setState(e.target.value.toUpperCase())}
          style={{ padding: '0.5rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px', width: '250px' }}
        />
        <select
          value={efScale}
          onChange={e => setEfScale(e.target.value)}
          style={{ padding: '0.5rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="">All EF Ratings</option>
          <option value="EF0">EF0</option>
          <option value="EF1">EF1</option>
          <option value="EF2">EF2</option>
          <option value="EF3">EF3</option>
          <option value="EF4">EF4</option>
          <option value="EF5">EF5</option>
        </select>
        <button
          onClick={fetchData}
          style={{ padding: '0.5rem 1.5rem', fontSize: '1rem', background: '#e63946', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Search
        </button>
      </div>

      {/* Summary */}
      {!loading && (
        <p style={{ marginBottom: '1rem', color: '#444' }}>
          Found <strong>{total}</strong> tornadoes — showing first 50
        </p>
      )}

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#1d1d1d', color: 'white' }}>
                <th style={th}>Date</th>
                <th style={th}>State</th>
                <th style={th}>County</th>
                <th style={th}>EF</th>
                <th style={th}>Track (mi)</th>
                <th style={th}>Width (yd)</th>
                <th style={th}>Deaths</th>
                <th style={th}>Injuries</th>
                <th style={th}>Damage</th>
              </tr>
            </thead>
            <tbody>
              {tornadoes.map((t, i) => (
                <tr key={t.id} style={{ background: i % 2 === 0 ? '#f9f9f9' : 'white' }}>
                  <td style={td}>{t.date}</td>
                  <td style={td}>{t.state}</td>
                  <td style={td}>{t.county}</td>
                  <td style={{ ...td, fontWeight: 'bold', color: efColor(t.efScale) }}>{t.efScale}</td>
                  <td style={td}>{t.trackLengthMiles}</td>
                  <td style={td}>{t.trackWidthYards}</td>
                  <td style={td}>{t.deaths}</td>
                  <td style={td}>{t.injuries}</td>
                  <td style={td}>{t.propertyDamage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

const th = { padding: '0.6rem 1rem', textAlign: 'left' };
const td = { padding: '0.5rem 1rem', borderBottom: '1px solid #eee' };

function efColor(ef) {
  const colors = {
    EF0: '#4caf50',
    EF1: '#8bc34a',
    EF2: '#ffc107',
    EF3: '#ff9800',
    EF4: '#f44336',
    EF5: '#9c27b0',
  };
  return colors[ef] || '#333';
}

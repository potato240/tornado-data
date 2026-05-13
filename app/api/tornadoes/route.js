import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state');
  const efScale = searchParams.get('ef');
  const limit = parseInt(searchParams.get('limit') || '100');

  try {
    const csvPath = path.join(process.cwd(), 'public', 'data', 'TornadoData.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf8');

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // Filter to tornadoes only
    let tornadoes = records.filter(row => row.EVENT_TYPE === 'Tornado');

    // Optional filters
    if (state) {
      tornadoes = tornadoes.filter(row =>
        row.STATE?.toUpperCase() === state.toUpperCase()
      );
    }

    if (efScale) {
      tornadoes = tornadoes.filter(row => row.TOR_F_SCALE === efScale);
    }

    const results = tornadoes.slice(0, limit).map(row => ({
      id: row.EVENT_ID,
      date: row.BEGIN_DATE_TIME,
      state: row.STATE,
      county: row.CZ_NAME,
      efScale: row.TOR_F_SCALE,
      trackLengthMiles: row.TOR_LENGTH,
      trackWidthYards: row.TOR_WIDTH,
      deaths: row.DEATHS_DIRECT,
      injuries: row.INJURIES_DIRECT,
      propertyDamage: row.DAMAGE_PROPERTY,
      cropsLost: row.DAMAGE_CROPS,
      beginLat: row.BEGIN_LAT,
      beginLon: row.BEGIN_LON,
      endLat: row.END_LAT,
      endLon: row.END_LON,
      eventName: row.EVENT_NAME,
      episodeNarrative: row.EPISODE_NARRATIVE,
      eventNarrative: row.EVENT_NARRATIVE,
    }));

    return NextResponse.json({
      total: tornadoes.length,
      returned: results.length,
      data: results,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Could not read tornado data', detail: error.message },
      { status: 500 }
    );
  }
}

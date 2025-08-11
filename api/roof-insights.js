// /api/roof-insights.js
export default async function handler(req, res) {
  // CORS (útil si llamas desde Webflow)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { lat, lng } = req.query || {};
    if (!lat || !lng) return res.status(400).json({ error: 'lat y lng son requeridos' });

    const apiKey = process.env.GOOGLE_SOLAR_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Falta GOOGLE_SOLAR_API_KEY' });

    const base = 'https://solar.googleapis.com/v1/buildingInsights:findClosest';
    const makeUrl = (q) =>
      `${base}?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=${q}&key=${apiKey}`;

    // 1) Intento con HIGH
    let r = await fetch(makeUrl('HIGH'));
    let raw = await r.text();
    let data = safeJSON(raw);

    // 2) Si falla o no hay polígono, reintenta con MEDIUM
    let coords = getCoords(data);
    if (!r.ok || !coords) {
      r = await fetch(makeUrl('MEDIUM'));
      raw = await r.text();
      data = safeJSON(raw);
      coords = getCoords(data);
    }

    // 3) Si no hay polígono tras ambos intentos → hasFootprint:false
    if (!coords || coords.length < 3) {
      return res.status(200).json({ hasFootprint: false });
    }

    return res.status(200).json({
      hasFootprint: true,
      type: 'Polygon',
      coordinates: coords, // [[lng,lat], ...]
    });
  } catch (e) {
    console.error('roof-insights error:', e);
    return res.status(500).json({ error: 'Server crashed', message: e.message });
  }
}

function safeJSON(t) {
  try { return JSON.parse(t); } catch { return null; }
}

function getCoords(d) {
  return d?.solarPotential?.wholeRoofStats?.roofAreaPolygon?.coordinates?.[0] || null;
}

export default async function handler(req, res) {
  // CORS opcional si llamas desde Webflow
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { lat, lng } = req.query || {};
    if (!lat || !lng) return res.status(400).json({ error: 'lat y lng son requeridos' });

    const apiKey = process.env.GOOGLE_SOLAR_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Falta GOOGLE_SOLAR_API_KEY' });

    const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${apiKey}`;

    const r = await fetch(url);
    const raw = await r.text();

    let data;
    try { data = JSON.parse(raw); }
    catch { return res.status(r.status || 502).json({ error: 'Proveedor no devolvió JSON' }); }

    if (!r.ok) return res.status(r.status).json({ error: 'Upstream error', details: data });

    const coords = data?.solarPotential?.wholeRoofStats?.roofAreaPolygon?.coordinates?.[0];
    if (!coords || coords.length < 3) return res.status(200).json({}); // sin footprint → usa dibujo manual

    return res.status(200).json({ type: 'Polygon', coordinates: coords });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server crashed', message: e.message });
  }
}

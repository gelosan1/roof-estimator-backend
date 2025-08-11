import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const { lat, lng, address } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat,lng requeridos' });

    const apiKey = process.env.GOOGLE_SOLAR_API_KEY;
    const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${apiKey}`;
    const r = await fetch(url);
    const json = await r.json();

    if (!json?.solarPotential?.wholeRoofStats?.roofAreaPolygon) {
      return res.status(200).json({});
    }

    const coordinates = json.solarPotential.wholeRoofStats.roofAreaPolygon.coordinates[0];
    res.status(200).json({ type: 'Polygon', coordinates: coordinates });
  } catch (e) {
    res.status(500).json({ error: 'Error interno' });
  }
}

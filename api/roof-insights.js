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


// asumiendo que ya tienes: map, drawingManager, roofPolygon, computePolygonStats(), enableQuoteButton()

if (data?.hasFootprint) {
  setPolygonFromGeoJSON(data.coordinates); // [[lng,lat],...]
} else {
  // --- MODO DIBUJO AUTOMÁTICO ---
  drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);

  // Overlay de ayuda (simple)
  const help = document.createElement('div');
  help.id = 'rq-help';
  help.style.cssText = 'position:absolute;top:12px;left:50%;transform:translateX(-50%);background:#111827;color:#fff;padding:8px 12px;border-radius:10px;font:600 13px/1 system-ui;z-index:9999';
  help.textContent = 'Dibuja el contorno del techo punto por punto. Doble clic para cerrar.';
  document.body.appendChild(help);

  // Cuando el usuario termine el polígono:
  google.maps.event.addListenerOnce(drawingManager, 'polygoncomplete', function(poly){
    if (document.getElementById('rq-help')) document.getElementById('rq-help').remove();
    drawingManager.setDrawingMode(null);
    // guarda y calcula
    if (window.roofPolygon) window.roofPolygon.setMap(null);
    window.roofPolygon = poly;
    computePolygonStats(roofPolygon);
    enableQuoteButton();
  });

  alert('Sin footprint automático. Por favor, dibuja el contorno del techo con la herramienta Polígono.');
}

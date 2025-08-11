import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const MATERIAL_RATES = { asphalt: 4.5, metal: 9, tile: 12, flat: 7 };

export default async function handler(req, res) {
  // CORS opcional
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { address, material, stories, waste, area_ft2, perimeter_ft, lead } = req.body || {};
    if (!address || !material || !lead?.email || !area_ft2) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const base = MATERIAL_RATES[material] || MATERIAL_RATES.asphalt;
    const storiesFactor = stories >= 3 ? 1.2 : stories == 2 ? 1.1 : 1.0;
    const wasteFactor = 1 + (parseFloat(waste) || 0.15);
    const perimeterAdd = (perimeter_ft || 0) * 2.0;

    const total = Math.round(area_ft2 * base * wasteFactor * storiesFactor + perimeterAdd);
    const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total);

    await sgMail.send({
      to: lead.email,
      from: process.env.SEND_FROM_EMAIL,
      subject: 'Tu presupuesto instantáneo de techo',
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif">
          <h2>Tu presupuesto estimado de techo</h2>
          <p><b>Dirección:</b> ${address}</p>
          <p><b>Material:</b> ${material}</p>
          <p><b>Área:</b> ${area_ft2} ft² — <b>Perímetro:</b> ${perimeter_ft || 'N/D'} ft</p>
          <h1>${formatted}</h1>
          <p style="color:#555">* Estimación preliminar sujeta a verificación.</p>
        </div>
      `,
    });

    return res.status(200).json({ total, formatted_total: formatted });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server crashed', message: e.message });
  }
}

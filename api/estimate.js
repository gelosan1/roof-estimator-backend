import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const MATERIAL_RATES = {
  asphalt: 4.50,
  metal: 9.00,
  tile: 12.00,
  flat: 7.00
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { address, material, stories, waste, area_ft2, perimeter_ft, lead } = req.body;
    if (!address || !material || !lead?.email || !area_ft2) return res.status(400).json({ error: 'Datos incompletos' });

    const base = MATERIAL_RATES[material] || MATERIAL_RATES.asphalt;
    const storiesFactor = (stories >= 3) ? 1.20 : (stories == 2 ? 1.10 : 1.00);
    const wasteFactor = 1 + (parseFloat(waste) || 0.15);
    const perimeterAdd = (perimeter_ft || 0) * 2.0;
    const matLabor = area_ft2 * base * wasteFactor * storiesFactor;
    const total = Math.round(matLabor + perimeterAdd);

    const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total);

    const html = `
      <h2>Presupuesto estimado</h2>
      <p><b>Dirección:</b> ${address}</p>
      <p><b>Material:</b> ${material}</p>
      <p><b>Área:</b> ${area_ft2} ft² — <b>Perímetro:</b> ${perimeter_ft} ft</p>
      <h1>${formatted}</h1>
      <p>* Estimación preliminar sujeta a verificación.</p>
    `;

    await sgMail.send({
      to: lead.email,
      from: process.env.SEND_FROM_EMAIL,
      subject: 'Tu presupuesto de techo',
      html
    });

    res.status(200).json({ total, formatted_total: formatted });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error interno' });
  }
}

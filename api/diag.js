export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  return res.status(200).json({
    ok: true,
    env: {
      GOOGLE_SOLAR_API_KEY: !!process.env.GOOGLE_SOLAR_API_KEY,
      SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
      SEND_FROM_EMAIL: !!process.env.SEND_FROM_EMAIL
    },
    node: process.version
  });
}

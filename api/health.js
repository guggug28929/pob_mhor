export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true, ai: Boolean(process.env.OPENAI_API_KEY) });
}

const { PONTOS_RETIRADA } = require('./_config');

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const publicKey = (process.env.MP_PUBLIC_KEY || '').trim();
  if (!publicKey) {
    return res.status(500).json({ error: 'MP_PUBLIC_KEY não configurada na Vercel' });
  }
  return res.status(200).json({ publicKey, pontos: PONTOS_RETIRADA });
};

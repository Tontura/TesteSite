const { cotarFrete } = require('./_superfrete');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const { cep, itens } = req.body || {};
    const c = String(cep || '').replace(/\D/g, '');
    if (c.length !== 8 || !Array.isArray(itens) || !itens.length) {
      return res.status(400).json({ erro: 'CEP ou carrinho inválido' });
    }
    return res.status(200).json({ opcoes: await cotarFrete(c, itens) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Não foi possível calcular o frete agora.' });
  }
};

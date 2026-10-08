// api/criar-pagamento.js
const { MercadoPagoConfig, Preference } = require('mercadopago');
const PRODUTOS = require('../produtos.js');


// Monta a URL base do site de forma segura (ignora colchetes, aspas, espaços, caminho etc.)
function baseDoSite(req) {
  const bruto = String(process.env.SITE_URL || '');
  const achado = bruto.match(/https?:\/\/[^\s\[\]()"'<>]+/);
  let url = achado ? achado[0] : bruto.replace(/[\s\[\]()"'<>]/g, '');
  if (!url) url = req.headers['x-forwarded-host'] || req.headers.host || '';
  url = url.replace(/^https?:\/\//, '').split('/')[0];
  return `https://${url}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  try {
    const { itens } = req.body || {};

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: 'Carrinho vazio ou formato inválido' });
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({ erro: 'MP_ACCESS_TOKEN não configurado na Vercel' });
    }











    const itemsMercadoPago = [];
    const resumoPedido = [];


    for (const item of itens) {
      const p = PRODUTOS.find(x => x.id === item.id);
      if (!p) {
        return res.status(400).json({ erro: `Item não encontrado no catálogo (ID: ${item.id}).` });
      }

      const quantidade = Number(item.qtd);
      if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 20) {
        return res.status(400).json({ erro: `Quantidade inválida para ${p.nome}.` });
      }
      if (!p.tamanhos.includes(item.tamanho)) {
        return res.status(400).json({ erro: `Tamanho inválido para ${p.nome}.` });
      }

      // Cor e estampa: obrigatórias se o produto as oferece, proibidas se não oferece
      const temCor = Array.isArray(p.cores) && p.cores.length > 0;
      const temEstampa = Array.isArray(p.estampas) && p.estampas.length > 0;
      const corOk = temCor ? p.cores.some(c => c.nome === item.cor) : !item.cor;
      const estampaOk = temEstampa ? p.estampas.includes(item.estampa) : !item.estampa;
      if (!corOk || !estampaOk) {
        return res.status(400).json({
          erro: `${p.nome}: remova do carrinho e adicione de novo, escolhendo cor e estampa.`
        });
      }

      const partes = [`${p.nome} - Tam: ${item.tamanho}`];
      if (temCor) partes.push(`Cor: ${item.cor}`);
      if (temEstampa) partes.push(`Estampa: ${item.estampa}`);

      itemsMercadoPago.push({
        id: p.id,
        title: partes.join(' - '),
        unit_price: Number(p.preco),
        quantity: quantidade,
        currency_id: 'BRL'
      });


      const detalhe = [item.tamanho, temCor ? item.cor : null, temEstampa ? item.estampa : null]
        .filter(Boolean).join('/');
      resumoPedido.push(`${quantidade}x ${p.nome} (${detalhe})`);
    }









    const baseUrl = baseDoSite(req);
    try { new URL(baseUrl); } catch (e) {
      return res.status(500).json({ erro: `SITE_URL inválida: "${baseUrl}"` });
    }

    // URLs simples, sem parâmetros: o Mercado Pago acrescenta o status sozinho
    const retorno = `${baseUrl}/carrinho.html`;
    const back_urls = { success: retorno, failure: retorno, pending: retorno };

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN.trim() });
    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: itemsMercadoPago,
        metadata: { pedido_detalhes: resumoPedido.join(' | ') },















        external_reference: `PEDIDO-${Date.now()}`,
        back_urls,
        auto_return: 'approved'
      }
    });

    return res.status(200).json({ url: response.init_point });

  } catch (error) {
    console.error('Erro na API de pagamento:', error);
    return res.status(500).json({
      erro: 'Erro interno ao processar pagamento: ' + (error.message || 'Falha no servidor')
    });
  }
};

const { MercadoPagoConfig, Preference } = require('mercadopago');
const PRODUTOS = require('../produtos.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  try {
    const { itens } = req.body || {};

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: 'Carrinho vazio ou formato inválido' });
    }

    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN
    });

    const itemsMercadoPago = [];
    const resumoPedido = [];

    for (const item of itens) {
      const produtoReal = PRODUTOS.find(p => p.id === item.id);

      if (!produtoReal) {
        return res.status(400).json({
          erro: `Item não encontrado no catálogo (ID: ${item.id}).`
        });
      }

      const quantidade = Number(item.qtd || item.quantidade || 1);
      const tamanho = item.tamanho || 'Único';
      const estampa = item.estampa || 'Frente';
      const cor = item.cor || 'Preta';

      const tituloDetalhado = `${produtoReal.nome} - Tam: ${tamanho} - Cor: ${cor} - Estampa: ${estampa}`;

      itemsMercadoPago.push({
        id: produtoReal.id,
        title: tituloDetalhado,
        unit_price: Number(produtoReal.preco),
        quantity: quantidade,
        currency_id: 'BRL'
      });

      resumoPedido.push(`${quantidade}x ${produtoReal.nome} (${tamanho}/${cor}/${estampa})`);
    }

    // Garante um URL base bem formatado com https://
    let baseUrl = process.env.SITE_URL;
    if (!baseUrl) {
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
      baseUrl = `https://${host.replace(/^https?:\/\//, '')}`;
    } else if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }

    // Remove barra no final, se houver
    baseUrl = baseUrl.replace(/\/$/, '');

    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: itemsMercadoPago,
        metadata: {
          pedido_detalhes: resumoPedido.join(' | ')
        },
        external_reference: `PEDIDO-${Date.now()}`,
        back_urls: {
          success: `${baseUrl}/carrinho.html?status=sucesso`,
          failure: `${baseUrl}/carrinho.html?status=falha`,
          pending: `${baseUrl}/carrinho.html?status=pendente`
        },
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

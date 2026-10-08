// api/criar-pagamento.js
const { MercadoPagoConfig, Preference } = require('mercadopago');
const PRODUTOS = require('../produtos.js');
const { cotarFrete } = require('./_superfrete');

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
    const { itens, cliente, freteId } = req.body || {};

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: 'Carrinho vazio ou formato inválido' });
    }
    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({ erro: 'MP_ACCESS_TOKEN não configurado na Vercel' });
    }

    // Dados do cliente
    const c = cliente || {};
    const whats = String(c.whatsapp || '').replace(/\D/g, '');
    const cep = String(c.cep || '').replace(/\D/g, '');
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email || '');
    if (!c.nome || !emailOk || whats.length < 10 || cep.length !== 8 ||
        !c.rua || !c.numero || !c.uf || String(c.uf).length !== 2) {
      return res.status(400).json({ erro: 'Preencha nome, e-mail, WhatsApp e o endereço completo.' });
    }

    const itemsMercadoPago = [];
    const resumoPedido = [];
    const itensCotacao = [];

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
      const corOk = temCor ? p.cores.some(x => x.nome === item.cor) : !item.cor;
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
      itensCotacao.push({ id: p.id, qtd: quantidade });

      const detalhe = [item.tamanho, temCor ? item.cor : null, temEstampa ? item.estampa : null]
        .filter(Boolean).join('/');
      resumoPedido.push(`${quantidade}x ${p.nome} (${detalhe})`);
    }

    // Frete recotado no servidor: nunca confiamos no valor vindo do navegador
    const opcoes = await cotarFrete(cep, itensCotacao);
    const escolhida = opcoes.find(o => String(o.id) === String(freteId));
    if (!escolhida) {
      return res.status(400).json({ erro: 'Opção de frete inválida. Calcule o frete de novo.' });
    }
    const frete = escolhida.preco;

    const baseUrl = baseDoSite(req);
    try { new URL(baseUrl); } catch (e) {
      return res.status(500).json({ erro: `SITE_URL inválida: "${baseUrl}"` });
    }
    const retorno = `${baseUrl}/retorno.html`;

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN.trim() });
    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: itemsMercadoPago,
        shipments: {
          cost: frete,
          mode: 'not_specified',
          receiver_address: { zip_code: cep, street_name: c.rua, street_number: String(c.numero) }
        },
        payer: {
          name: c.nome,
          email: c.email,
          phone: { area_code: whats.slice(0, 2), number: whats.slice(2) }
        },
        metadata: {
          pedido_detalhes: resumoPedido.join(' | '),
          frete: `${escolhida.nome} - R$ ${frete.toFixed(2)}`,
          whatsapp: whats,
          endereco: `${c.rua}, ${c.numero} ${c.complemento || ''} - ${c.bairro}, ${c.cidade}/${c.uf} - CEP ${cep}`
        },
        external_reference: `PEDIDO-${Date.now()}`,
        back_urls: { success: retorno, failure: retorno, pending: retorno },
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

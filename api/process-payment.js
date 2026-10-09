const { randomUUID } = require('crypto');
const PRODUTOS = require('../produtos.js');
const { PONTOS_RETIRADA } = require('./_config');
const { cotarFrete } = require('./_superfrete');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  try {
    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({ erro: 'MP_ACCESS_TOKEN não configurado na Vercel' });
    }

    const { token, paymentMethodId, itens, cliente, entrega } = req.body || {};
    const c = cliente || {};
    const ent = entrega || {};
    const retirada = ent.tipo === 'retirada';

    if (!token || !paymentMethodId) {
      return res.status(400).json({ erro: 'Dados do cartão incompletos.' });
    }
    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: 'Carrinho vazio.' });
    }

    const cpf = String(c.cpf || '').replace(/\D/g, '');
    const whats = String(c.whatsapp || '').replace(/\D/g, '');
    const cep = String(c.cep || '').replace(/\D/g, '');
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email || '');

    if (!c.nome || !emailOk || cpf.length !== 11 || whats.length < 10) {
      return res.status(400).json({ erro: 'Preencha nome, e-mail, WhatsApp e CPF.' });
    }
    if (!retirada && (cep.length !== 8 || !c.rua || !c.numero || !c.uf || String(c.uf).length !== 2)) {
      return res.status(400).json({ erro: 'Preencha o endereço de entrega completo.' });
    }

    // Itens e preços vêm do catálogo do servidor, nunca do navegador
    const items = [];
    const itensCotacao = [];
    let subtotal = 0;

    for (const item of itens) {
      const p = PRODUTOS.find(x => x.id === item.id);
      if (!p) return res.status(400).json({ erro: `Item não encontrado (ID: ${item.id}).` });

      const qtd = Number(item.qtd);
      if (!Number.isInteger(qtd) || qtd < 1 || qtd > 20) {
        return res.status(400).json({ erro: `Quantidade inválida para ${p.nome}.` });
      }
      if (!p.tamanhos.includes(item.tamanho)) {
        return res.status(400).json({ erro: `Tamanho inválido para ${p.nome}.` });
      }

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

      items.push({
        title: partes.join(' - '),
        unit_price: Number(p.preco).toFixed(2),
        quantity: qtd
      });
      itensCotacao.push({ id: p.id, qtd });
      subtotal += Number(p.preco) * qtd;
    }

    // Entrega: retirada em mãos (grátis) ou frete recotado no servidor
    let frete = 0;
    let descEntrega = '';

    if (retirada) {
      const ponto = PONTOS_RETIRADA.find(x => x.id === ent.pontoId);
      if (!ponto) return res.status(400).json({ erro: 'Escolha um ponto de retirada.' });
      descEntrega = `Retirada em mãos: ${ponto.nome}`;
    } else {
      const opcoes = await cotarFrete(cep, itensCotacao);
      const escolhida = opcoes.find(o => String(o.id) === String(ent.freteId));
      if (!escolhida) {
        return res.status(400).json({ erro: 'Opção de frete inválida. Calcule o frete de novo.' });
      }
      frete = escolhida.preco;
      descEntrega = `Envio: ${escolhida.nome}`;
      items.push({ title: `Frete - ${escolhida.nome}`, unit_price: frete.toFixed(2), quantity: 1 });
    }

    const total = (subtotal + frete).toFixed(2);

    const nomes = String(c.nome).trim().split(/\s+/);
    const primeiroNome = nomes[0];
    const sobrenome = nomes.slice(1).join(' ');

    const payer = {
      email: c.email,
      first_name: primeiroNome,
      last_name: sobrenome || undefined,
      identification: { type: 'CPF', number: cpf },
      phone: { area_code: whats.slice(0, 2), number: whats.slice(2) }
    };

    const body = {
      type: 'online',
      processing_mode: 'automatic',
      total_amount: total,
      external_reference: `PEDIDO-${Date.now()}`,
      description: `Pedido ToonTura - ${descEntrega}`,
      payer,
      items,
      transactions: {
        payments: [{
          amount: total,
          payment_method: {
            id: paymentMethodId,
            type: 'credit_card',
            token,
            installments: 1
            // não enviar issuer_id na Orders API
          }
        }]
      }
    };

    if (!retirada) {
      const endereco = {
        zip_code: cep,
        street_name: c.rua,
        street_number: String(c.numero),
        neighborhood: c.bairro || undefined,
        city: c.cidade || undefined,
        state: String(c.uf).toUpperCase(),
        complement: c.complemento || undefined
      };
      body.payer.address = endereco;
      body.shipment = { address: endereco };
    }

    const resp = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN.trim()}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': randomUUID()
      },
      body: JSON.stringify(body)
    });

    const order = await resp.json();
    if (!resp.ok) {
      console.error('Mercado Pago recusou a order:', JSON.stringify(order));
      return res.status(resp.status).json({ erro: 'Não foi possível processar o pagamento.', detalhe: order });
    }

    return res.status(200).json({ id: order.id, status: order.status, status_detail: order.status_detail });
  } catch (e) {
    console.error('Erro em process-payment:', e);
    return res.status(500).json({ erro: 'Erro interno ao processar pagamento.' });
  }
};

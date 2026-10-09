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

    const { formData, itens, cliente, entrega } = req.body || {};
    const f = formData || {};
    const c = cliente || {};
    const ent = entrega || {};
    const retirada = ent.tipo === 'retirada';

    if (!f.payment_method_id) {
      return res.status(400).json({ erro: 'Meio de pagamento não informado.' });
    }
    const fp = f.payer || {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fp.email || '')) {
      return res.status(400).json({ erro: 'E-mail inválido.' });
    }
    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: 'Carrinho vazio.' });
    }

    const whats = String(c.whatsapp || '').replace(/\D/g, '');
    const cep = String(c.cep || '').replace(/\D/g, '');
    if (!c.nome || whats.length < 10) {
      return res.status(400).json({ erro: 'Preencha nome e WhatsApp.' });
    }
    if (!retirada && (cep.length !== 8 || !c.rua || !c.numero || !c.uf || String(c.uf).length !== 2)) {
      return res.status(400).json({ erro: 'Preencha o endereço de entrega completo.' });
    }

    // Itens e preços vêm do catálogo do servidor, nunca do navegador
    const itemsInfo = [];
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

      itemsInfo.push({ id: p.id, title: partes.join(' - '), quantity: qtd, unit_price: Number(p.preco) });
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
    }

    const total = Math.round((subtotal + frete) * 100) / 100;

    // Pagador: e-mail e documento vêm do Brick; nome vem do formulário
    const nomes = String(c.nome).trim().split(/\s+/);
    const payer = { email: fp.email };
    if (fp.identification && fp.identification.number) {
      payer.identification = {
        type: fp.identification.type || 'CPF',
        number: String(fp.identification.number).replace(/\D/g, '')
      };
    }
    payer.first_name = fp.first_name || nomes[0];
    payer.last_name = fp.last_name || nomes.slice(1).join(' ') || undefined;
    if (fp.address && typeof fp.address === 'object') payer.address = fp.address; // boleto

    const endereco = retirada ? descEntrega
      : `${c.rua}, ${c.numero} ${c.complemento || ''} - ${c.bairro || ''}, ${c.cidade || ''}/${String(c.uf).toUpperCase()} - CEP ${cep}`;

    const body = {
      transaction_amount: total,
      description: `Pedido ToonTura - ${descEntrega}`,
      external_reference: `PEDIDO-${Date.now()}`,
      payment_method_id: f.payment_method_id,
      payer,
      additional_info: {
        items: itemsInfo,
        payer: {
          first_name: nomes[0],
          last_name: nomes.slice(1).join(' ') || undefined,
          phone: { area_code: whats.slice(0, 2), number: whats.slice(2) }
        }
      },
      metadata: {
        whatsapp: whats,
        entrega: descEntrega,
        frete: frete.toFixed(2),
        endereco
      }
    };

    if (!retirada) {
      body.additional_info.shipments = {
        receiver_address: {
          zip_code: cep,
          street_name: c.rua,
          street_number: String(c.numero),
          city_name: c.cidade || undefined,
          state_name: String(c.uf).toUpperCase()
        }
      };
    }

    // Cartão: token e emissor vêm do Brick; parcelamos sempre em 1x
    if (f.token) {
      body.token = f.token;
      body.installments = 1;
      if (f.issuer_id) body.issuer_id = f.issuer_id;
    }

    const resp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN.trim()}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': randomUUID()
      },
      body: JSON.stringify(body)
    });

    const pay = await resp.json();
    if (!resp.ok) {
      console.error('Mercado Pago recusou o pagamento:', JSON.stringify(pay));
      return res.status(resp.status).json({
        erro: pay.message || 'Não foi possível processar o pagamento.',
        detalhe: pay
      });
    }

    const out = { id: pay.id, status: pay.status, status_detail: pay.status_detail };
    const td = pay.point_of_interaction && pay.point_of_interaction.transaction_data;
    if (td && td.qr_code) {
      out.pix = { qr_code: td.qr_code, qr_code_base64: td.qr_code_base64, ticket_url: td.ticket_url };
    }
    if (pay.transaction_details && pay.transaction_details.external_resource_url) {
      out.boleto_url = pay.transaction_details.external_resource_url;
    }
    return res.status(200).json(out);
  } catch (e) {
    console.error('Erro em process-payment:', e);
    return res.status(500).json({ erro: 'Erro interno ao processar pagamento.' });
  }
};

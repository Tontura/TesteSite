const PRODUTOS = require('../produtos.js');

// cm e kg, produto EMBALADO. Meça e pese o seu de verdade.
// Para chinelo ou ecobag, você pode colocar um campo "pacote" no produto em produtos.js:
//   pacote: { width: 12, height: 10, length: 30, weight: 0.4 }
const PACOTE_PADRAO = { width: 25, height: 3, length: 30, weight: 0.3 };

async function cotarFrete(cepDestino, itens) {
  let weight = 0, height = 0, length = 0, width = 0;

  for (const i of itens) {
    const p = PRODUTOS.find(x => x.id === i.id);
    if (!p) throw new Error('Produto inválido: ' + i.id);
    const pk = p.pacote || PACOTE_PADRAO;
    const q = Number(i.qtd) || 1;
    weight += pk.weight * q;
    height += pk.height * q;                  // peças empilhadas
    length = Math.max(length, pk.length);
    width  = Math.max(width, pk.width);
  }

  const pacote = {
    height: Math.max(height, 2),
    width:  Math.max(width, 11),
    length: Math.max(length, 16),
    weight
  };

  const base = process.env.SF_SANDBOX === '1'
    ? 'https://sandbox.superfrete.com'
    : 'https://api.superfrete.com';

  const r = await fetch(`${base}/api/v0/calculator`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SF_TOKEN}`,
      'User-Agent': `ToonTura 1.0 (${process.env.SF_EMAIL})`
    },
    body: JSON.stringify({
      from: { postal_code: process.env.CEP_ORIGEM },
      to:   { postal_code: cepDestino },
      services: '1,2,17',                     // PAC, SEDEX e Mini Envios (confirmar na doc)
      options: { own_hand: false, receipt: false, insurance_value: 0, use_insurance_value: false },
      package: pacote
    })
  });

  const dados = await r.json();
  if (!r.ok) {
    console.error('SuperFrete respondeu:', JSON.stringify(dados));
    throw new Error((dados && dados.message) || 'Falha ao cotar frete');
  }

  return (Array.isArray(dados) ? dados : [])
    .filter(s => !s.error && s.price)
    .map(s => ({ id: s.id, nome: s.name, preco: Number(s.price), prazo: s.delivery_time }));
}

module.exports = { cotarFrete };

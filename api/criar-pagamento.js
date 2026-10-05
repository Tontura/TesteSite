// api/criar-pagamento.js
const PRODUTOS = require("../produtos.js");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método inválido" });
  }

  try {
    const { itens } = req.body || {};
    if (!Array.isArray(itens) || !itens.length) {
      return res.status(400).json({ erro: "Carrinho vazio" });
    }

    const items = itens.map(i => {
      const p = PRODUTOS.find(p => p.id === i.id);
      const qtd = Number(i.qtd);
      if (!p || !p.tamanhos.includes(i.tamanho) || !Number.isInteger(qtd) || qtd < 1 || qtd > 20) {
        throw new Error("Item inválido no carrinho");
      }

      // Cor e estampa: obrigatórias se o produto as oferece, proibidas se não oferece
      const temCor = Array.isArray(p.cores) && p.cores.length > 0;
      const temEstampa = Array.isArray(p.estampas) && p.estampas.length > 0;
      const corOk = temCor ? p.cores.some(c => c.nome === i.cor) : !i.cor;
      const estampaOk = temEstampa ? p.estampas.includes(i.estampa) : !i.estampa;
      if (!corOk || !estampaOk) {
        throw new Error(`Item inválido: ${p.nome}. Remova do carrinho e adicione de novo, escolhendo cor e estampa.`);
      }

      const title = [p.nome, i.tamanho, temCor ? i.cor : null, temEstampa ? `Estampa ${i.estampa}` : null]
        .filter(Boolean)
        .join(" - ");

      return {
        id: p.id,
        title,
        quantity: qtd,
        unit_price: p.preco,
        currency_id: "BRL"
      };
    });

    // Extrai só o primeiro endereço válido, ignorando colchetes, parênteses, aspas e espaços
    const bruto = process.env.SITE_URL || "https://testesite-chi-ochre.vercel.app";
    const achado = bruto.match(/https?:\/\/[^\s\[\]()"']+/);
    const site = (achado ? achado[0] : "https://testesite-chi-ochre.vercel.app").replace(/\/+$/, "");

    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({ erro: "MP_ACCESS_TOKEN não configurado na Vercel" });
    }

    // URLs simples, sem parâmetros: o Mercado Pago acrescenta o status sozinho
    const retorno = `${site}/retorno.html`;
    const back_urls = { success: retorno, pending: retorno, failure: retorno };

    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN.trim()}`
      },
      body: JSON.stringify({ items, back_urls, auto_return: "approved" })
    });

    const d = await r.json();

    if (!d.init_point) {
      console.error("MP:", JSON.stringify(d), "back_urls:", JSON.stringify(back_urls));
      return res.status(502).json({
        erro: "MP: " + (d.message || "sem detalhes") + " | enviado: " + retorno
      });
    }

    return res.status(200).json({ url: d.init_point });
  } catch (e) {
    console.error(e);
    return

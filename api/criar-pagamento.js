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
      return {
        id: p.id,
        title: `${p.nome} - ${i.tamanho}`,
        quantity: qtd,
        unit_price: p.preco,
        currency_id: "BRL"
      };
    });

    let site = (process.env.SITE_URL || "https://testesite-chi-ochre.vercel.app")
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\/+$/, "");
    if (!/^https?:\/\//.test(site)) site = "https://" + site;

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
    return res.status(500).json({ erro: String(e.message) });
  }
};

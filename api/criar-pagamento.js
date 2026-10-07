import { MercadoPagoConfig, Preference } from 'mercadopago';
import PRODUTOS from '../produtos.js';

// Inicializa o cliente do Mercado Pago usando a variável de ambiente
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN 
});

export default async function handler(req, res) {
  // Permite apenas requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  try {
    const { itens } = req.body;

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: 'Carrinho vazio ou formato inválido' });
    }

    // Mapeia e valida cada item em relação ao produtos.js
    const itemsMercadoPago = [];
    const resumoPedido = [];

    for (const item of itens) {
      // Busca o produto real no catálogo
      const produtoReal = PRODUTOS.find(p => p.id === item.id);

      if (!produtoReal) {
        return res.status(400).json({ 
          erro: `Item inválido no carrinho (ID: ${item.id}). Remova e adicione novamente.` 
        });
      }

      const quantidade = Number(item.qtd || item.quantidade || 1);
      const tamanho = item.tamanho || 'Único';
      const estampa = item.estampa || 'Frente';
      const cor = item.cor || 'Preta';

      // Cria um título detalhado para aparecer no extrato do Checkout e do Painel
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

    // Cria a preferência de pagamento no Mercado Pago
    const preference = new Preference(client);

    const siteUrl = process.env.SITE_URL || 'https://' + req.headers.host;

    const response = await preference.create({
      body: {
        items: itemsMercadoPago,
        // O metadata salva o resumo do pedido legível dentro do seu painel do Mercado Pago
        metadata: {
          pedido_detalhes: resumoPedido.join(' | ')
        },
        external_reference: `PEDIDO-${Date.now()}`,
        back_urls: {
          success: `${siteUrl}/carrinho.html?status=sucesso`,
          failure: `${siteUrl}/carrinho.html?status=falha`,
          pending: `${siteUrl}/carrinho.html?status=pendente`
        },
        auto_return: 'approved'
      }
    });

    // Retorna a URL de checkout (init_point)
    return res.status(200).json({ url: response.init_point });

  } catch (error) {
    console.error('Erro ao criar preferência de pagamento:', error);
    return res.status(500).json({ 
      erro: 'Erro interno ao processar pagamento: ' + (error.message || 'Falha no servidor') 
    });
  }
}

// produtos.js
// Só dados dos produtos. Nenhuma chave secreta aqui.
const CORES_CAMISETA = [
  { nome: "Preta",  hex: "#111111" },
  { nome: "Branca", hex: "#ffffff" },
  { nome: "Vermelho",  hex: "#9a9a9a" }
];
const ESTAMPAS_CAMISETA = ["Frente", "Costas"];

const PRODUTOS = [
  {
    id: "cam-01",
    nome: "Camiseta 01",
    categoria: "camisetas",
    preco: 79.9,
    // Array com as imagens (a primeira é a principal/capa)
    imagens: [
      "img/cam-01-frente.png",
      "img/cam-01-costas.png",
      "img/cam-01-detalhe.png"
    ],
    tamanhos: ["P", "M", "G", "GG"],
    cores: CORES_CAMISETA,
    estampas: ESTAMPAS_CAMISETA
  },
  {
    id: "cam-02",
    nome: "Camiseta 02",
    categoria: "camisetas",
    preco: 79.9,
    imagens: [
      "img/cam-02-frente.png",
      "img/cam-02-costas.png"
    ],
    tamanhos: ["P", "M", "G", "GG"],
    cores: CORES_CAMISETA,
    estampas: ESTAMPAS_CAMISETA
  },
  {
    id: "cam-03",
    nome: "Camiseta 03",
    categoria: "camisetas",
    preco: 79.9,
    imagens: [
      "img/cam-03-frente.png",
      "img/cam-03-costas.png"
    ],
    tamanhos: ["P", "M", "G", "GG"],
    cores: CORES_CAMISETA,
    estampas: ESTAMPAS_CAMISETA
  },
  {
    id: "cam-04",
    nome: "Camiseta 04",
    categoria: "camisetas",
    preco: 79.9,
    imagens: [
      "img/cam-04-frente.png",
      "img/cam-04-costas.png"
    ],
    tamanhos: ["P", "M", "G", "GG"],
    cores: CORES_CAMISETA,
    estampas: ESTAMPAS_CAMISETA
  },
  {
    id: "cam-05",
    nome: "Camiseta 05",
    categoria: "camisetas",
    preco: 79.9,
    imagens: [
      "img/cam-05-frente.png",
      "img/cam-05-costas.png"
    ],
    tamanhos: ["P", "M", "G", "GG"],
    cores: CORES_CAMISETA,
    estampas: ESTAMPAS_CAMISETA
  },
  {
    id: "chi-01",
    nome: "Chinelo",
    categoria: "acessorios",
    preco: 49.9,
    imagens: [
      "img/chi-01.png",
      "img/chi-01-par.png"
    ],
    tamanhos: ["35-37", "38-40", "41-43"]
  },
  {
    id: "eco-01",
    nome: "Ecobag",
    categoria: "acessorios",
    preco: 39.9,
    imagens: [
      "img/eco-01.png",
      "img/eco-01-uso.png"
    ],
    tamanhos: ["Único"]
  }
];

// Permite que a função segura (api/criar-pagamento.js) leia o mesmo catálogo
if (typeof module !== "undefined") module.exports = PRODUTOS;

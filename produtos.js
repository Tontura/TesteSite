// produtos.js
// Só dados dos produtos. Nenhuma chave secreta aqui.
const CORES_CAMISETA = [
  { nome: "Preta",  hex: "#111111" },
  { nome: "Branca", hex: "#ffffff" },
  { nome: "Vermelho", hex: "#f40e07" }
];
const ESTAMPAS_CAMISETA = ["Frente", "Costas"];

const PRODUTOS = [
  {
    id: "cam-01",
    nome: "Sem Sinal Preta",
    categoria: "camisetas",
    preco: 79.9,
    imagem: "img/cam-01.png",
    imagens: ["img/cam-01.png", "img/cam-01-2.png", "img/cam-01-3.png", "img/cam-01-4.png"],
    tamanhos: ["P", "M", "G", "GG"],
    cores: CORES_CAMISETA,
    estampas: ESTAMPAS_CAMISETA
  },
  {
    id: "cam-02",
    nome: "Sem Sinal Branca",
    categoria: "camisetas",
    preco: 79.9,
    imagem: "img/cam-02.png",
    imagens: ["img/cam-02.png","img/cam-02-2.png","img/cam-02-3.png","img/cam-02-4.png"],
    tamanhos: ["P", "M", "G", "GG"],
    cores: CORES_CAMISETA,
    estampas: ESTAMPAS_CAMISETA
  },
  {
    id: "cam-03",
    nome: "Camiseta 03",
    categoria: "camisetas",
    preco: 79.9,
    imagem: "img/cam-03.png",
    imagens: ["img/cam-03.png"],
    tamanhos: ["P", "M", "G", "GG"],
    cores: CORES_CAMISETA,
    estampas: ESTAMPAS_CAMISETA
  },
  {
    id: "cam-04",
    nome: "Camiseta 04",
    categoria: "camisetas",
    preco: 79.9,
    imagem: "img/cam-04.png",
    imagens: ["img/cam-04.png"],
    tamanhos: ["P", "M", "G", "GG"],
    cores: CORES_CAMISETA,
    estampas: ESTAMPAS_CAMISETA
  },
  {
    id: "cam-05",
    nome: "Camiseta 05",
    categoria: "camisetas",
    preco: 79.9,
    imagem: "img/cam-05.png",
    imagens: ["img/cam-05.png"],
    tamanhos: ["P", "M", "G", "GG"],
    cores: CORES_CAMISETA,
    estampas: ESTAMPAS_CAMISETA
  },
  {
    id: "chi-01",
    nome: "Chinelo",
    categoria: "acessorios",
    preco: 49.9,
    imagem: "img/chi-01.png",
    imagens: ["img/chi-01.png"],
    tamanhos: ["35-37", "38-40", "41-43"]
  },
  {
    id: "eco-01",
    nome: "Ecobag",
    categoria: "acessorios",
    preco: 39.9,
    imagem: "img/eco-01.png",
    imagens: ["img/eco-01.png"],
    tamanhos: ["Único"]
  }
];

// Permite que a função segura (api/criar-pagamento.js) leia o mesmo catálogo
if (typeof module !== "undefined") module.exports = PRODUTOS;

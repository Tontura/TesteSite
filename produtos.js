// produtos.js
// Só dados dos produtos. Nenhuma chave secreta aqui.
const PRODUTOS = [
  {
    id: "cam-01",
    nome: "Camiseta 01",
    categoria: "camisetas",
    preco: 79.9,
    imagem: "img/cam-01.jpg",
    tamanhos: ["P", "M", "G", "GG"]
  },
  {
    id: "cam-02",
    nome: "Camiseta 02",
    categoria: "camisetas",
    preco: 79.9,
    imagem: "img/cam-02.jpg",
    tamanhos: ["P", "M", "G", "GG"]
  },
  {
    id: "cam-03",
    nome: "Camiseta 03",
    categoria: "camisetas",
    preco: 79.9,
    imagem: "img/cam-03.jpg",
    tamanhos: ["P", "M", "G", "GG"]
  },
  {
    id: "cam-04",
    nome: "Camiseta 04",
    categoria: "camisetas",
    preco: 79.9,
    imagem: "img/cam-04.jpg",
    tamanhos: ["P", "M", "G", "GG"]
  },
  {
    id: "cam-05",
    nome: "Camiseta 05",
    categoria: "camisetas",
    preco: 79.9,
    imagem: "img/cam-05.jpg",
    tamanhos: ["P", "M", "G", "GG"]
  },
  {
    id: "chi-01",
    nome: "Chinelo",
    categoria: "acessorios",
    preco: 49.9,
    imagem: "img/chi-01.jpg",
    tamanhos: ["35-37", "38-40", "41-43"]
  },
  {
    id: "eco-01",
    nome: "Ecobag",
    categoria: "acessorios",
    preco: 39.9,
    imagem: "img/eco-01.jpg",
    tamanhos: ["Único"]
  }
];

// Permite que a função segura (api/criar-pagamento.js) leia o mesmo catálogo
if (typeof module !== "undefined") module.exports = PRODUTOS;

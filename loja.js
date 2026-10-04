const brl = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const getCarrinho = () => JSON.parse(localStorage.getItem("carrinho") || "[]");
const setCarrinho = c => localStorage.setItem("carrinho", JSON.stringify(c));
function addCarrinho(id, tamanho){
  const c = getCarrinho();
  const i = c.find(x => x.id === id && x.tamanho === tamanho);
  i ? i.qtd++ : c.push({id, tamanho, qtd: 1});
  setCarrinho(c); atualizaContador();
}
function atualizaContador(){
  const n = getCarrinho().reduce((s,x) => s + x.qtd, 0);
  const el = document.getElementById("contador");
  if (el) el.textContent = n;
}
document.addEventListener("DOMContentLoaded", atualizaContador);

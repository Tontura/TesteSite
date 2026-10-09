const brl = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const getCarrinho = () => JSON.parse(localStorage.getItem("carrinho") || "[]");
const setCarrinho = c => localStorage.setItem("carrinho", JSON.stringify(c));
function addCarrinho(id, tamanho, cor, estampa){
  cor = cor || null; estampa = estampa || null;
  const c = getCarrinho();
  const i = c.find(x => x.id === id && x.tamanho === tamanho
    && (x.cor || null) === cor && (x.estampa || null) === estampa);
  i ? i.qtd++ : c.push({id, tamanho, cor, estampa, qtd: 1});
  setCarrinho(c); atualizaContador();
}
function atualizaContador(){
  const n = getCarrinho().reduce((s,x) => s + x.qtd, 0);
  const el = document.getElementById("contador");
  if (el) el.textContent = n;
}
document.addEventListener("DOMContentLoaded", atualizaContador);

function voarParaCarrinho(imgEl){
  const alvo = document.querySelector('.cart-link');
  if(!imgEl || !alvo) return;
  const a = imgEl.getBoundingClientRect(), b = alvo.getBoundingClientRect();
  const c = imgEl.cloneNode();
  c.className = 'voando';
  c.style.cssText = `left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px`;
  document.body.appendChild(c);
  requestAnimationFrame(() => {
    const dx = b.left + b.width/2 - (a.left + a.width/2);
    const dy = b.top + b.height/2 - (a.top + a.height/2);
    c.style.transform = `translate(${dx}px,${dy}px) scale(.08)`;
    c.style.opacity = '.4';
  });
  setTimeout(() => {
    c.remove();
    alvo.classList.add('bump');
    setTimeout(() => alvo.classList.remove('bump'), 400);
  }, 800);
}

/* ===== Carrinho lateral ===== */
const _esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const _lerCarrinho = () => JSON.parse(localStorage.getItem("carrinho") || "[]");
const _gravarCarrinho = c => localStorage.setItem("carrinho", JSON.stringify(c));
const _qtdItem = i => Number(i.qtd || i.quantidade || 1);
const _precoItem = i => {
  if (i.preco) return Number(i.preco);
  const p = typeof PRODUTOS !== 'undefined' ? PRODUTOS.find(x => x.id === i.id) : null;
  return p ? p.preco : 0;
};

function montarCarrinhoLateral(){
  if (document.getElementById('cl') || document.getElementById('itens')) return; // não aparece em carrinho.html
  const el = document.createElement('div');
  el.id = 'cl';
  el.innerHTML = `
    <div class="cl-fundo" onclick="fecharCarrinhoLateral()"></div>
    <aside class="cl-painel" role="dialog" aria-label="Carrinho de compras" aria-hidden="true">
      <div class="cl-topo">
        <strong>Carrinho</strong>
        <button type="button" class="cl-x" onclick="fecharCarrinhoLateral()" aria-label="Fechar">✕</button>
      </div>
      <div class="cl-aviso" id="cl-aviso" hidden></div>
      <div class="cl-itens" id="cl-itens"></div>
      <div class="cl-rodape">
        <div class="cl-total"><span>Total</span><span id="cl-total">R$ 0,00</span></div>
        <p class="cl-obs">Frete calculado na finalização da compra</p>
        <!-- quando o checkout.html existir, troque o link abaixo por checkout.html -->
        <a class="btn cl-btn" href="carrinho.html">Finalizar compra</a>
        <button type="button" class="cl-cont" onclick="fecharCarrinhoLateral()">Continuar comprando</button>
      </div>
    </aside>`;
  document.body.appendChild(el);
}

function renderCarrinhoLateral(){
  const box = document.getElementById('cl-itens');
  if (!box) return;
  const c = _lerCarrinho();
  let total = 0;

  if (!c.length) {
    box.innerHTML = '<p class="cl-vazio">Seu carrinho está vazio.</p>';
  } else {
    box.innerHTML = c.map((i, idx) => {
      const ref = typeof PRODUTOS !== 'undefined' ? PRODUTOS.find(p => p.id === i.id) : null;
      const nome = i.nome || (ref && ref.nome) || 'Produto';
      const img = i.imagem || (ref && (ref.imagem || (ref.imagens && ref.imagens[0]))) || '';
      const q = _qtdItem(i), p = _precoItem(i);
      total += p * q;
      const det = [i.tamanho ? 'Tam. ' + i.tamanho : '', i.cor, i.estampa].filter(Boolean).join(' · ');
      return `
        <div class="cl-item">
          <img src="${_esc(img)}" alt="">
          <div class="cl-info">
            <strong>${_esc(nome)}</strong>
            <span>${_esc(det)}</span>
            <span>${brl(p)}</span>
            <div class="cl-qtd">
              <button type="button" onclick="mudarQtdCarrinho(${idx},-1)" aria-label="Diminuir">−</button>
              <span>${q}</span>
              <button type="button" onclick="mudarQtdCarrinho(${idx},1)" aria-label="Aumentar">+</button>
            </div>
          </div>
          <button type="button" class="cl-rem" onclick="removerDoCarrinho(${idx})">Remover</button>
        </div>`;
    }).join('');
  }
  document.getElementById('cl-total').textContent = brl(total);
  atualizaContador();
}

function mudarQtdCarrinho(idx, d){
  const c = _lerCarrinho();
  if (!c[idx]) return;
  const n = Math.max(1, Math.min(20, _qtdItem(c[idx]) + d));
  c[idx].qtd = n; c[idx].quantidade = n;
  _gravarCarrinho(c);
  renderCarrinhoLateral();
}

function removerDoCarrinho(idx){
  const c = _lerCarrinho();
  c.splice(idx, 1);
  _gravarCarrinho(c);
  renderCarrinhoLateral();
}

function abrirCarrinhoLateral(mensagem){
  const el = document.getElementById('cl');
  if (!el) return;
  renderCarrinhoLateral();
  const aviso = document.getElementById('cl-aviso');
  if (mensagem) { aviso.textContent = '✓ ' + mensagem; aviso.hidden = false; }
  else aviso.hidden = true;
  el.classList.add('aberto');
  el.querySelector('.cl-painel').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function fecharCarrinhoLateral(){
  const el = document.getElementById('cl');
  if (!el) return;
  el.classList.remove('aberto');
  el.querySelector('.cl-painel').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
  montarCarrinhoLateral();
  // Clicar em "Carrinho" no cabeçalho abre a barra lateral (exceto na própria página do carrinho)
  document.querySelectorAll('.cart-link').forEach(a => {
    a.addEventListener('click', e => {
      if (document.getElementById('cl')) { e.preventDefault(); abrirCarrinhoLateral(); }
    });
  });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharCarrinhoLateral(); });

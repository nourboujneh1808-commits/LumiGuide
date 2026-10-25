const D={"P": {"pro": {"name": "LumiGuide Pro", "price": 299}, "premium": {"name": "Pack Premium", "price": 398}, "prestige": {"name": "Pack Prestige", "price": 598}, "soins": {"name": "Coffret de soins", "price": 49}, "kit": {"name": "Kit Voyage", "price": 59}, "cartouches": {"name": "Cartouches de soin", "price": 29}, "cable": {"name": "Câble de recharge USB-C", "price": 25}, "etui": {"name": "Étui Premium", "price": 69}}, "L": [{"f": "natural", "n": "Natural", "o": "Au quotidien", "d": "Un teint lumineux et un maquillage léger pour tous les jours."}, {"f": "soft-glam", "n": "Soft Glam", "o": "Pour le travail", "d": "Un glam doux et élégant, parfait pour la journée."}, {"f": "night-out", "n": "Night Out", "o": "Pour une soirée", "d": "Un regard intense et un teint éclatant pour vos sorties."}, {"f": "bridal", "n": "Bridal", "o": "Pour un jour unique", "d": "Un look raffiné pour les grandes occasions."}], "COL": {"Rose Quartz": ["#f4b8c8", "#d9738f"], "Champagne": ["#f0dcc0", "#c9a574"], "Midnight": ["#4a4260", "#1d1829"], "Lilac": ["#d9c9ef", "#a98bd0"]}};
const KNOWN=["pro","premium","prestige","soins","kit","cartouches","cable","etui"];
const SHIP_FEE=7,FREE_FROM=50; // livraison : 7 TND, offerte des 50 TND (a modifier ici)
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const money=v=>v.toFixed(3).replace(".",",")+" TND";
const get=()=>{try{return JSON.parse(localStorage.getItem("lg_cart"))||[]}catch(e){return[]}};
const save=c=>{localStorage.setItem("lg_cart",JSON.stringify(c));count()};
function count(){$("#cc").textContent=get().reduce((s,i)=>s+i.q,0)}
function add(id,col){const c=get(),k=c.find(i=>i.id==id&&i.col==col);k?k.q++:c.push({id,col,q:1});save(c);
 const b=$(".cart");b.style.transform="scale(1.15)";setTimeout(()=>b.style.transform="",200)}
count();
$(".burger").onclick=e=>{const o=$("#nav").classList.toggle("open");e.target.setAttribute("aria-expanded",o)};
$$("[data-add]").forEach(b=>b.onclick=()=>{add(b.dataset.add,b.dataset.col||"");b.textContent="Ajouté ✓";setTimeout(()=>b.textContent="Ajouter au panier",1200)});
$$("[data-f]").forEach(b=>b.onclick=()=>{$$("[data-f]").forEach(x=>x.classList.toggle("on",x==b));
 $$(".card").forEach(c=>c.hidden=b.dataset.f!="all"&&c.dataset.cat!=b.dataset.f)});
let col="Rose Quartz";
$$(".sw").forEach(b=>b.onclick=()=>{col=b.dataset.col;const im=$("#pimg img");const pid=$("#pimg").dataset.id;im.src="images/p-"+pid+"-"+b.dataset.slug+".jpg";im.alt=D.P[pid].name+", couleur "+col;
 $("#cn").textContent=col;$$(".sw").forEach(x=>x.classList.toggle("on",x==b))});
if($("#addpro"))$("#addpro").onclick=e=>{add($("#pimg").dataset.id,$("#pimg").dataset.nocol?"":col);e.target.textContent="Ajouté ✓";setTimeout(()=>e.target.textContent="Ajouter au panier",1200)};
const dlg=$("#lk");let li=0;
function show(i){li=(i+D.L.length)%D.L.length;const l=D.L[li];$("#li").src="images/look-"+l.f+".jpg";$("#li").alt="Maquillage "+l.n;
 $("#ln").textContent=l.n;$("#lo").textContent=l.o;$("#ld").textContent=l.d;dlg.open||dlg.showModal()}
if(dlg){$$(".look").forEach(b=>b.onclick=()=>show(+b.dataset.i));$("#lp").onclick=()=>show(li-1);$("#lnx").onclick=()=>show(li+1);
 $(".x").onclick=()=>dlg.close();dlg.onclick=e=>{if(e.target==dlg)dlg.close()}}
const cf=$("#cf");if(cf)cf.onsubmit=e=>{e.preventDefault();const m=$("#cm");
 if(!cf.checkValidity()){m.textContent="Merci de remplir tous les champs avec un e-mail valide.";return}
 m.textContent="Merci ! Votre message a bien été préparé (démonstration : aucun envoi réel).";cf.reset()};
const box=$("#cartbox");
function render(){let c=get();const gone=c.filter(i=>D.P[i.id]&&D.P[i.id].gone);if(gone.length){c=c.filter(i=>!gone.includes(i));save(c)}if(!c.length){box.innerHTML='<div class="panel"><h2>Votre panier est vide.</h2><a class="btn" href="boutique.html">Découvrir nos produits</a></div>';return}
 let sub=0;box.innerHTML=c.map((i,x)=>{const p=D.P[i.id];if(!p)return"";const t=p.price*i.q;sub+=t;
 return `<div class="cl"><div class="th"><img src="${KNOWN.includes(i.id)?"images/p-"+i.id+(i.col?"-"+i.col.toLowerCase().replace(" ","-"):"")+".jpg":p.image}" alt="${p.name}"></div><div><b>${p.name}</b>${i.col?`<br><small>${i.col}</small>`:""}<br><button class="rm" data-r="${x}">Supprimer</button></div>
 <div class="qt"><button data-m="${x}" aria-label="Moins">−</button><span>${i.q}</span><button data-p="${x}" aria-label="Plus">+</button></div><b>${money(t)}</b></div>`}).join("")+
 (()=>{const f=sub>=FREE_FROM?0:SHIP_FEE;return `<div class="sum"><p><span>Sous-total</span><span>${money(sub)}</span></p><p><span>Livraison</span><span>${f?money(f):"Offerte"}</span></p><p class="t"><span>Total</span><span>${money(sub+f)}</span></p>
 <button class="btn" id="ord" style="width:100%">Passer à la commande</button><p id="om" role="status" style="display:block;font-size:.85rem"></p></div>`})();
 $$("[data-r]",box).forEach(b=>b.onclick=()=>{const c=get();c.splice(+b.dataset.r,1);save(c);render()});
 $$("[data-m]",box).forEach(b=>b.onclick=()=>{const c=get(),i=c[+b.dataset.m];i.q--;if(i.q<1)c.splice(+b.dataset.m,1);save(c);render()});
 $$("[data-p]",box).forEach(b=>b.onclick=()=>{const c=get();c[+b.dataset.p].q++;save(c);render()});
 $("#ord").onclick=()=>{location.href="checkout.html"}}
if(box){render();if(window.LG)LG.loadCatalog().then(d=>{if(d)render()})}

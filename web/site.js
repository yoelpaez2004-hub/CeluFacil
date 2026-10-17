// ===== Web para clientes de Celu Fácil =====
// Usa la misma base (data.js) y los mismos precios de Mercado Libre (precios-ml.json) que la app del taller,
// pero muestra solo lo que el cliente necesita: qué le pasa al celu, cuánto sale y cómo pedir el arreglo.

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => "$" + Math.round(Number(n) || 0).toLocaleString("es-AR");
const redondear = (n, a = 500) => Math.round((Number(n) || 0) / a) * a;
const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const slug = m => norm(m).replace(/[^a-z0-9]/g, "");
const MARCAS_PRINCIPALES = Object.keys(MARCAS).slice(0, 8);
const NIVEL_CLIENTE = {
  economico: { nombre: "Económico", sub: "compatible" },
  original: { nombre: "Calidad original", sub: "la opción más elegida" },
  premium: { nombre: "Premium", sub: "original de fábrica" }
};

const sel = { marca: "", modelo: "", gama: "baja", cat: "", falla: -1, catPendiente: "", nivel: NIVEL_CLIENTE[TALLER.nivelDefecto] ? TALLER.nivelDefecto : "original", todasMarcas: false };
let mlData = null, fotos = {};

// ---------- Contacto ----------
function mapsUrl() { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([TALLER.direccion, TALLER.localidad].filter(Boolean).join(", ")); }
function waUrl(texto) {
  if (!TALLER.whatsapp) return mapsUrl();
  return "https://wa.me/" + String(TALLER.whatsapp).replace(/\D/g, "") + (texto ? "?text=" + encodeURIComponent(texto) : "");
}
function saludo() { return `Hola ${TALLER.nombre}! `; }
function setContacto() {
  const hay = !!TALLER.whatsapp;
  for (const id of ["top-wa", "fab", "wa-donde"]) {
    const a = $("#" + id); a.href = hay ? waUrl(saludo() + "Quiero hacer una consulta sobre mi celular.") : mapsUrl();
    if (!hay) { a.querySelector("span") && (a.querySelector("span").textContent = "Cómo llegar"); a.setAttribute("aria-label", "Cómo llegar"); a.querySelector("svg") && a.querySelector("svg").remove(); }
  }
  if (!hay) { $("#wa-donde").classList.add("hidden"); $("#fab").classList.add("hidden"); $("#wa-modelo").textContent = "Acercate al taller:"; }
  $("#maps").href = mapsUrl();
  $("#addr").textContent = [TALLER.direccion, TALLER.localidad].filter(Boolean).join(", ");
  $("#hours").textContent = TALLER.horario || "";
  for (const el of document.querySelectorAll("#gar-txt, .gar-txt")) el.textContent = `${TALLER.garantiaDias} días`;
  for (const id of ["brand-name", "foot-name"]) $("#" + id).textContent = TALLER.nombre;
  if (TALLER.instagram) $("#foot-ig").innerHTML = `Instagram: <a href="https://instagram.com/${esc(TALLER.instagram)}" target="_blank" rel="noopener">@${esc(TALLER.instagram)}</a>`;
  document.title = `${TALLER.nombre} — Reparación de celulares con precio al instante`;
}

// ---------- Precios (misma fórmula que la app) ----------
function gamaDe(marca, modelo) { const m = MARCAS[marca]; if (!m) return "baja"; for (const g of ["alta", "media", "baja"]) if (m[g].includes(modelo)) return g; return "baja"; }
function manoObra(parte, marca, gama) { let p = (TRABAJOS[parte] ? TRABAJOS[parte].mo : 0) * (MULT_GAMA[gama] || 1); if (marca === "iPhone") p *= RECARGO_IPHONE; return redondear(p); }
function precioVenta(costo) { return redondear((Number(costo) || 0) * (1 + (Number(TALLER.recargo) || 0) / 100)); }
function cotizar(i, marca, modelo, gama) {
  const f = FALLAS[i]; const t = TRABAJOS[f.parte]; const parte = t && t.repuesto;
  const r = (parte && REPUESTOS[parte]) || REPUESTOS.software;
  const ref = marca === "iPhone" ? r.iphone : r[gama];
  const niveles = { economico: { costo: ref[0], real: false }, original: { costo: ref[1], real: false }, premium: { costo: ref[2], real: false } };
  const ml = parte && mlData && mlData.precios && mlData.precios[`${parte}|${marca}|${modelo}`];
  if (ml && ml.niveles) for (const k of Object.keys(niveles)) { const n = ml.niveles[k]; if (n && n.p > 0) niveles[k] = { costo: n.p, real: true }; }
  for (const k of Object.keys(niveles)) niveles[k].precio = precioVenta(niveles[k].costo);
  const mo = manoObra(f.parte, marca, gama);
  return { falla: f, trabajo: t, repuesto: r, tieneRepuesto: !!parte, unico: !!r.unico, niveles, mo, real: !!(ml && ml.niveles), actualizado: mlData && mlData.actualizado };
}

const silueta = () => `<svg class="sil" viewBox="0 0 40 72" aria-hidden="true"><rect x="3" y="3" width="34" height="66" rx="7" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="7" y="9" width="26" height="50" rx="2" fill="currentColor" opacity=".15"/><circle cx="20" cy="64" r="1.8" fill="currentColor"/></svg>`;
function siluetaEl() { const t = document.createElement("template"); t.innerHTML = silueta(); return t.content.firstChild; }

// ---------- Pasos ----------
function paso(n) {
  for (const li of document.querySelectorAll(".step")) { const s = Number(li.dataset.step); li.classList.toggle("done", s < n); li.classList.toggle("cur", s === n); li.setAttribute("aria-current", s === n ? "step" : "false"); if (s < n) { li.setAttribute("role", "button"); li.tabIndex = 0; } else { li.removeAttribute("role"); li.removeAttribute("tabindex"); } }
  for (const [k, id] of [[1, "p-marca"], [2, "p-modelo"], [3, "p-falla"], [4, "p-precio"]]) $("#" + id).classList.toggle("hidden", k !== n);
  if (n > 1) { const top = $("#quote").getBoundingClientRect().top + window.scrollY - 70; if (window.scrollY > top + 40 || n === 4) window.scrollTo({ top, behavior: "smooth" }); }
  const h = $(["#p-marca", "#p-modelo", "#p-falla", "#p-precio"][n - 1]).querySelector("h2"); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  $("#quote").setAttribute("aria-label", `Cotizador, paso ${n} de 4`);
}

function logoHtml(m, cls = "") {
  const ini = m.slice(0, 2).toUpperCase();
  return `<img class="${cls}" src="marcas/${slug(m)}.png" alt="${esc(m)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'mono',textContent:'${esc(ini)}'}))">`;
}
function renderMarcas() {
  const lista = sel.todasMarcas ? Object.keys(MARCAS) : MARCAS_PRINCIPALES;
  $("#brands").innerHTML = lista.map(m => `<button class="brand-btn${m === sel.marca ? " sel" : ""}" type="button" data-m="${esc(m)}">${logoHtml(m)}<span>${esc(m)}</span></button>`).join("");
  $("#more-brands").textContent = sel.todasMarcas ? "Ver menos marcas" : "Ver todas las marcas";
}
function elegirMarca(m) {
  sel.marca = m; sel.modelo = ""; sel.falla = -1;
  $("#t-modelo").textContent = `¿Qué ${m === "iPhone" ? "iPhone" : m} es?`;
  $("#q-modelo").value = ""; renderModelos(); renderMarcas();
  $("#wa-modelo").href = waUrl(saludo() + `Tengo un ${m} que no aparece en la web. ¿Me pasan precio?`);
  paso(2);
}
function renderModelos() {
  const q = norm($("#q-modelo").value.trim()); const m = MARCAS[sel.marca] || { alta: [], media: [], baja: [] };
  const tile = x => { const f = fotos[`${sel.marca}|${x}`]; return `<button class="model-btn" type="button" data-x="${esc(x)}"><span class="m-img">${f ? `<img src="modelos/${esc(f.archivo)}" alt="" loading="lazy" onerror="this.replaceWith(siluetaEl())">` : silueta()}</span><span class="m-name">${esc(x)}</span></button>`; };
  if (q) {
    const todos = [...m.alta, ...m.media, ...m.baja].filter(x => norm(x).includes(q));
    $("#models").innerHTML = todos.length ? todos.map(tile).join("") : `<p class="empty">No encontramos ese modelo. Escribinos igual: lo arreglamos.</p>`;
    return;
  }
  // Sin búsqueda: agrupados por gama, los más nuevos primero, para no perderse en listas largas
  const GAMAS = [["alta", "Gama alta"], ["media", "Gama media"], ["baja", "Gama económica"]];
  $("#models").innerHTML = GAMAS.filter(([g]) => m[g].length).map(([g, t]) => `<h3 class="m-gama">${t}</h3>${m[g].map(tile).join("")}`).join("");
}
function elegirModelo(x) {
  sel.modelo = x; sel.gama = gamaDe(sel.marca, x); sel.falla = -1;
  $("#t-falla").textContent = `¿Qué le pasa a tu ${sel.marca === "iPhone" ? "" : sel.marca + " "}${x}?`;
  $("#q-falla").value = ""; mostrarCats(); paso(3);
  if (sel.catPendiente) { mostrarCat(sel.catPendiente); sel.catPendiente = ""; }
}
const faultHtml = (f, i) => `<button class="fault" type="button" data-i="${i}"><img src="iconos/${f.cat}.png" alt="" onerror="this.remove()"><span>${esc(f.sintoma)}<small>${esc(TRABAJOS[f.parte] ? TRABAJOS[f.parte].nombre : "")}</small></span></button>`;
function mostrarCats() {
  sel.cat = "";
  $("#cats").innerHTML = CATEGORIAS.map(c => `<button class="cat" type="button" data-c="${c.id}"><img src="iconos/${c.id}.png" alt="" onerror="this.remove()"><span>${esc(c.nombre)}</span><small>${FALLAS.filter(f => f.cat === c.id).length} fallas</small></button>`).join("");
  $("#f-list").classList.add("hidden"); $("#f-cats").classList.remove("hidden"); buscarFallas();
}
function mostrarCat(id) {
  sel.cat = id; const c = CATEGORIAS.find(x => x.id === id);
  $("#cat-title").innerHTML = `<img src="iconos/${id}.png" alt="" onerror="this.remove()"><h3>${esc(c ? c.nombre : "")}</h3>`;
  $("#faults").innerHTML = FALLAS.map((f, i) => ({ f, i })).filter(({ f }) => f.cat === id).map(({ f, i }) => faultHtml(f, i)).join("");
  $("#f-cats").classList.add("hidden"); const l = $("#f-list"); l.classList.remove("hidden"); l.classList.remove("slide"); void l.offsetWidth; l.classList.add("slide");
}
function buscarFallas() {
  const q = norm($("#q-falla").value.trim()); const box = $("#faults-search");
  if (!q) { box.classList.add("hidden"); $("#cats").classList.remove("hidden"); return; }
  const lista = FALLAS.map((f, i) => ({ f, i })).filter(({ f }) => norm(f.sintoma + " " + f.diag).includes(q));
  box.innerHTML = lista.length ? lista.map(({ f, i }) => faultHtml(f, i)).join("") : `<p class="empty">No encontramos esa falla. Elegí una categoría o escribinos y te orientamos.</p>`;
  box.classList.remove("hidden"); $("#cats").classList.add("hidden");
}
function elegirFalla(i) { sel.falla = i; renderResultado(); paso(4); }

function renderResultado() {
  if (sel.falla < 0) return;
  const c = cotizar(sel.falla, sel.marca, sel.modelo, sel.gama);
  const f = c.falla; const equipo = `${sel.marca === "iPhone" ? "" : sel.marca + " "}${sel.modelo}`;
  const nivel = c.unico ? "original" : sel.nivel;
  const rep = c.tieneRepuesto ? c.niveles[nivel].precio : 0;
  const total = c.mo + rep;
  const incierto = f.dif >= 3 || /diagnóstico previo|posible|reparación de placa|limpieza/i.test(f.repuesto);
  const niveles = c.tieneRepuesto && !c.unico ? `<div class="levels">${["economico", "original", "premium"].map(k => `<button class="level${k === nivel ? " sel" : ""}" type="button" data-n="${k}">${k === "original" ? `<span class="tag">Recomendado</span>` : ""}<b>${NIVEL_CLIENTE[k].nombre}</b><small>${NIVEL_CLIENTE[k].sub}</small><span class="lp">${fmt(c.mo + c.niveles[k].precio)}</span></button>`).join("")}</div>` : "";
  const detalle = c.tieneRepuesto ? `Mano de obra <b>${fmt(c.mo)}</b> + ${esc(c.repuesto.nombre.toLowerCase())} <b>${fmt(rep)}</b>` : `Solo mano de obra, sin repuesto`;
  const msg = saludo() + `Tengo un ${equipo} y ${norm(f.sintoma).startsWith("se ") || norm(f.sintoma).startsWith("no ") ? f.sintoma.charAt(0).toLowerCase() + f.sintoma.slice(1) : "le pasa esto: " + f.sintoma}. En la web me dio un estimado de ${fmt(total)}${c.tieneRepuesto && !c.unico ? ` con repuesto ${NIVEL_CLIENTE[nivel].nombre.toLowerCase()}` : ""}. ¿Cuándo lo puedo llevar?`;
  $("#result").innerHTML = `
    <div class="res-eq">${esc(equipo)}</div>
    <div class="res-fault">${esc(f.sintoma)}</div>
    <p class="res-diag">${esc(f.diag.replace(/\s*\(.*?\)/g, ""))}</p>
    ${niveles}
    <div class="total"><span class="tl">Precio estimado${c.tieneRepuesto && !c.unico ? ` con repuesto ${NIVEL_CLIENTE[nivel].nombre.toLowerCase()}` : ""}</span><span class="tp">${fmt(total)}</span><span class="tm">${detalle}</span></div>
    <div class="meta"><span>Tiempo: <b>${esc(f.tiempo)}</b></span><span>Garantía: <b>${TALLER.garantiaDias} días</b></span><span>Trabajo: <b>${esc(c.trabajo ? c.trabajo.nombre : "")}</b></span></div>
    ${incierto ? `<div class="note">Esta falla puede tener más de una causa. El precio se confirma cuando revisamos el equipo, siempre antes de hacer cualquier trabajo.</div>` : c.real ? `<div class="note ok">Precio del repuesto tomado de Mercado Libre para tu modelo exacto${c.actualizado ? ` (actualizado el ${new Date(c.actualizado).toLocaleDateString("es-AR")})` : ""}.</div>` : ""}
    <div class="cta-row">
      <a class="btn btn-wa" href="${waUrl(msg)}" target="_blank" rel="noopener">${TALLER.whatsapp ? `<svg class="ico" viewBox="0 0 24 24"><use href="#i-wa"/></svg>Pedir el arreglo por WhatsApp` : "Cómo llegar al taller"}</a>
      <button class="btn btn-p" type="button" id="otra-falla">Ver otra falla</button>
    </div>
    <button class="again" type="button" id="otro-equipo">Cotizar otro celular</button>`;
}

// ---------- Secciones fijas ----------
const DESTACADOS = [["pantalla", "modulo", "Cambio de pantalla"], ["bateria", "bateria", "Cambio de batería"], ["carga", "pin", "Pin de carga"], ["software", "software", "Software y desbloqueos"]];
function precioDesdeTrabajo(parte) { const t = TRABAJOS[parte]; const r = (t && t.repuesto && REPUESTOS[t.repuesto]) || REPUESTOS.software; return manoObra(parte, "", "baja") + precioVenta(r.baja[0]); }
function renderServicios() {
  $("#services").innerHTML = DESTACADOS.map(([cat, parte, nombre]) => `<button class="svc" type="button" data-c="${cat}"><img src="iconos/${cat}.png" alt="" onerror="this.remove()"><div><b>${esc(nombre)}</b><span class="from">desde ${fmt(precioDesdeTrabajo(parte))}</span></div></button>`).join("");
  $("#map").href = mapsUrl(); $("#map-open").href = mapsUrl();
  // Mapa de Google incrustado. Dentro de visores que prohíben iframes externos (la vista previa de Claude, algunas apps)
  // queda la tarjeta con el pin, que abre Google Maps al tocarla.
  const lugar = [TALLER.direccion, TALLER.localidad].filter(Boolean).join(", ");
  const bloqueado = /claude\.ai|anthropic|localhost|127\.0\.0\.1/.test(location.hostname) || location.protocol === "file:";
  if (lugar && !bloqueado) {
    const f = document.createElement("iframe");
    f.title = `Mapa: ${TALLER.nombre}`; f.loading = "lazy"; f.referrerPolicy = "no-referrer-when-downgrade"; f.allowFullscreen = true;
    f.src = "https://www.google.com/maps?q=" + encodeURIComponent(lugar) + "&z=16&hl=es&output=embed";
    f.addEventListener("load", () => { $("#map-frame").classList.add("on"); $("#map").classList.add("hidden"); $("#map-open").classList.remove("hidden"); });
    $("#map-frame").appendChild(f);
  }
  const ld = { "@context": "https://schema.org", "@type": "ElectronicsStore", name: TALLER.nombre, description: "Reparación de celulares", address: { "@type": "PostalAddress", streetAddress: TALLER.direccion, addressLocality: TALLER.localidad, addressCountry: "AR" }, openingHours: TALLER.horario, telephone: TALLER.whatsapp ? "+" + String(TALLER.whatsapp).replace(/\D/g, "") : undefined, url: location.href.split("#")[0] };
  const s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify(ld); document.head.appendChild(s);
}

// ---------- Eventos ----------
document.addEventListener("click", e => {
  const b = e.target.closest("[data-m]"); if (b) return elegirMarca(b.dataset.m);
  const x = e.target.closest("[data-x]"); if (x) return elegirModelo(x.dataset.x);
  const c = e.target.closest(".cat[data-c]"); if (c) return mostrarCat(c.dataset.c);
  if (e.target.closest("#back-cats")) return mostrarCats();
  const s = e.target.closest(".svc[data-c]"); if (s) { if (sel.modelo) { mostrarCat(s.dataset.c); paso(3); } else { sel.catPendiente = s.dataset.c; paso(sel.marca ? 2 : 1); $("#cotizador").scrollIntoView({ behavior: "smooth" }); } return; }
  const st = e.target.closest(".step.done[data-step]"); if (st) return paso(Number(st.dataset.step));
  const f = e.target.closest("[data-i]"); if (f) return elegirFalla(Number(f.dataset.i));
  const n = e.target.closest("[data-n]"); if (n) { sel.nivel = n.dataset.n; renderResultado(); return; }
  const bk = e.target.closest("[data-back]"); if (bk) return paso(Number(bk.dataset.back));
  if (e.target.closest("#otra-falla")) { mostrarCats(); return paso(3); }
  if (e.target.closest("#otro-equipo")) { sel.marca = ""; sel.modelo = ""; sel.cat = ""; sel.catPendiente = ""; sel.falla = -1; renderMarcas(); paso(1); return; }
  if (e.target.closest("#more-brands")) { sel.todasMarcas = !sel.todasMarcas; renderMarcas(); return; }
});
$("#q-modelo").addEventListener("input", renderModelos);
$("#q-modelo").addEventListener("keydown", e => { if (e.key === "Enter") { const u = document.querySelectorAll("#models [data-x]"); if (u.length === 1) elegirModelo(u[0].dataset.x); } });
$("#q-falla").addEventListener("input", buscarFallas);
document.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".step.done")) { e.preventDefault(); paso(Number(e.target.dataset.step)); } });

// ---------- Inicio ----------
setContacto(); renderMarcas(); renderServicios(); paso(1);
fetch("modelos/index.json").then(r => r.ok ? r.json() : null).then(d => { if (d && d.modelos) { fotos = d.modelos; if (sel.marca && !$("#p-modelo").classList.contains("hidden")) renderModelos(); } }).catch(() => { });
// Precios de Mercado Libre: primero los que vienen publicados con la web; si tienen más de un día, se piden los
// últimos directo al repo (el robot los sube a diario), así el cliente siempre ve el precio del día aunque la web
// no se haya vuelto a publicar.
function usarPrecios(d) { if (d && d.precios && (!mlData || String(d.actualizado || "") > String(mlData.actualizado || ""))) { mlData = d; if (sel.falla >= 0) renderResultado(); } }
const UN_DIA = 24 * 60 * 60 * 1000;
fetch("precios-ml.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : null).then(d => {
  usarPrecios(d);
  const viejo = !d || !d.actualizado || Date.now() - new Date(d.actualizado).getTime() > UN_DIA;
  if (viejo && typeof PRECIOS_URL === "string" && PRECIOS_URL) fetch(PRECIOS_URL, { cache: "no-cache" }).then(r => r.ok ? r.json() : null).then(usarPrecios).catch(() => { });
}).catch(() => { });

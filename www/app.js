// ===== Celu Fácil — lógica de la app =====
// Capas: utilidades → almacenamiento y respaldo → diálogos → navegación → pantallas → acciones → arranque.
"use strict";

// ---------- Utilidades ----------
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const fmt = n => "$" + Math.round(Number(n) || 0).toLocaleString("es-AR");
const fmtK = n => n >= 1000 ? "$" + Math.round(n / 1000) + "k" : fmt(n);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const redondear = (n, a = 500) => Math.round((Number(n) || 0) / a) * a;
const hoyISO = () => new Date().toISOString();
const fechaCorta = iso => new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
const NOMBRE_CAT = Object.fromEntries(CATEGORIAS.map(c => [c.id, c.nombre]));
const MARCA_UI = { Samsung: ["S", "#1428a0"], Motorola: ["M", "#5c92fa"], Xiaomi: ["Mi", "#ff6900"], iPhone: ["", "#1f1f1f"], TCL: ["TCL", "#e32226"], ZTE: ["ZTE", "#0066b3"], Realme: ["R", "#d4a800"], Huawei: ["H", "#cf0a2c"], Nokia: ["N", "#124191"], Alcatel: ["A", "#2a7ac5"], Noblex: ["Nb", "#e30613"], LG: ["LG", "#a50034"], Sony: ["S", "#1f1f1f"], BGH: ["B", "#1b3f94"], BLU: ["B", "#1f1f1f"], Otro: ["+", "#6f6f6f"] };
// Imágenes de marcas: 1) las que cargues desde Mi taller (quedan en el teléfono); 2) archivos www/marcas/<marca>.png del proyecto.
// Si no hay imagen, se muestra el monograma de color.
const slugMarca = m => String(m).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
let logos = {};                                   // se carga en la sección de almacenamiento (store se define más abajo)
function srcLogo(m) { return logos[m] || (typeof __LOGOS !== "undefined" && __LOGOS[slugMarca(m)]) || `marcas/${slugMarca(m)}.png`; } // __LOGOS: imágenes incrustadas en la versión de un solo archivo
// Sin loading="lazy": la imagen arranca con display:none y Chromium nunca carga una imagen perezosa sin caja → quedaría el monograma para siempre
function tileMarca(m) {
  const [t, c] = MARCA_UI[m] || [m[0], "#6f6f6f"];
  return `<div class="lg" style="background:${c}"><span>${t || ico("phone", 22)}</span><img src="${esc(srcLogo(m))}" alt="" onload="this.parentNode.classList.add('con-img')" onerror="this.remove()"></div>`;
}
// Íconos PNG de las categorías de falla (www/iconos/<cat>.png, Font Awesome vía Wikimedia Commons; créditos en Acerca de).
// Si falta el archivo, queda el ícono SVG propio. __ICONOS: imágenes incrustadas en la versión de un solo archivo.
function srcIconoCat(cat) { return (typeof __ICONOS !== "undefined" && __ICONOS[cat]) || `iconos/${cat}.png`; }
function iconoCat(cat, size = 26) {
  return `<span class="cico" style="width:${size}px;height:${size}px"><img src="${esc(srcIconoCat(cat))}" alt="" onload="this.parentNode.classList.add('con-img')" onerror="this.remove()">${ico(CAT_ICON[cat], size)}</span>`;
}
const POPULARES = [0, 6, 11, 1, 29, 30, 36, 17];
// Inicio muestra las 8 marcas con más volumen de taller; el resto (y las que agregues) queda detrás de "Otras marcas"
const MARCAS_PRINCIPALES = ["Samsung", "Motorola", "Xiaomi", "iPhone", "TCL", "ZTE", "Realme", "Huawei"];
const MARCAS_BASE = Object.keys(MARCAS);
function listaMarcas() { const extra = Object.keys(MARCAS).filter(m => !MARCAS_BASE.includes(m)); return [...MARCAS_BASE.filter(m => m !== "Otro"), ...extra, "Otro"]; }
const sumarDias = (iso, dias) => { const d = new Date(iso); d.setDate(d.getDate() + (Number(dias) || 0)); return d; };
const diasDesde = iso => iso ? Math.floor((Date.now() - new Date(iso)) / 864e5) : 0;
function garHasta(o) { return o && o.fechaEntrega ? sumarDias(o.fechaEntrega, o.gar ?? cfg.gar) : null; }
function equipoDe(o) { const m = String(o.marca || "").trim(), x = String(o.modelo || "").trim(); return (x.toLowerCase().startsWith(m.toLowerCase()) ? x : `${m} ${x}`).trim(); }
function garVigente(o) { const h = garHasta(o); return !!h && h >= new Date(); }
const CHECKLIST = ["Enciende", "Pantalla rota", "Rayones", "Golpes", "Tapa rota", "Mojado", "Con funda", "Con SIM", "Con SD"];
const ESTADOS_ACTIVOS = e => !["Entregado", "Sin reparación"].includes(e);

function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 2400); }
function hace(iso) {
  if (!iso) return ""; const h = Math.round((Date.now() - new Date(iso)) / 36e5);
  return h < 1 ? "hace minutos" : h < 48 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
}
function versionMayor(a, b) { // true si a > b (semver simple)
  const pa = String(a).replace(/^v/, "").split(".").map(Number), pb = String(b).replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0); }
  return false;
}

// ---------- Capacitor (plugins nativos, opcionales) ----------
const Cap = typeof window !== "undefined" ? window.Capacitor : null;
const esNativo = !!(Cap && typeof Cap.isNativePlatform === "function" && Cap.isNativePlatform());
const Plugin = n => (esNativo && Cap.Plugins && Cap.Plugins[n]) || null;
const plataforma = esNativo ? (typeof Cap.getPlatform === "function" ? Cap.getPlatform() : "android") : "web"; // "android" (APK), "windows" (CeluFacil.exe) o "web"

// ---------- Almacenamiento ----------
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem("cf_" + k)); return v === null || v === undefined ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("cf_" + k, JSON.stringify(v)); } catch (e) { toast("Sin espacio para guardar: exportá un respaldo"); } programarRespaldo(); }
};
// Datos del taller por defecto (editables en Mi taller). Si el nombre quedó vacío en una versión anterior, se completa.
const CFG_DEFECTO = { nombre: "SuperCell La Matanza", tel: "", direccion: "Barragán Bastilla 6662", localidad: "La Matanza, Buenos Aires", gar: 30, recargo: 20, horario: "", preciosUrl: "" };
// La localidad no se muestra: solo sirve para que el link de Google Maps encuentre la dirección
function mapsUrl() { return cfg.direccion ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([cfg.direccion, cfg.localidad].filter(Boolean).join(", ")) : ""; }
function pieContacto() { return (cfg.direccion ? "\n📍 " + cfg.direccion : "") + (cfg.tel ? "\n📞 " + cfg.tel : ""); }
let cfg = { ...CFG_DEFECTO, ...store.get("cfg", {}) };
if (!cfg.nombre) cfg.nombre = CFG_DEFECTO.nombre;
if (!cfg.direccion || cfg.direccion === "Barragán Bastilla 6662, La Matanza") cfg.direccion = CFG_DEFECTO.direccion;
if (cfg.localidad === undefined) cfg.localidad = CFG_DEFECTO.localidad;
let precios = store.get("precios", {});               // mano de obra por tipo de trabajo (override)
precios = Object.fromEntries(Object.entries(precios).filter(([k]) => TRABAJOS[k]));
// v2.1: el "ajuste global de mano de obra" se eliminó; si había uno cargado, queda aplicado en los precios por trabajo
if (Number(cfg.ajuste)) { for (const k of Object.keys(TRABAJOS)) precios[k] = Math.round((precios[k] ?? TRABAJOS[k].mo) * (1 + Number(cfg.ajuste) / 100)); delete cfg.ajuste; localStorage.setItem("cf_precios", JSON.stringify(precios)); localStorage.setItem("cf_cfg", JSON.stringify(cfg)); }
delete cfg.ajuste;
// Marcas y modelos propios (Mi taller): se suman a la tabla de la app
let marcasExtra = store.get("marcas_extra", {});
function aplicarMarcasExtra() {
  for (const [m, gamas] of Object.entries(marcasExtra)) {
    if (!MARCAS[m]) MARCAS[m] = { alta: [], media: [], baja: [] };
    for (const g of ["alta", "media", "baja"]) for (const x of (gamas[g] || [])) if (!MARCAS[m][g].includes(x)) MARCAS[m][g].push(x);
  }
}
aplicarMarcasExtra();
let exclusiones = store.get("excl", { ids: [] }); if (!Array.isArray(exclusiones.ids)) exclusiones = { ids: [] }; // publicaciones de ML ocultadas por vos
let repCustom = store.get("repcustom", {});
logos = store.get("logos", {});           // precio pagado por repuesto: "parte|marca|modelo" o "parte|gama|marca"
let ordenes = store.get("ordenes", []);
let pres = store.get("pres", null) || { equipo: "", marca: "", modelo: "", falla: "", mo: 0, items: [] };
pres.items = (pres.items || []).map(it => ({ ...it, costo: it.costo ?? it.p ?? 0 }));
let mlData = store.get("mldata", null) || (typeof __DEMO_ML !== "undefined" ? __DEMO_ML : null);
let sel = { marca: "", modelo: "", gama: "baja", gamaF: "", cat: "", est: "", nivel: store.get("nivel", NIVEL_DEFECTO), cliente: "", masMarcas: store.get("masmarcas", false), cliQ: "" };
let hist = [], detIdx = null, fotosTmp = [], fotosBorrar = [], itemsTmp = [];

// ---------- Respaldo automático ----------
const Fs = () => Plugin("Filesystem");
let respaldoTimer = null, respaldoEstado = store.get("respaldo_estado", "");
function payloadRespaldo() { return { v: 4, app: APP_VERSION, fecha: hoyISO(), cfg, precios, repCustom, ordenes, marcasExtra, exclusiones }; }
function programarRespaldo() { clearTimeout(respaldoTimer); respaldoTimer = setTimeout(() => respaldar().catch(() => { }), 1500); }
async function escribirArchivo(path, data, directory) {
  const fs = Fs(); if (!fs) throw new Error("sin filesystem");
  return fs.writeFile({ path, data, directory, encoding: "utf8", recursive: true });
}
async function leerArchivo(path, directory) {
  const fs = Fs(); if (!fs) throw new Error("sin filesystem");
  const r = await fs.readFile({ path, directory, encoding: "utf8" }); return typeof r.data === "string" ? r.data : "";
}
async function respaldar() {
  if (!Fs()) return;
  const json = JSON.stringify(payloadRespaldo());
  let donde = [];
  // Android — DATA: privado de la app (sobrevive a las actualizaciones). EXTERNAL: Android/data/ar.com.celufacil.app/files, visible desde el administrador de archivos.
  // Windows — una sola carpeta: datos\CeluFacil al lado de CeluFacil.exe.
  const destinos = plataforma === "windows" ? [["DATA", "la carpeta datos\\CeluFacil (al lado de CeluFacil.exe)"]] : [["DATA", "la app"], ["EXTERNAL", "Android/data"]];
  for (const [dir, nombre] of destinos) { try { await escribirArchivo("CeluFacil/respaldo-ultimo.json", json, dir); donde.push(nombre); } catch { } }
  const semana = new Date().toISOString().slice(0, 10);
  if (store.get("respaldo_semana", "") !== semana && new Date().getDay() === 1) { // una copia fechada cada lunes
    try { await escribirArchivo(`CeluFacil/respaldo-${semana}.json`, json, "EXTERNAL"); } catch { }
    localStorage.setItem("cf_respaldo_semana", JSON.stringify(semana));
  }
  const consejo = plataforma === "windows" ? "Copiá esa carpeta a un pendrive o a Drive cada tanto." : "Compartilo a Drive o WhatsApp cada tanto: si desinstalás la app se pierde.";
  respaldoEstado = donde.length ? `Respaldo automático ${fechaCorta(hoyISO())} ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} en ${donde.join(" y ")}. ${consejo}` : "No se pudo escribir el respaldo automático";
  localStorage.setItem("cf_respaldo_estado", JSON.stringify(respaldoEstado));
  const e = $("#respaldo-estado"); if (e) e.textContent = respaldoEstado;
}
async function ofrecerRestaurar() {
  if (!Fs() || ordenes.length) return;
  let texto = "";
  for (const dir of ["DATA", "EXTERNAL"]) { try { texto = await leerArchivo("CeluFacil/respaldo-ultimo.json", dir); if (texto) break; } catch { } }
  if (!texto) return;
  try {
    const d = JSON.parse(texto); if (!Array.isArray(d.ordenes) || !d.ordenes.length) return;
    const ok = await dialogo({ titulo: "Respaldo encontrado", mensaje: `Hay un respaldo con ${d.ordenes.length} órdenes${d.fecha ? " del " + fechaCorta(d.fecha) : ""}. ¿Querés restaurarlo?`, ok: "Restaurar", cancelar: "Ahora no" });
    if (ok) { aplicarImportacion(d); toast("Respaldo restaurado"); renderInicio(); }
  } catch { }
}
function aplicarImportacion(d) {
  cfg = { ...CFG_DEFECTO, ...(d.cfg || {}) }; precios = Object.fromEntries(Object.entries(d.precios || {}).filter(([k]) => TRABAJOS[k]));
  repCustom = d.repCustom || {}; ordenes = (d.ordenes || []).map(o => ({ fotos: [], recibido: [], costo: 0, ...o }));
  marcasExtra = d.marcasExtra || {}; aplicarMarcasExtra(); exclusiones = d.exclusiones && Array.isArray(d.exclusiones.ids) ? d.exclusiones : { ids: [] };
  store.set("cfg", cfg); store.set("precios", precios); store.set("repcustom", repCustom); store.set("ordenes", ordenes); store.set("marcas_extra", marcasExtra); store.set("excl", exclusiones);
}
async function exportar() {
  const json = JSON.stringify(payloadRespaldo());
  const nombre = `celufacil-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
  localStorage.setItem("cf_export_last", JSON.stringify(Date.now())); mostrarAvisoRespaldo();
  if (Fs()) {
    try {
      let r; try { r = await escribirArchivo("CeluFacil/" + nombre, json, "EXTERNAL"); } catch { r = await escribirArchivo(nombre, json, "CACHE"); }
      const Share = Plugin("Share");
      if (Share && r && r.uri) { try { await Share.share({ title: "Respaldo Celu Fácil", text: "Respaldo de órdenes y precios de Celu Fácil", url: r.uri, dialogTitle: "Guardar o enviar el respaldo" }); } catch { } return; }
      toast(plataforma === "windows" ? "Guardado en la carpeta datos\\CeluFacil, al lado de CeluFacil.exe" : "Guardado en Android/data/ar.com.celufacil.app/files/CeluFacil"); return;
    } catch { }
  }
  const a = document.createElement("a"); a.href = "data:application/json;charset=utf-8," + encodeURIComponent(json); a.download = nombre; a.click();
  toast("Respaldo exportado");
}
function importar(ev) {
  const f = ev.target.files && ev.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try { const d = JSON.parse(String(r.result)); if (!d.ordenes && !d.cfg) throw 0; aplicarImportacion(d); renderConfig(); toast("Datos importados"); } catch { toast("El archivo no es un respaldo válido"); } };
  r.readAsText(f); ev.target.value = "";
}

// ---------- Diálogos propios (reemplazan confirm/prompt) ----------
let dlgResolver = null;
function dialogo({ titulo = "", mensaje = "", ok = "Aceptar", cancelar = "Cancelar", peligro = false, input = null }) {
  if (dlgResolver) { const r = dlgResolver; dlgResolver = null; r(null); } // un diálogo nuevo cancela el anterior
  return new Promise(resolve => {
    dlgResolver = resolve;
    $("#dlg-title").textContent = titulo; $("#dlg-msg").textContent = mensaje; $("#dlg-msg").classList.toggle("hidden", !mensaje);
    const inp = $("#dlg-input"); inp.classList.toggle("hidden", !input);
    if (input) { inp.type = input.tipo || "text"; inp.placeholder = input.placeholder || ""; inp.value = input.valor ?? ""; inp.inputMode = input.tipo === "number" ? "numeric" : "text"; }
    const bOk = $("#dlg-ok"); bOk.textContent = ok; bOk.classList.toggle("danger", peligro);
    const bCancel = $("#dlg-cancel"); bCancel.textContent = cancelar; bCancel.classList.toggle("hidden", cancelar === null);
    $("#dlg").classList.remove("hidden");
    if (input) setTimeout(() => inp.focus(), 50);
  });
}
function cerrarDialogo(valor) {
  $("#dlg").classList.add("hidden");
  const r = dlgResolver; dlgResolver = null;
  if (r) r(valor);
}
function dlgAceptar() { const inp = $("#dlg-input"); cerrarDialogo(inp.classList.contains("hidden") ? true : inp.value); }
function dlgCancelar() { cerrarDialogo(null); }

// ---------- Precios ----------
function gamaDe(marca, modelo) { const m = MARCAS[marca]; if (!m) return "baja"; for (const g of ["alta", "media", "baja"]) if (m[g].includes(modelo)) return g; return "baja"; }
function moBase(parte) { return precios[parte] ?? (TRABAJOS[parte] ? TRABAJOS[parte].mo : 0); }
function calcMO(i, marca, gama) {
  let p = moBase(FALLAS[i].parte) * (MULT_GAMA[gama] || 1); if (marca === "iPhone") p *= RECARGO_IPHONE;
  return redondear(p);
}
function repInfo(i, marca, gama) {
  const t = TRABAJOS[FALLAS[i].parte]; const parte = t && t.repuesto;
  const r = (parte && REPUESTOS[parte]) || REPUESTOS.software;
  const ref = marca === "iPhone" ? r.iphone : r[gama];
  const keyModelo = sel.modelo ? `${parte}|${marca}|${sel.modelo}` : null;
  const keyGama = `${parte}|${gama}|${marca}`;
  const custom = (keyModelo && repCustom[keyModelo]) ?? repCustom[keyGama];
  // Niveles de referencia (tabla estática)…
  const niveles = { economico: { p: ref[0], env: null, ref: true }, original: { p: ref[1], env: null, ref: true }, premium: { p: ref[2], env: null, ref: true } };
  // …reemplazados por los reales de Mercado Libre cuando el robot tiene datos del modelo exacto
  const ml = (sel.modelo && mlData && mlData.precios && mlData.precios[`${parte}|${marca}|${sel.modelo}`]) || null;
  let ocultas = 0;
  if (ml) {
    const nv = ml.niveles || { economico: ml.min ? { p: ml.min, env: ml.top && ml.top[0] ? !!ml.top[0].env : null, t: ml.top && ml.top[0] ? ml.top[0].t : "", u: ml.top && ml.top[0] ? ml.top[0].u : "" } : null, original: ml.mediana ? { p: ml.mediana, env: null } : null, premium: ml.p75 ? { p: ml.p75, env: null } : null };
    for (const k of ["economico", "original", "premium"]) {
      let n = nv[k]; if (!n || !(n.p > 0)) continue;
      // Si ocultaste esa publicación, se usa la siguiente más barata del mismo nivel que guardó el robot; si no queda ninguna, la referencia
      if (n.id && exclusiones.ids.includes(n.id)) { ocultas++; n = (n.alt || []).find(a => a && a.p > 0 && !exclusiones.ids.includes(a.id)) || null; }
      if (n) niveles[k] = { ...n, alt: undefined, ref: false };
    }
  }
  const nivel = r.unico ? "original" : (NIVELES[sel.nivel] ? sel.nivel : NIVEL_DEFECTO);
  const costo = custom ?? niveles[nivel].p;
  return { ...r, parte, niveles, nivel, custom, key: keyModelo || keyGama, ml, ocultas, costo, tieneRepuesto: !!parte, unico: !!r.unico, rango: [niveles.economico.p, niveles.premium.p] };
}
function setNivel(n) { if (NIVELES[n]) { sel.nivel = n; store.set("nivel", n); renderDetalle(); } }
function ocultarPublicacion(id) {
  if (!id || exclusiones.ids.includes(id)) return;
  exclusiones.ids.push(id); store.set("excl", exclusiones); renderDetalle(); toast("Publicación oculta: se usa la siguiente del mismo nivel");
}
function restaurarPublicaciones() { exclusiones = { ids: [] }; store.set("excl", exclusiones); renderConfig(); toast("Publicaciones restauradas"); }
async function copiarExclusiones() {
  const texto = JSON.stringify({ ids: exclusiones.ids }, null, 2);
  try { await navigator.clipboard.writeText(texto); toast("Lista copiada: pegala en www/exclusiones.json del proyecto"); } catch { await dialogo({ titulo: "Publicaciones ocultas", mensaje: texto, ok: "Cerrar", cancelar: null }); }
}
function precioVenta(costo) { return redondear((Number(costo) || 0) * (1 + (Number(cfg.recargo) || 0) / 100)); }
function equipoTxt() { return sel.modelo ? `${sel.marca} ${sel.modelo}` : (sel.marca || "Sin equipo"); }
function mlUrl(i) {
  const t = TRABAJOS[FALLAS[i].parte]; const rep = t && t.repuesto ? REPUESTOS[t.repuesto] : null;
  if (!rep || !rep.ml) return "";
  const q = `${rep.ml} ${sel.marca === "iPhone" ? "" : sel.marca} ${sel.modelo}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, "-");
  return "https://listado.mercadolibre.com.ar/" + encodeURIComponent(q);
}
function setRep(key, v) { v = Number(v); if (v > 0) repCustom[key] = v; else delete repCustom[key]; store.set("repcustom", repCustom); toast(v > 0 ? "Precio guardado para este equipo" : "Precio borrado"); }

// ---------- Precios de Mercado Libre (JSON publicado por el robot) ----------
// Se queda con el archivo más nuevo entre: el incluido en el APK, el guardado de la última descarga y el publicado online.
const fechaML = j => (j && typeof j.precios === "object" && Object.keys(j.precios).length && j.actualizado) ? String(j.actualizado) : "";
async function cargarPreciosML(manual = false) {
  const url = cfg.preciosUrl || PRECIOS_URL;
  const estado = $("#ml-estado"); if (estado && manual) estado.textContent = "Actualizando…";
  let incluido = null;
  if (!(mlData && mlData.demo)) { try { const r = await fetch("precios-ml.json", { cache: "no-store" }); if (r.ok) incluido = await r.json(); } catch { } }
  if (fechaML(incluido) > fechaML(mlData)) mlData = incluido;
  try {
    const r = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json(); if (!j || typeof j.precios !== "object") throw new Error("formato inválido");
    if (fechaML(j) >= fechaML(mlData)) { mlData = j; localStorage.setItem("cf_mldata", JSON.stringify(j)); if (manual) toast(fechaML(j) ? "Precios actualizados" : "El archivo online todavía no tiene precios"); }
    else if (manual) toast("El archivo online es más viejo que el que ya tiene la app");
  } catch (e) {
    if (manual) toast("No se pudo actualizar: " + e.message);
  }
  renderMlEstado();
  const act = pantallaActiva(); if (act === "detalle") renderDetalle(); else if (act === "fallas") renderFallas();
}
function renderMlEstado() {
  const e = $("#ml-estado"); if (!e) return;
  const n = Object.keys((mlData && mlData.precios) || {}).length;
  e.textContent = mlData && mlData.demo ? `Demo con ${n} precios de ejemplo` : mlData && mlData.actualizado ? `Última actualización ${hace(mlData.actualizado)} · ${n} precios exactos de Mercado Libre` : "Sin precios de Mercado Libre todavía: el robot los publica cuando el proyecto está en GitHub (ver README).";
}

// ---------- Aviso de nueva versión ----------
async function buscarActualizacion(manual = false) {
  const ultimo = store.get("upd_check", 0);
  if (!manual && Date.now() - ultimo < 12 * 36e5) { mostrarBannerActualizacion(store.get("upd_info", null)); return; }
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json(); const tag = String(j.tag_name || "").replace(/^v/, "");
    // En Windows se baja el zip de escritorio; en Android y en la web, el APK
    const archivo = (j.assets || []).find(a => plataforma === "windows" ? /windows.*\.zip$/i.test(a.name) : /\.apk$/i.test(a.name));
    const info = versionMayor(tag, APP_VERSION) ? { version: tag, url: (archivo && archivo.browser_download_url) || j.html_url } : null;
    localStorage.setItem("cf_upd_check", JSON.stringify(Date.now())); localStorage.setItem("cf_upd_info", JSON.stringify(info));
    mostrarBannerActualizacion(info);
    if (manual) toast(info ? `Hay una versión nueva: ${info.version}` : `Tenés la última versión (${APP_VERSION})`);
  } catch (e) { if (manual) toast("No se pudo consultar: " + e.message); }
}
function mostrarAvisoRespaldo() {
  const b = $("#backup-banner"); if (!b) return;
  const ultimo = store.get("export_last", 0); const dias = Math.floor((Date.now() - ultimo) / 864e5);
  const mostrar = ordenes.length >= 5 && dias >= 14;
  b.classList.toggle("hidden", !mostrar);
  if (mostrar) b.innerHTML = `${ico("shield", 20)}<div><b>Compartí un respaldo</b><small>${ultimo ? `Hace ${dias} días que no guardás una copia fuera del teléfono.` : "Todavía no guardaste una copia fuera del teléfono."} Mandala a tu Drive o WhatsApp.</small></div><button class="btn sm primary" onclick="exportar()">Exportar</button>`;
}
function mostrarBannerActualizacion(info) {
  const b = $("#update-banner"); if (!b) return;
  if (!info) { b.classList.add("hidden"); return; }
  b.classList.remove("hidden");
  b.innerHTML = `${ico("download", 20)}<div><b>Nueva versión ${esc(info.version)}</b><small>Tenés la ${esc(APP_VERSION)}. Descargá e instalá el APK sobre la actual, sin perder datos.</small></div><a class="btn sm primary" href="${esc(info.url)}" target="_blank" rel="noopener">Descargar</a>`;
}

// ---------- Navegación ----------
const TAB_DE = { inicio: "inicio", fallas: "inicio", modelos: "inicio", detalle: "inicio", carrito: "carrito", ordenes: "ordenes", compras: "ordenes", clientes: "clientes", cliente: "clientes", ajustes: "ajustes" };
const RENDER = { inicio: renderInicio, modelos: renderModelos, fallas: renderFallas, detalle: renderDetalle, carrito: renderPres, ordenes: renderOrdenes, compras: renderCompras, clientes: renderClientes, cliente: renderCliente, ajustes: renderConfig };
function pantallaActiva() { const s = document.querySelector(".screen.active"); return s ? s.dataset.screen : ""; }
function go(screen, push = true, opts = {}) {
  if (screen === "buscar") { sel.cat = ""; screen = "fallas"; $("#fallas-title").textContent = sel.modelo ? `Fallas · ${sel.modelo}` : "Todas las fallas"; }
  if (opts.est !== undefined) sel.est = opts.est;
  const cur = pantallaActiva();
  if (push !== false && cur && cur !== screen) hist.push(cur);
  $$(".screen").forEach(s => s.classList.toggle("active", s.dataset.screen === screen));
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.go === TAB_DE[screen]));
  $("#back").classList.toggle("hidden", screen === "inicio");
  if (RENDER[screen]) RENDER[screen]();
  renderCrumbs(screen); window.scrollTo(0, 0);
}
function volver() { go(hist.pop() || "inicio", false); }
function renderCrumbs(screen) {
  const parts = [];
  if (["modelos", "fallas", "detalle"].includes(screen)) {
    if (sel.marca) parts.push(sel.marca); if (sel.modelo && screen !== "modelos") parts.push(sel.modelo);
    if (screen === "fallas" && sel.cat) parts.push(NOMBRE_CAT[sel.cat]);
  }
  $("#crumbs").innerHTML = parts.length
    ? parts.map(esc).join(` ${ico("chev", 12)} `) + (sel.modelo && screen !== "modelos" ? ` <span class="gama ${sel.gama}">${sel.gama}</span>` : "")
    : `${ico("location", 14)} <b>${esc(cfg.nombre || "Celu Fácil")}</b>${cfg.direccion ? ` · ${esc(cfg.direccion)}` : ""}`;
}

// ---------- Búsqueda ----------
function onBuscar() {
  const q = $("#q").value.trim(); $("#q-clear").classList.toggle("hidden", !q);
  if (!q) { if (pantallaActiva() === "fallas") renderFallas(); return; }
  sel.cat = ""; $("#fallas-title").textContent = `Resultados para “${q}”`;
  if (pantallaActiva() !== "fallas") go("fallas"); else renderFallas();
}
function limpiarBusqueda() { $("#q").value = ""; $("#q-clear").classList.add("hidden"); if (pantallaActiva() === "fallas") renderFallas(); }

// ---------- Inicio ----------
function resumenMes() {
  const ahora = new Date(); const m = ahora.getMonth(), y = ahora.getFullYear();
  let ganancia = 0, cobrado = 0, porCobrar = 0;
  for (const o of ordenes) {
    if (o.estado === "Entregado") {
      const f = new Date(o.fechaEntrega || o.fecha);
      if (f.getMonth() === m && f.getFullYear() === y) { ganancia += (Number(o.total) || 0) - (Number(o.costo) || 0); cobrado += Number(o.total) || 0; }
    } else if (ESTADOS_ACTIVOS(o.estado)) porCobrar += (Number(o.total) || 0) - (Number(o.sena) || 0);
  }
  return { ganancia, cobrado, porCobrar };
}
function tileMarcaBtn(m) { return `<button class="brand" onclick="abrirMarca(this.dataset.m)" data-m="${esc(m)}">${tileMarca(m)}<small>${esc(m)}</small></button>`; }
function renderMarcas() {
  const todas = listaMarcas(); const otras = todas.filter(m => !MARCAS_PRINCIPALES.includes(m));
  $("#marcas").innerHTML = MARCAS_PRINCIPALES.filter(m => MARCAS[m]).map(tileMarcaBtn).join("") + (sel.masMarcas ? otras.map(tileMarcaBtn).join("") : "");
  const b = $("#mas-marcas"); if (b) b.innerHTML = sel.masMarcas ? `${ico("minus", 16)} Menos marcas` : `${ico("plus", 16)} Otras marcas (${otras.length})`;
}
function toggleMarcas() { sel.masMarcas = !sel.masMarcas; store.set("masmarcas", sel.masMarcas); renderMarcas(); }
// Avisos de equipos que se están quedando en el taller
function avisos() {
  const out = [];
  for (const o of ordenes) {
    if (!ESTADOS_ACTIVOS(o.estado)) continue;
    const eq = equipoDe(o) || "el equipo", quien = o.cliente ? ` de ${o.cliente}` : "";
    if (o.estado === "Listo") { const d = diasDesde(o.fechaListo || o.fecha); if (d >= 7) out.push({ o, dias: d, texto: `Hace ${d} días que ${eq}${quien} está listo y nadie lo retiró.`, accion: "Avisar" }); }
    else if (o.estado === "Recibido") { const d = diasDesde(o.fecha); if (d >= 2) out.push({ o, dias: d, texto: `${eq}${quien} lleva ${d} días sin diagnóstico.`, accion: "Abrir" }); }
    else if (o.estado === "Diagnóstico") { const d = diasDesde(o.fechaEstado || o.fecha); if (d >= 3) out.push({ o, dias: d, texto: `${o.cliente || "El cliente"} no respondió el presupuesto de ${eq} hace ${d} días.`, accion: "Avisar" }); }
    else if (o.estado === "Esperando repuesto") { const d = diasDesde(o.fechaEstado || o.fecha); if (d >= 7) out.push({ o, dias: d, texto: `${eq}${quien} espera el repuesto hace ${d} días.`, accion: "Compras" }); }
  }
  return out.sort((a, b) => b.dias - a.dias);
}
function renderAvisos() {
  const c = $("#avisos"); if (!c) return;
  const lista = avisos();
  c.innerHTML = lista.slice(0, 4).map(a => `<div class="aviso"><div>${ico("clock", 18)}</div><div class="txt">${esc(a.texto)}</div>${a.accion === "Avisar" ? `<button class="btn sm" onclick="avisarEstado(${a.o.id})">${ico("whatsapp", 14)} Avisar</button>` : a.accion === "Compras" ? `<button class="btn sm" onclick="go('compras')">Compras</button>` : `<button class="btn sm" onclick="abrirOrden(${a.o.id})">Abrir</button>`}</div>`).join("")
    + (lista.length > 4 ? `<button class="lnk" onclick="go('ordenes', true, {est:'Activas'})">Ver las ${lista.length} órdenes con demora</button>` : "");
  c.classList.toggle("hidden", !lista.length);
}
function renderInicio() {
  renderMarcas();
  $("#categorias").innerHTML = CATEGORIAS.map(c => `<button class="cat" onclick="abrirCat('${c.id}')"><div class="ci c-${c.id}">${iconoCat(c.id, 32)}</div><small>${c.nombre}</small></button>`).join("");
  $("#populares").innerHTML = POPULARES.map(i => prodCard(i)).join("");
  const act = ordenes.filter(o => ESTADOS_ACTIVOS(o.estado)).length, listas = ordenes.filter(o => o.estado === "Listo").length, r = resumenMes();
  $("#ord-count").textContent = act; $("#listo-count").textContent = listas;
  $("#ganancia-mes").textContent = fmt(r.ganancia); $("#porcobrar").textContent = fmt(r.porCobrar);
  $("#hero-taller").textContent = cfg.nombre || "Celu Fácil";
  const comp = listaCompras(); const cc = $("#compras-card");
  if (cc) { cc.classList.toggle("hidden", !comp.pendientes); cc.innerHTML = `${ico("box", 22)}<div><b>${comp.pendientes} repuesto${comp.pendientes === 1 ? "" : "s"} para comprar</b><small>${comp.ordenes.length} orden${comp.ordenes.length === 1 ? "" : "es"} esperando repuesto · ${fmt(comp.costo)} estimados</small></div>${ico("chev", 18)}`; }
  renderAvisos(); mostrarAvisoRespaldo();
}
function abrirMarca(m) { sel.marca = m; sel.modelo = ""; sel.gama = "baja"; sel.gamaF = ""; go("modelos"); }
function abrirCat(c) { sel.cat = c; limpiarBusqueda(); $("#fallas-title").textContent = NOMBRE_CAT[c]; go("fallas"); }

// ---------- Modelos ----------
function renderModelos() {
  const m = MARCAS[sel.marca]; if (!m) return;
  $("#marca-title").textContent = sel.marca;
  const todos = ["alta", "media", "baja"].flatMap(g => m[g].map(x => ({ x, g })));
  $("#marca-count").textContent = `${todos.length} modelos · elegí uno para ver fallas y precios`;
  const gamas = ["alta", "media", "baja"].filter(g => m[g].length);
  $("#gama-filter").innerHTML = `<button class="chip ${!sel.gamaF ? "on" : ""}" onclick="sel.gamaF='';renderModelos()">Todos</button>` + gamas.map(g => `<button class="chip ${sel.gamaF === g ? "on" : ""}" onclick="sel.gamaF='${g}';renderModelos()">Gama ${g}</button>`).join("");
  const lista = todos.filter(t => !sel.gamaF || t.g === sel.gamaF);
  const propios = (marcasExtra[sel.marca] && ["alta", "media", "baja"].flatMap(g => marcasExtra[sel.marca][g] || [])) || [];
  $("#modelos").innerHTML = (lista.map(t => `<button class="ri" onclick="abrirModelo(this.dataset.m)" data-m="${esc(t.x)}"><div class="ic">${ico("phone", 20)}</div><div class="txt"><div class="t">${esc(t.x)}${propios.includes(t.x) ? `<span class="opc">propio</span>` : ""}</div><div class="s">Mano de obra ×${MULT_GAMA[t.g]}${sel.marca === "iPhone" ? " · recargo iPhone" : ""}</div></div><span class="gama ${t.g}">${t.g}</span>${ico("chev", 18, "chev")}</button>`).join("")
    || `<div class="empty">${ico("box", 40)}Sin modelos en esta gama</div>`)
    + `<button class="doc-add" style="width:100%;margin:4px 0 0" onclick="formModelo()">${ico("plus", 16)} Agregar un modelo de ${esc(sel.marca)}</button>
    <div class="add-modelo hidden" id="add-modelo"><input id="nuevo-modelo" placeholder="Ej: Galaxy A16"><div class="chips">${["baja", "media", "alta"].map(g => `<button type="button" class="chip ${g === "baja" ? "on" : ""}" data-g="${g}" onclick="$$('#add-modelo .chip').forEach(c=>c.classList.remove('on'));this.classList.add('on')">Gama ${g}</button>`).join("")}</div><button class="btn primary full" onclick="agregarModelo()">Agregar modelo</button></div>`;
}
function formModelo() { const f = $("#add-modelo"); f.classList.toggle("hidden"); if (!f.classList.contains("hidden")) $("#nuevo-modelo").focus(); }
function normModelo(x) { return String(x || "").trim().replace(/\s+/g, " "); }
function agregarModelo(marca = sel.marca, modelo = $("#nuevo-modelo") && $("#nuevo-modelo").value, gama = ($("#add-modelo .chip.on") || {}).dataset ? $("#add-modelo .chip.on").dataset.g : "baja") {
  modelo = normModelo(modelo); if (!marca || !modelo) { toast("Escribí el nombre del modelo"); return false; }
  const todos = ["alta", "media", "baja"].flatMap(g => (MARCAS[marca] || { alta: [], media: [], baja: [] })[g]);
  if (todos.some(x => x.toLowerCase() === modelo.toLowerCase())) { toast("Ese modelo ya está"); return false; }
  if (!["alta", "media", "baja"].includes(gama)) gama = "baja";
  marcasExtra[marca] = marcasExtra[marca] || { alta: [], media: [], baja: [] }; marcasExtra[marca][gama].push(modelo);
  aplicarMarcasExtra(); store.set("marcas_extra", marcasExtra);
  if (pantallaActiva() === "modelos") { renderModelos(); } toast(`${modelo} agregado a ${marca}`); return true;
}
function quitarModelo(marca, modelo) {
  const e = marcasExtra[marca]; if (!e) return;
  for (const g of ["alta", "media", "baja"]) { e[g] = (e[g] || []).filter(x => x !== modelo); if (MARCAS[marca]) MARCAS[marca][g] = MARCAS[marca][g].filter(x => x !== modelo); }
  if (!MARCAS_BASE.includes(marca) && !["alta", "media", "baja"].some(g => e[g].length)) { delete marcasExtra[marca]; delete MARCAS[marca]; }
  store.set("marcas_extra", marcasExtra); renderConfig();
}
async function nuevaMarca() {
  const nombre = await dialogo({ titulo: "Nueva marca", mensaje: "Nombre de la marca (ej: Infinix, Tecno, Oppo).", ok: "Crear", input: { placeholder: "Marca" } });
  if (nombre === null) return; const m = normModelo(nombre); if (!m) return;
  if (MARCAS[m]) { toast("Esa marca ya existe"); return; }
  marcasExtra[m] = { alta: [], media: [], baja: [] }; aplicarMarcasExtra(); store.set("marcas_extra", marcasExtra);
  const modelo = await dialogo({ titulo: `Primer modelo de ${m}`, mensaje: "Podés agregar más desde la lista de modelos de la marca.", ok: "Agregar", input: { placeholder: "Modelo" } });
  if (modelo) agregarModelo(m, modelo, "baja");
  renderConfig(); toast(`Marca ${m} creada`);
}
function abrirModelo(x) { sel.modelo = x; sel.gama = gamaDe(sel.marca, x); sel.cat = ""; $("#fallas-title").textContent = `¿Qué le pasa al ${x}?`; go("fallas"); }

// ---------- Fallas ----------
function prodCard(i) {
  const f = FALLAS[i]; const marca = sel.marca || "Samsung"; const mo = calcMO(i, marca, sel.gama); const r = repInfo(i, marca, sel.gama);
  const desde = r.custom ?? r.niveles.economico.p;
  const total = mo + (r.tieneRepuesto ? precioVenta(desde) : 0);
  return `<button class="prod" onclick="abrirDetalle(${i})"><div class="img c-${f.cat}">${iconoCat(f.cat, 52)}</div><div class="body">
    <div class="name">${esc(f.sintoma)}</div>
    <div class="price">${fmt(total)}<small>${r.tieneRepuesto ? (r.custom ? "con tu repuesto" : r.ml ? "desde · repuesto económico ML" : "desde · repuesto económico") : "solo mano de obra"}</small></div>
    <div class="tag">${ico("box", 12)} ${esc(r.tieneRepuesto ? r.nombre : "Sin repuesto")}</div>
    <div class="meta">${ico("clock", 12)} ${f.tiempo}</div></div></button>`;
}
function renderFallas() {
  const q = $("#q").value.trim().toLowerCase();
  let lista = FALLAS.map((f, i) => i);
  if (q) lista = lista.filter(i => { const f = FALLAS[i]; return (f.sintoma + " " + f.diag + " " + f.repuesto + " " + NOMBRE_CAT[f.cat]).toLowerCase().includes(q); });
  else if (sel.cat) lista = lista.filter(i => FALLAS[i].cat === sel.cat);
  $("#fallas-sub").textContent = `${lista.length} resultado${lista.length === 1 ? "" : "s"} · ${equipoTxt()}${sel.modelo ? "" : " (precios de gama baja)"}`;
  $("#cat-filter").innerHTML = `<button class="chip ${!sel.cat ? "on" : ""}" onclick="sel.cat='';renderFallas()">Todas</button>` + CATEGORIAS.map(c => `<button class="chip ${sel.cat === c.id ? "on" : ""}" onclick="sel.cat='${c.id}';limpiarBusqueda();renderFallas()">${ico(CAT_ICON[c.id], 14)} ${c.nombre}</button>`).join("");
  $("#fallas").innerHTML = lista.length ? lista.map(prodCard).join("") : `<div class="empty" style="grid-column:1/-1">${ico("search", 40)}No encontramos esa falla.<br>Podés cargarla a mano en Presupuesto.</div>`;
  renderCrumbs("fallas");
}

// ---------- Detalle ----------
function abrirDetalle(i) { detIdx = i; go("detalle"); }
function tarjetaNivel(k, r) {
  const n = r.niveles[k]; const info = NIVELES[k]; const on = r.nivel === k && !r.custom;
  const envio = n.env === true ? `<span class="env si">${ico("check", 11)} Envío gratis</span>` : n.env === false ? `<span class="env no">Envío aparte</span>` : `<span class="env nd">Envío: ver en ML</span>`;
  return `<button type="button" class="nivel ${on ? "on" : ""}" onclick="setNivel('${k}')">
    <small>${esc(info.nombre)}</small><b>${fmt(n.p)}</b><em>${esc(info.sub)}</em>${envio}${n.v ? `<i>${n.v} vendidos</i>` : ""}
    ${n.u ? `<a href="${esc(n.u)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Ver publicación ${ico("external", 11)}</a>` : ""}
    ${n.id && !n.ref ? `<a href="#" class="nosirve" onclick="event.stopPropagation();ocultarPublicacion('${esc(n.id)}');return false" title="Ocultar esta publicación">${ico("x", 10)} no sirve</a>` : ""}</button>`;
}
function renderDetalle() {
  const i = detIdx; if (i === null || !FALLAS[i]) return;
  const f = FALLAS[i]; const marca = sel.marca || "Samsung"; const mo = calcMO(i, marca, sel.gama); const r = repInfo(i, marca, sel.gama);
  const costo = r.costo; const venta = r.tieneRepuesto ? precioVenta(costo) : 0; const nivelInfo = NIVELES[r.nivel];
  const gamaBtns = ["baja", "media", "alta"].map(g => `<button class="${sel.gama === g ? "on" : ""}" onclick="sel.gama='${g}';renderDetalle()">Gama ${g}<b>${fmt(calcMO(i, marca, g))}</b></button>`).join("");
  const ml = r.tieneRepuesto ? mlUrl(i) : "";
  const etiquetaRep = r.custom ? "tu repuesto" : r.unico ? "insumos" : `repuesto ${nivelInfo.nombre.toLowerCase()}`;
  $("#detalle").innerHTML = `<div class="det">
  <div class="main">
    <div class="hero-d c-${f.cat}">${iconoCat(f.cat, 96)}</div>
    <div class="pad">
      <div class="sub">${esc(NOMBRE_CAT[f.cat])} · ${esc(equipoTxt())} <span class="gama ${sel.gama}">${sel.gama}</span></div>
      <h1>${esc(f.sintoma)}</h1>
      <div class="price">${fmt(mo + venta)}${r.tieneRepuesto ? `<small>Mano de obra ${fmt(mo)} + ${etiquetaRep} ${fmt(venta)}${cfg.recargo ? ` (costo ${fmt(costo)} + ${cfg.recargo}%)` : ""}</small>` : `<small>Mano de obra · sin repuesto</small>`}</div>
      <div class="ok">${ico("shield", 16)} Garantía ${cfg.gar} días sobre el trabajo</div>
      ${sel.modelo ? "" : `<small class="muted">Elegí la gama del equipo:</small><div class="gama-row">${gamaBtns}</div>`}
      <button class="btn primary full" onclick="aPresupuesto(${i})">${ico("plus", 18)} Agregar al presupuesto</button>
      <button class="btn full" onclick="compartirDiag(${i})">${ico("whatsapp", 18)} Enviar por WhatsApp</button>
      <div class="feat">
        <div><small>Tipo de trabajo</small><b>${esc(TRABAJOS[f.parte].nombre)}</b></div>
        <div><small>Tiempo estimado</small><b>${esc(f.tiempo)}</b></div>
        <div><small>Dificultad</small><b class="stars">${"★".repeat(f.dif)}${"☆".repeat(4 - f.dif)}</b></div>
        <div><small>Mano de obra base</small><b>${fmt(moBase(f.parte))}</b></div>
      </div>
      <h4>Diagnóstico probable</h4><p>${esc(f.diag)}</p>
      ${f.tips ? `<h4>Tip de taller</h4><div class="tip">${ico("bulb", 18)}<span>${esc(f.tips)}</span></div>` : ""}
    </div>
  </div>
  ${r.tieneRepuesto ? `<div class="rep">
    <div class="rh"><div class="ic">${ico("box", 20)}</div><div><b>${esc(r.nombre)}</b><small>${esc(f.repuesto)} · ${esc(equipoTxt())}</small></div>${r.ml ? `<span class="live">${ico("zap", 12)} Mercado Libre</span>` : ""}</div>
    ${r.unico ? `<div class="range"><b>${fmt(r.niveles.original.p)}</b><span>insumos por reparación</span></div>` : `
    <div class="niveles">${["economico", "original", "premium"].map(k => tarjetaNivel(k, r)).join("")}</div>
    <div class="nivel-desc">${ico("bulb", 14)}<span><b>${esc(nivelInfo.nombre)}:</b> ${esc(nivelInfo.desc)}</span></div>`}
    ${r.ml ? `<div class="note">${mlData.demo ? "Datos de ejemplo para la demo web. En la app real los publica el robot desde la API de Mercado Libre." : `Precios reales de Mercado Libre para este modelo, actualizados ${hace(r.ml.f || mlData.actualizado)}${r.ml.n ? ` sobre ${r.ml.n} publicaciones` : ""}${r.ml.viejo ? " · hoy no hubo resultados, se muestra el último dato" : ""}${r.ocultas ? ` · ${r.ocultas} publicaci${r.ocultas === 1 ? "ón oculta" : "ones ocultas"} por vos` : ""}.`}</div>`
      : `<div class="note">Precios de referencia (oct 2026) para gama ${marca === "iPhone" ? "iPhone" : sel.gama}. ${sel.modelo ? "Tocá el botón para ver el precio del día y cargá abajo lo que pagás: queda guardado para este modelo." : "Elegí el modelo exacto para guardar el precio que pagás."}</div>`}
    ${ml ? `<a class="ml" href="${ml}" target="_blank" rel="noopener">${ico("external", 18)} Ver publicaciones en Mercado Libre</a>` : ""}
    <div class="custom"><input type="number" inputmode="numeric" placeholder="Lo que pagás por el repuesto $" value="${r.custom ?? ""}" onchange="setRep('${esc(r.key)}',this.value)"><button class="btn sm" onclick="renderDetalle()">OK</button></div>
    ${r.custom ? `<div class="note">${ico("check", 12)} Usando tu precio: ${fmt(r.custom)} → cobrás ${fmt(venta)} con ${cfg.recargo}% de recargo. Borralo para volver a los niveles.</div>` : ""}
  </div>` : ""}
  <div class="sec-h"><h3>Otras fallas de ${esc(NOMBRE_CAT[f.cat])}</h3></div>
  <div class="rail">${FALLAS.map((x, j) => j).filter(j => j !== i && FALLAS[j].cat === f.cat).slice(0, 6).map(prodCard).join("")}</div>
  </div>`;
  renderCrumbs("detalle");
}
function textoDiag(i) {
  const f = FALLAS[i]; const marca = sel.marca || "Samsung"; const mo = calcMO(i, marca, sel.gama); const r = repInfo(i, marca, sel.gama);
  let rep = "";
  if (r.tieneRepuesto) {
    const n = r.niveles[r.nivel];
    rep = `\n🧩 Repuesto${r.unico || r.custom ? "" : " " + NIVELES[r.nivel].nombre.toLowerCase()}: ${fmt(precioVenta(r.costo))}${!r.custom && n.env === true ? " (envío gratis)" : ""}`;
    if (!r.custom && !r.unico) {
      const otras = ["economico", "original", "premium"].filter(k => k !== r.nivel).map(k => `${NIVELES[k].nombre.toLowerCase()} ${fmt(precioVenta(r.niveles[k].p))}`);
      rep += `\n   Otras opciones: ${otras.join(" · ")}`;
    }
  }
  return `*${cfg.nombre || "Celu Fácil"}*\n📱 ${equipoTxt()}\n🔎 Falla: ${f.sintoma}\n🧰 Trabajo: ${TRABAJOS[f.parte].nombre}${rep}\n⏱ Tiempo estimado: ${f.tiempo}\n💵 Mano de obra: ${fmt(mo)}\n*Total estimado: ${fmt(mo + (r.tieneRepuesto ? precioVenta(r.costo) : 0))}*\n✅ Garantía ${cfg.gar} días sobre el trabajo${pieContacto()}`;
}
function compartirDiag(i) { compartir(textoDiag(i)); }
async function aPresupuesto(i) {
  const f = FALLAS[i]; const marca = sel.marca || "Samsung"; const r = repInfo(i, marca, sel.gama); const eq = equipoTxt();
  if (pres.equipo && pres.equipo !== eq && (pres.items.length || pres.mo)) {
    const ok = await dialogo({ titulo: "Reemplazar presupuesto", mensaje: `El presupuesto actual es de ${pres.equipo}. ¿Lo reemplazás por uno para ${eq}?`, ok: "Reemplazar" });
    if (!ok) return;
  }
  if (pres.equipo !== eq) pres = { equipo: eq, marca: sel.marca, modelo: sel.modelo, falla: "", mo: 0, items: [] };
  pres.falla = pres.falla ? pres.falla + " + " + f.sintoma : f.sintoma;
  pres.mo += calcMO(i, marca, sel.gama);
  if (r.tieneRepuesto) {
    const n = r.niveles[r.nivel]; const nombreNivel = r.unico ? "" : ` (${NIVELES[r.nivel].nombre.toLowerCase()})`;
    const ref = r.custom ? "tu precio" : `${n.ref ? "referencia" : "Mercado Libre"}${n.env === true ? " · envío gratis" : ""}`;
    pres.items.push({ d: r.nombre + nombreNivel, costo: r.costo, p: precioVenta(r.costo), ref, ml: (!r.custom && n.u) || mlUrl(i) });
  }
  store.set("pres", pres); updCart(); toast("Agregado al presupuesto"); go("carrito");
}
function updCart() { const n = pres.items.length + (pres.mo ? 1 : 0); $("#cart-n").textContent = n; $("#cart-n").classList.toggle("hidden", !n); }

// ---------- Presupuesto ----------
function totalesPres() {
  const rep = pres.items.reduce((a, b) => a + (Number(b.p) || 0), 0), costo = pres.items.reduce((a, b) => a + (Number(b.costo) || 0), 0);
  const mo = Number(pres.mo) || 0, total = rep + mo, sena = Number($("#pres-sena").value) || 0;
  return { rep, costo, mo, total, sena, ganancia: total - costo };
}
function toggleAdd() { const r = $("#add-row"); r.classList.toggle("hidden"); if (!r.classList.contains("hidden")) $("#item-desc").focus(); }
function renderPres() {
  const num = ordenes.reduce((m, o) => Math.max(m, o.id), 0) + 1;
  $("#doc-num").textContent = "N° " + String(num).padStart(4, "0");
  $("#doc-taller").textContent = cfg.nombre || "Celu Fácil";
  $("#doc-fecha").textContent = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
  $("#doc-gar").textContent = `Garantía ${cfg.gar} días sobre el trabajo`;
  $("#doc-tel").textContent = [cfg.direccion, cfg.tel ? "Tel. " + cfg.tel : ""].filter(Boolean).join(" · ");
  $("#pres-equipo").innerHTML = pres.equipo
    ? `<div class="ic">${ico("cat-pantalla", 22)}</div><div><b>${esc(pres.equipo)}</b><small>${esc(pres.falla || "")}</small></div>`
    : `<div class="ic">${ico("cat-pantalla", 22)}</div><div><b>Presupuesto libre</b><small>Agregá ítems o elegí una falla desde Inicio</small></div>`;
  const rows = [];
  if (pres.mo || pres.equipo || pres.items.length) rows.push(`<div class="drow"><div class="n">${ico("tool", 12)}</div><div class="d">Mano de obra<small>${esc(pres.falla || "Servicio técnico")}</small></div><div class="amt">$<input type="number" inputmode="numeric" value="${pres.mo || 0}" oninput="pres.mo=Number(this.value);calcTotales()"></div></div>`);
  pres.items.forEach((it, i) => {
    const gan = (Number(it.p) || 0) - (Number(it.costo) || 0);
    rows.push(`<div class="drow"><div class="n">${i + 1}</div><div class="d">${esc(it.d)}<small>costo ${fmt(it.costo)} · ganás ${fmt(gan)} · <a href="#" onclick="cambiarCosto(${i});return false">cambiar costo</a>${it.ml ? ` · <a href="${esc(it.ml)}" target="_blank" rel="noopener">ver en ML</a>` : ""}</small></div><div class="amt">$<input type="number" inputmode="numeric" value="${it.p || ""}" placeholder="0" oninput="pres.items[${i}].p=Number(this.value);calcTotales()"></div><button class="x" onclick="quitarItem(${i})" aria-label="Quitar">${ico("x", 16)}</button></div>`);
  });
  $("#pres-items").innerHTML = rows.length ? rows.join("") : `<div class="doc-empty">${ico("receipt", 36)}Sin ítems todavía</div>`;
  calcTotales();
}
function calcTotales() {
  const t = totalesPres();
  $("#t-rep").textContent = fmt(t.rep); $("#t-mo").textContent = fmt(t.mo); $("#t-total").textContent = fmt(t.total);
  $("#t-resta").textContent = fmt(t.total - t.sena); $("#t-resta-row").classList.toggle("hidden", !t.sena);
  $("#t-gan").textContent = fmt(t.ganancia); $("#t-gan-row").classList.toggle("hidden", !(t.total));
  store.set("pres", pres); updCart();
}
async function cambiarCosto(i) {
  const it = pres.items[i]; if (!it) return;
  const v = await dialogo({ titulo: "Costo del repuesto", mensaje: `¿Cuánto pagás por "${it.d}"?`, ok: "Guardar", input: { tipo: "number", valor: it.costo || "", placeholder: "$" } });
  if (v === null) return;
  it.costo = Number(v) || 0; if (!it.p || it.p < it.costo) it.p = precioVenta(it.costo);
  renderPres();
}
function quitarItem(i) { pres.items.splice(i, 1); renderPres(); }
function agregarItem() {
  const d = $("#item-desc").value.trim(), p = Number($("#item-precio").value) || 0;
  if (!d) { toast("Escribí una descripción"); return; }
  const costo = redondear(p / (1 + (Number(cfg.recargo) || 0) / 100), 100);
  pres.items.push({ d, costo, p }); $("#item-desc").value = ""; $("#item-precio").value = ""; $("#add-row").classList.add("hidden"); renderPres();
}
async function vaciarPresupuesto() {
  if (!pres.items.length && !pres.mo) return;
  const ok = await dialogo({ titulo: "Vaciar presupuesto", mensaje: "Se borran los ítems cargados. ¿Seguro?", ok: "Vaciar", peligro: true });
  if (!ok) return;
  pres = { equipo: "", marca: "", modelo: "", falla: "", mo: 0, items: [] }; $("#pres-sena").value = ""; store.set("pres", pres); renderPres();
}
function textoPres() {
  const t = totalesPres();
  let s = `*PRESUPUESTO — ${cfg.nombre || "Celu Fácil"}*\n📱 ${pres.equipo || "Equipo"}${pres.falla ? "\n🔎 " + pres.falla : ""}\n\n`;
  pres.items.forEach(it => s += `• ${it.d}: ${fmt(it.p)}\n`);
  s += `• Mano de obra: ${fmt(t.mo)}\n\n*TOTAL: ${fmt(t.total)}*`;
  if (t.sena) s += `\nSeña: ${fmt(t.sena)} · Resta: ${fmt(t.total - t.sena)}`;
  return s + `\n✅ Garantía ${cfg.gar} días${pieContacto()}`;
}
function compartirPresupuesto() { compartir(textoPres()); }
// Dibuja el presupuesto como una tarjeta (PNG) para mandarla por WhatsApp
function imagenPresupuesto() {
  const t = totalesPres(); const W = 1080, M = 64; const c = document.createElement("canvas"); const ctx = c.getContext("2d");
  if (!ctx) return "";
  const lineas = []; const push = (txt, estilo = {}) => lineas.push({ txt, ...estilo });
  const filas = [...pres.items.map(it => [it.d, fmt(it.p)]), ["Mano de obra" + (pres.falla ? " · " + pres.falla : ""), fmt(t.mo)]];
  const ajuste = (txt, max, font) => { ctx.font = font; if (ctx.measureText(txt).width <= max) return txt; let s = txt; while (s.length > 3 && ctx.measureText(s + "…").width > max) s = s.slice(0, -1); return s + "…"; };
  // alto exacto: cabecera 240 + título 180 + filas + total 30 + seña 70 + garantía 80 + borde de tarjeta 40 + pie 110
  const altoFilas = filas.length * 64; const H = 240 + 180 + altoFilas + 30 + (t.sena ? 70 : 0) + 80 + 40 + 110;
  c.width = W; c.height = H;
  ctx.fillStyle = "#eef3f3"; ctx.fillRect(0, 0, W, H);
  // cabecera petróleo
  ctx.fillStyle = "#0f7d86"; ctx.fillRect(0, 0, W, 200);
  ctx.fillStyle = "#fff"; ctx.font = "600 30px Nunito, sans-serif"; ctx.fillText("PRESUPUESTO", M, 80);
  ctx.font = "700 52px Nunito, sans-serif"; ctx.fillText(ajuste(cfg.nombre || "Celu Fácil", W - 2 * M, "700 52px Nunito, sans-serif"), M, 142);
  ctx.font = "400 28px Nunito, sans-serif"; ctx.textAlign = "right"; ctx.fillText(new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " · " + $("#doc-num").textContent, W - M, 80); ctx.textAlign = "left";
  // tarjeta blanca
  const y0 = 240; ctx.fillStyle = "#fff"; ctx.fillRect(M, y0, W - 2 * M, H - y0 - 110);
  ctx.fillStyle = "#14262a"; ctx.font = "700 38px Nunito, sans-serif"; ctx.fillText(ajuste(pres.equipo || "Presupuesto", W - 2 * M - 80, "700 38px Nunito, sans-serif"), M + 40, y0 + 70);
  ctx.fillStyle = "rgba(20,38,42,.6)"; ctx.font = "400 28px Nunito, sans-serif"; ctx.fillText(ajuste(pres.falla || "", W - 2 * M - 80, "400 28px Nunito, sans-serif"), M + 40, y0 + 115);
  let y = y0 + 180; ctx.strokeStyle = "rgba(20,38,42,.12)"; ctx.lineWidth = 2;
  for (const [d, v] of filas) {
    ctx.fillStyle = "#14262a"; ctx.font = "400 30px Nunito, sans-serif"; ctx.fillText(ajuste(d, W - 2 * M - 320, "400 30px Nunito, sans-serif"), M + 40, y);
    ctx.textAlign = "right"; ctx.font = "600 30px Nunito, sans-serif"; ctx.fillText(v, W - M - 40, y); ctx.textAlign = "left";
    ctx.beginPath(); ctx.moveTo(M + 40, y + 22); ctx.lineTo(W - M - 40, y + 22); ctx.stroke(); y += 64;
  }
  y += 30; ctx.fillStyle = "#14262a"; ctx.font = "600 34px Nunito, sans-serif"; ctx.fillText("TOTAL", M + 40, y);
  ctx.textAlign = "right"; ctx.font = "700 56px Nunito, sans-serif"; ctx.fillStyle = "#0a5f66"; ctx.fillText(fmt(t.total), W - M - 40, y + 8); ctx.textAlign = "left";
  if (t.sena) { y += 70; ctx.fillStyle = "#159a5c"; ctx.font = "600 30px Nunito, sans-serif"; ctx.fillText(`Seña ${fmt(t.sena)} · Resta al retirar ${fmt(t.total - t.sena)}`, M + 40, y); }
  y += 80; ctx.fillStyle = "rgba(20,38,42,.6)"; ctx.font = "400 26px Nunito, sans-serif";
  ctx.fillText(`Garantía ${cfg.gar} días sobre el trabajo. Válido por 7 días.`, M + 40, y);
  ctx.fillStyle = "rgba(20,38,42,.7)"; ctx.font = "600 26px Nunito, sans-serif";
  ctx.fillText(ajuste([cfg.direccion, cfg.tel ? "WhatsApp " + cfg.tel : ""].filter(Boolean).join(" · "), W - 2 * M, "600 26px Nunito, sans-serif"), M, H - 45);
  return c.toDataURL("image/png");
}
async function compartirPresupuestoImagen() {
  if (!pres.items.length && !pres.mo) { toast("El presupuesto está vacío"); return; }
  const dataUrl = imagenPresupuesto(); if (!dataUrl) { toast("No se pudo generar la imagen"); return; }
  const nombre = `presupuesto-${$("#doc-num").textContent.replace(/\D/g, "") || "0001"}.png`;
  const fs = Fs(), Share = Plugin("Share");
  if (fs) {
    try {
      let r; try { r = await fs.writeFile({ path: "CeluFacil/presupuestos/" + nombre, data: dataUrl.split(",")[1] || "", directory: "EXTERNAL", recursive: true }); } catch { r = await fs.writeFile({ path: nombre, data: dataUrl.split(",")[1] || "", directory: "CACHE", recursive: true }); }
      if (Share && r && r.uri) { try { await Share.share({ title: "Presupuesto", text: textoPres(), url: r.uri, mime: "image/png", dialogTitle: "Enviar presupuesto" }); } catch { } return; }
    } catch { }
  }
  const a = document.createElement("a"); a.href = dataUrl; a.download = nombre; a.click(); toast("Imagen del presupuesto descargada");
}
function crearOrdenDesdePresupuesto() {
  const t = totalesPres();
  // Los repuestos del presupuesto viajan a la orden: así la pantalla Compras sabe qué comprar y dónde
  const items = pres.items.map(it => ({ d: it.d, costo: Number(it.costo) || 0, p: Number(it.p) || 0, ml: it.ml || "", comprado: false }));
  nuevaOrden({ marca: pres.marca || (pres.equipo || "").split(" ")[0] || "", modelo: pres.modelo || (pres.equipo || "").split(" ").slice(1).join(" "), falla: pres.falla || pres.items.map(i => i.d).join(", "), total: t.total, costo: t.costo, mo: t.mo, sena: t.sena, items });
}

// ---------- Órdenes ----------
function renderOrdenes() {
  const fil = ["", "Activas", ...ESTADOS_ORDEN];
  $("#estado-filter").innerHTML = fil.map(e => `<button class="chip ${sel.est === e ? "on" : ""}" onclick="sel.est=this.dataset.e;renderOrdenes()" data-e="${esc(e)}">${e || "Todas"}</button>`).join("");
  let l = ordenes.slice().sort((a, b) => b.id - a.id);
  if (sel.est === "Activas") l = l.filter(o => ESTADOS_ACTIVOS(o.estado)); else if (sel.est) l = l.filter(o => o.estado === sel.est);
  $("#ordenes").innerHTML = l.length ? l.map(ordenCard).join("") : `<div class="empty">${ico("orders", 40)}Todavía no hay órdenes acá.<br>Creá la primera con “+ Nueva”.</div>`;
}
function lineaGarantia(o) {
  if (o.estado !== "Entregado" || !o.fechaEntrega) return "";
  const h = garHasta(o); const vig = garVigente(o);
  return `<div class="gar ${vig ? "si" : "no"}">${ico("shield", 13)} Garantía ${vig ? "vigente hasta" : "vencida el"} ${fechaCorta(h.toISOString())}</div>`;
}
function ordenCard(o, opts = {}) {
  const ei = ESTADOS_ORDEN.indexOf(o.estado); const gan = (Number(o.total) || 0) - (Number(o.costo) || 0);
  return `<div class="ord">
    <div class="top"><span class="estado e${ei}">${esc(o.estado)}</span><small>${fechaCorta(o.fecha)} · #${String(o.id).padStart(4, "0")}</small></div>
    <div onclick="abrirOrden(${o.id})"><div class="t">${esc(equipoDe(o))}</div><div class="s">${esc(o.falla)}</div>
    ${opts.sinCliente ? "" : `<div class="s">${ico("user", 13)} ${esc(o.cliente || "Sin nombre")}${o.fotos && o.fotos.length ? ` · ${ico("camera", 13)} ${o.fotos.length}` : ""}</div>`}${lineaGarantia(o)}</div>
    <div class="foot"><div class="s">${o.sena ? `Seña ${fmt(o.sena)} · resta ${fmt((o.total || 0) - o.sena)}` : "Sin seña"}${o.costo ? ` · ganás ${fmt(gan)}` : ""}</div><b>${fmt(o.total)}</b></div>
    <div class="acts"><button class="btn sm" onclick="avisarEstado(${o.id})">${ico("whatsapp", 16)} Avisar</button>${ESTADOS_ACTIVOS(o.estado) ? `<button class="btn sm" onclick="avanzarEstado(${o.id})">${ico("chev", 16)} ${esc(siguienteEstado(o.estado))}</button>` : ""}<button class="btn sm link" onclick="abrirOrden(${o.id})">Abrir</button></div></div>`;
}

// ---------- Compras: repuestos pendientes de las órdenes que esperan repuesto ----------
function mlBusqueda(texto) { return "https://listado.mercadolibre.com.ar/" + encodeURIComponent(String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9 ]+/g, " ").trim().replace(/\s+/g, "-")); }
function listaCompras() {
  const lista = ordenes.filter(o => o.estado === "Esperando repuesto").sort((a, b) => a.id - b.id);
  let pendientes = 0, costo = 0;
  for (const o of lista) { const its = (o.items || []).filter(it => !it.comprado); if (o.items && o.items.length) { pendientes += its.length; costo += its.reduce((a, b) => a + (Number(b.costo) || 0), 0); } else { pendientes++; costo += Number(o.costo) || 0; } }
  return { ordenes: lista, pendientes, costo };
}
function renderCompras() {
  const c = listaCompras();
  $("#compras-sub").textContent = c.pendientes ? `${c.pendientes} repuesto${c.pendientes === 1 ? "" : "s"} por comprar · ${fmt(c.costo)} estimados` : "Nada pendiente: cuando una orden pasa a “Esperando repuesto”, aparece acá.";
  $("#compras").innerHTML = c.ordenes.length ? c.ordenes.map(o => {
    const eq = equipoDe(o);
    const filas = (o.items && o.items.length ? o.items : [{ d: o.falla || "Repuesto", costo: o.costo || 0, ml: "", generico: true }]).map((it, i) => `<label class="compra-item ${it.comprado ? "ok" : ""}"><input type="checkbox" ${it.comprado ? "checked" : ""} onchange="marcarComprado(${o.id},${i},this.checked)"><span class="d">${esc(it.d)}<small>${it.costo ? "costo " + fmt(it.costo) : "sin costo cargado"}</small></span><a class="btn sm" href="${esc(it.ml || mlBusqueda(`${it.generico ? "repuesto" : it.d} ${eq}`))}" target="_blank" rel="noopener">${ico("external", 14)} ML</a></label>`).join("");
    const todos = o.items && o.items.length && o.items.every(it => it.comprado);
    return `<div class="ord"><div class="top"><span class="estado e2">Esperando repuesto</span><small>${fechaCorta(o.fecha)} · #${String(o.id).padStart(4, "0")}</small></div>
      <div class="t">${esc(eq)}</div><div class="s">${ico("user", 13)} ${esc(o.cliente || "Sin nombre")}${o.tel ? " · " + esc(o.tel) : ""}</div>
      <div class="compra-lista">${filas}</div>
      <div class="acts">${todos ? `<button class="btn sm primary" onclick="avanzarEstado(${o.id})">${ico("check", 16)} Llegó todo → En reparación</button>` : `<button class="btn sm" onclick="avanzarEstado(${o.id})">${ico("chev", 16)} En reparación</button>`}<button class="btn sm link" onclick="abrirOrden(${o.id})">Abrir</button></div></div>`;
  }).join("") : `<div class="empty">${ico("box", 40)}No hay repuestos para comprar.</div>`;
}
function marcarComprado(id, i, v) {
  const o = ordenes.find(x => x.id === id); if (!o) return;
  if (!o.items || !o.items.length) o.items = [{ d: o.falla || "Repuesto", costo: o.costo || 0, p: 0, ml: "", comprado: false }];
  if (o.items[i]) o.items[i].comprado = !!v; store.set("ordenes", ordenes); renderCompras();
}

// ---------- Clientes: las órdenes agrupadas por teléfono ----------
function telNorm(t) { return String(t || "").replace(/\D/g, "").replace(/^0/, "").replace(/^54/, "").replace(/^9/, "").replace(/^15/, ""); }
function claveCliente(o) { const t = telNorm(o.tel); return t.length >= 6 ? "t:" + t : o.cliente ? "n:" + String(o.cliente).trim().toLowerCase() : ""; }
function clientes() {
  const map = new Map();
  for (const o of ordenes.slice().sort((a, b) => b.id - a.id)) {
    const k = claveCliente(o); if (!k) continue;
    if (!map.has(k)) map.set(k, { clave: k, nombre: o.cliente || "Sin nombre", tel: o.tel || "", ordenes: [], ultima: o.fecha, total: 0, abiertas: 0, garantias: [] });
    const c = map.get(k); c.ordenes.push(o); if (!c.nombre || c.nombre === "Sin nombre") c.nombre = o.cliente || c.nombre; if (!c.tel && o.tel) c.tel = o.tel;
    if (o.estado === "Entregado") c.total += Number(o.total) || 0; if (ESTADOS_ACTIVOS(o.estado)) c.abiertas++; if (garVigente(o)) c.garantias.push(o);
    if (new Date(o.fecha) > new Date(c.ultima)) c.ultima = o.fecha;
  }
  return [...map.values()].sort((a, b) => new Date(b.ultima) - new Date(a.ultima));
}
function buscarCliente(tel, nombre) { const k = telNorm(tel).length >= 6 ? "t:" + telNorm(tel) : nombre ? "n:" + String(nombre).trim().toLowerCase() : ""; return k ? clientes().find(c => c.clave === k) || null : null; }
function renderClientes() {
  const q = String(sel.cliQ || "").trim().toLowerCase();
  const lista = clientes().filter(c => !q || c.nombre.toLowerCase().includes(q) || telNorm(c.tel).includes(q.replace(/\D/g, "")) && q.replace(/\D/g, "").length >= 3);
  $("#cli-q").value = sel.cliQ || "";
  $("#clientes-sub").textContent = `${lista.length} cliente${lista.length === 1 ? "" : "s"}${q ? " encontrados" : ""} · ${ordenes.length} órdenes`;
  $("#clientes").innerHTML = lista.length ? lista.map(c => `<button class="ri cli" onclick="abrirCliente(this.dataset.k)" data-k="${esc(c.clave)}"><div class="ic">${ico("user", 20)}</div><div class="txt"><div class="t">${esc(c.nombre)}${c.garantias.length ? `<span class="opc gar-on">garantía</span>` : ""}${c.abiertas ? `<span class="opc">${c.abiertas} en curso</span>` : ""}</div>${c.tel ? `<div class="s">${esc(c.tel)}</div>` : ""}<div class="s">${c.ordenes.length} reparaci${c.ordenes.length === 1 ? "ón" : "ones"} · ${fmt(c.total)} · última ${hace(c.ultima)}</div></div>${ico("chev", 18, "chev")}</button>`).join("")
    : `<div class="empty">${ico("user", 40)}${q ? "Ningún cliente coincide." : "Los clientes aparecen solos a partir de las órdenes (se agrupan por WhatsApp)."}</div>`;
}
function abrirCliente(k) { sel.cliente = k; go("cliente"); }
function renderCliente() {
  const c = clientes().find(x => x.clave === sel.cliente); if (!c) { go("clientes", false); return; }
  const gar = c.garantias.map(o => `<div class="gar si">${ico("shield", 13)} ${esc(equipoDe(o))} · garantía hasta ${fechaCorta(garHasta(o).toISOString())}</div>`).join("");
  $("#cliente-head").innerHTML = `<div class="cli-head"><div class="ic">${ico("user", 26)}</div><div class="txt"><h2>${esc(c.nombre)}</h2><div class="s">${c.tel ? esc(c.tel) + " · " : ""}${c.ordenes.length} reparaci${c.ordenes.length === 1 ? "ón" : "ones"} · ${fmt(c.total)} en total</div>${gar}</div></div>
    <div class="two">${c.tel ? `<button class="btn" onclick="enviarWhatsApp(this.dataset.t, 'Hola ' + this.dataset.n + ', soy de *' + (cfg.nombre || 'Celu Fácil') + '*. ')" data-t="${esc(c.tel)}" data-n="${esc(c.nombre)}">${ico("whatsapp", 18)} WhatsApp</button>` : ""}<button class="btn primary" onclick="nuevaOrden({ cliente: this.dataset.n, tel: this.dataset.t })" data-n="${esc(c.nombre === "Sin nombre" ? "" : c.nombre)}" data-t="${esc(c.tel)}">${ico("plus", 18)} Nueva orden</button></div>`;
  $("#cliente-ordenes").innerHTML = c.ordenes.map(o => ordenCard(o, { sinCliente: true })).join("");
}
// En el modal de orden: si el teléfono ya es de un cliente, se completa el nombre y se avisa si tiene garantía vigente
function sugerirCliente() {
  const tel = $("#o-tel").value, nombre = $("#o-cliente").value.trim(); const info = $("#o-cliente-info"); if (!info) return;
  const c = buscarCliente(tel, ""); const idActual = Number($("#o-id").value) || 0;
  if (!c || (c.ordenes.length === 1 && c.ordenes[0].id === idActual)) { info.classList.add("hidden"); return; }
  if (!nombre && c.nombre !== "Sin nombre") $("#o-cliente").value = c.nombre;
  const otras = c.ordenes.filter(o => o.id !== idActual);
  const g = c.garantias.filter(o => o.id !== idActual).map(o => equipoDe(o) + " hasta " + fechaCorta(garHasta(o).toISOString()));
  info.innerHTML = `${ico("user", 14)} Cliente conocido: ${otras.length} reparaci${otras.length === 1 ? "ón" : "ones"} anterior${otras.length === 1 ? "" : "es"}, la última ${hace(c.ultima)}.${g.length ? ` <b>Garantía vigente:</b> ${esc(g.join(" · "))}.` : ""} <a href="#" onclick="cerrarModal();abrirCliente('${esc(c.clave)}');return false">Ver ficha</a>`;
  info.classList.remove("hidden");
}
function siguienteEstado(e) { const i = ESTADOS_ORDEN.indexOf(e); return i >= 0 && i < 5 ? ESTADOS_ORDEN[i + 1] : "Entregado"; }
function cambiarEstadoOrden(o, estado) {
  if (o.estado !== estado) o.fechaEstado = hoyISO(); // cuándo cambió por última vez (para los avisos de demora)
  o.estado = estado;
  if (estado === "Listo" && !o.fechaListo) o.fechaListo = hoyISO();
  if (estado !== "Listo" && estado !== "Entregado") delete o.fechaListo;
  if (estado === "Entregado" && !o.fechaEntrega) { o.fechaEntrega = hoyISO(); o.gar = Number(cfg.gar) || 30; } // la garantía queda fijada con los días vigentes ese día
  if (estado !== "Entregado") { delete o.fechaEntrega; delete o.gar; }
}
async function avanzarEstado(id) {
  const o = ordenes.find(x => x.id === id); if (!o) return;
  const nuevo = siguienteEstado(o.estado);
  cambiarEstadoOrden(o, nuevo); store.set("ordenes", ordenes); const act = pantallaActiva(); if (RENDER[act]) RENDER[act](); toast(`Orden #${String(id).padStart(4, "0")}: ${nuevo}`);
  if (["Listo", "Diagnóstico", "Entregado"].includes(nuevo) && o.tel) {
    const ok = await dialogo({ titulo: "Avisar al cliente", mensaje: `¿Le mandás el WhatsApp de "${nuevo}" a ${o.cliente || "el cliente"}?`, ok: "Enviar", cancelar: "Después" });
    if (ok) avisarEstado(id);
  }
}
function mensajeEstado(o) {
  const taller = cfg.nombre || "Celu Fácil", eq = equipoDe(o), resta = fmt((Number(o.total) || 0) - (Number(o.sena) || 0));
  const horario = cfg.horario ? ` ${cfg.horario}` : "", pie = pieContacto() + (mapsUrl() ? `\n🗺 Cómo llegar: ${mapsUrl()}` : "");
  const retiro = `Podés pasar a retirarlo${cfg.direccion ? " por " + cfg.direccion : ""}${horario}.`;
  switch (o.estado) {
    case "Diagnóstico": return `Hola ${o.cliente || ""}, soy de *${taller}*. Ya revisamos tu ${eq}: ${o.falla}. El presupuesto total es *${fmt(o.total)}*${o.sena ? ` (seña ${fmt(o.sena)}, resta ${resta})` : ""}. ¿Avanzamos con la reparación?${pie}`;
    case "Esperando repuesto": return `Hola ${o.cliente || ""}, te escribo de *${taller}*. Ya pedimos el repuesto para tu ${eq}. Apenas llega lo reparamos y te avisamos.${pie}`;
    case "En reparación": return `Hola ${o.cliente || ""}, tu ${eq} ya está en reparación en *${taller}*. Te avisamos en cuanto esté listo.${pie}`;
    case "Listo": return `¡Hola ${o.cliente || ""}! Tu ${eq} ya está listo en *${taller}* 🎉 ${retiro}${Number(o.total) - Number(o.sena || 0) > 0 ? ` Resta abonar *${resta}*.` : ""}${pie}`;
    case "Entregado": { const h = garHasta(o); return `Gracias por confiar en *${taller}*, ${o.cliente || ""}. Tu reparación tiene *${o.gar ?? cfg.gar} días de garantía* sobre el trabajo realizado${h ? ` (hasta el ${fechaCorta(h.toISOString())})` : ""}; no cubre golpes, humedad ni daños por terceros. Cualquier cosa escribinos.${pie}`; }
    case "Sin reparación": return `Hola ${o.cliente || ""}, revisamos tu ${eq} en *${taller}* y lamentablemente no tiene una reparación conveniente. ${retiro}${pie}`;
    default: return textoComprobante(o);
  }
}
function textoComprobante(o) {
  const taller = cfg.nombre || "Celu Fácil"; const resta = (Number(o.total) || 0) - (Number(o.sena) || 0);
  const rec = (o.recibido || []).length ? `\n📋 Estado al recibir: ${o.recibido.join(", ")}` : "";
  return `*${taller} — Comprobante de ingreso*\nOrden #${String(o.id || 0).padStart(4, "0")}\n👤 ${o.cliente}\n📱 ${o.marca} ${o.modelo}\n🔎 ${o.falla}${rec}\n💵 Total: ${fmt(o.total)}${o.sena ? ` · Seña: ${fmt(o.sena)} · Resta: ${fmt(resta)}` : ""}\n📌 Estado: ${o.estado}\n${o.notas ? "📝 " + o.notas + "\n" : ""}✅ Garantía ${cfg.gar} días sobre el trabajo realizado. No cubre golpes, humedad ni daños por terceros.${pieContacto()}`;
}
function avisarEstado(id) {
  const o = typeof id === "object" ? id : ordenes.find(x => x.id === id); if (!o) return;
  enviarWhatsApp(o.tel, mensajeEstado(o));
}
function enviarWhatsApp(tel, texto) {
  const t = String(tel || "").replace(/\D/g, "").replace(/^0/, "").replace(/^54/, "").replace(/^9/, "");
  if (t.length >= 10) abrirUrl(`https://wa.me/549${t}?text=${encodeURIComponent(texto)}`); else compartir(texto);
}

// Modal de orden
function nuevaOrden(pre = {}) {
  $("#modal-title").textContent = "Nueva orden"; $("#o-id").value = ""; $("#o-del").classList.add("hidden");
  $("#o-cliente").value = pre.cliente || ""; $("#o-tel").value = pre.tel || ""; $("#o-marca").value = pre.marca || sel.marca; $("#o-modelo").value = pre.modelo ?? sel.modelo;
  $("#o-falla").value = pre.falla || ""; $("#o-pin").value = pre.pin || ""; $("#o-total").value = pre.total || ""; $("#o-costo").value = pre.costo || ""; $("#o-sena").value = pre.sena || ""; $("#o-notas").value = pre.notas || "";
  $("#dl-marcas").innerHTML = listaMarcas().map(m => `<option value="${esc(m)}">`).join("");
  itemsTmp = (pre.items || []).map(it => ({ ...it }));
  renderEstadoChips(pre.estado || "Recibido"); renderChecklist(pre.recibido || []);
  const info = $("#o-cliente-info"); if (info) info.classList.add("hidden");
  setTimeout(sugerirCliente, 0);
  fotosTmp = (pre.fotos || []).map(f => ({ ...f })); fotosBorrar = []; renderFotos();
  $("#modal").classList.remove("hidden");
}
function abrirOrden(id) {
  const o = ordenes.find(x => x.id === id); if (!o) return;
  nuevaOrden(o); $("#modal-title").textContent = `Orden #${String(id).padStart(4, "0")}`; $("#o-id").value = id; $("#o-del").classList.remove("hidden");
}
function renderEstadoChips(actual) {
  $("#o-estado").innerHTML = ESTADOS_ORDEN.map((e, i) => `<button type="button" class="chip ${e === actual ? "on" : ""}" data-e="${esc(e)}" onclick="renderEstadoChips(this.dataset.e)"><span class="dot e${i}"></span>${esc(e)}</button>`).join("");
  $("#o-estado").dataset.valor = actual;
}
function renderChecklist(marcados) {
  $("#o-recibido").innerHTML = CHECKLIST.map(c => `<button type="button" class="chip ${marcados.includes(c) ? "on" : ""}" onclick="this.classList.toggle('on')" data-c="${esc(c)}">${esc(c)}</button>`).join("");
}
function leerOrden() {
  return { cliente: $("#o-cliente").value.trim(), tel: $("#o-tel").value.trim(), marca: $("#o-marca").value.trim(), modelo: $("#o-modelo").value.trim(),
    falla: $("#o-falla").value.trim(), pin: $("#o-pin").value.trim(), total: Number($("#o-total").value) || 0, costo: Number($("#o-costo").value) || 0, sena: Number($("#o-sena").value) || 0,
    estado: $("#o-estado").dataset.valor || "Recibido", recibido: $$("#o-recibido .chip.on").map(b => b.dataset.c), notas: $("#o-notas").value.trim(), fotos: fotosTmp.map(f => f.f ? { f: f.f } : { d: f.d }), items: itemsTmp };
}
async function guardarOrden() {
  const d = leerOrden(); if (!d.cliente && !d.modelo) { toast("Cargá al menos cliente o modelo"); return; }
  const id = Number($("#o-id").value);
  if (id) {
    const i = ordenes.findIndex(o => o.id === id); if (i < 0) return;
    const prev = ordenes[i]; ordenes[i] = { ...prev, ...d }; cambiarEstadoOrden(ordenes[i], d.estado);
  } else {
    const o = { id: ordenes.reduce((m, x) => Math.max(m, x.id), 0) + 1, fecha: hoyISO(), ...d }; cambiarEstadoOrden(o, d.estado); ordenes.push(o);
    pres = { equipo: "", marca: "", modelo: "", falla: "", mo: 0, items: [] }; $("#pres-sena").value = ""; store.set("pres", pres); updCart();
  }
  store.set("ordenes", ordenes);
  for (const f of fotosBorrar) borrarArchivoFoto(f).catch(() => { });
  fotosBorrar = [];
  cerrarModal(); const act = pantallaActiva(); if (["cliente", "compras"].includes(act)) RENDER[act](); else { hist = []; sel.est = ""; go("ordenes"); } toast("Orden guardada");
}
async function eliminarOrden() {
  const id = Number($("#o-id").value); const o = ordenes.find(x => x.id === id); if (!o) return;
  const ok = await dialogo({ titulo: "Eliminar orden", mensaje: `Se borra la orden #${String(id).padStart(4, "0")} y sus fotos. No se puede deshacer.`, ok: "Eliminar", peligro: true });
  if (!ok) return;
  for (const f of (o.fotos || [])) if (f.f) borrarArchivoFoto(f).catch(() => { });
  ordenes = ordenes.filter(x => x.id !== id); store.set("ordenes", ordenes); cerrarModal(); const act = pantallaActiva(); if (RENDER[act]) RENDER[act](); toast("Orden eliminada");
}
function compartirOrden() { const d = leerOrden(); d.id = Number($("#o-id").value) || (ordenes.reduce((m, x) => Math.max(m, x.id), 0) + 1); enviarWhatsApp(d.tel, textoComprobante(d)); }
function avisarDesdeModal() { const d = leerOrden(); d.id = Number($("#o-id").value) || (ordenes.reduce((m, x) => Math.max(m, x.id), 0) + 1); enviarWhatsApp(d.tel, mensajeEstado(d)); }
function cerrarModal() { $("#modal").classList.add("hidden"); }

// ---------- Fotos del equipo ----------
async function agregarFoto() {
  if (fotosTmp.length >= 4) { toast("Máximo 4 fotos por orden"); return; }
  const Camera = Plugin("Camera");
  if (Camera) {
    try {
      const r = await Camera.getPhoto({ quality: 55, width: 1000, resultType: "dataUrl", source: "PROMPT", promptLabelHeader: "Foto del equipo", promptLabelPhoto: "Elegir de la galería", promptLabelPicture: "Tomar foto", promptLabelCancel: "Cancelar" });
      if (r && r.dataUrl) await guardarFoto(r.dataUrl);
    } catch (e) { if (!/cancel/i.test(String(e && e.message))) toast("No se pudo tomar la foto"); }
    return;
  }
  $("#foto-input").click();
}
function fotoDesdeInput(ev) {
  const f = ev.target.files && ev.target.files[0]; ev.target.value = ""; if (!f) return;
  const r = new FileReader();
  r.onload = async () => { try { await guardarFoto(await reducirImagen(String(r.result))); } catch { toast("No se pudo procesar la imagen"); } };
  r.readAsDataURL(f);
}
function reducirImagen(dataUrl, max = 1000, calidad = 0.6, png = false) {
  return new Promise(resolve => {
    if (typeof Image === "undefined" || typeof document.createElement("canvas").getContext !== "function") { resolve(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      try {
        const esc_ = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas");
        c.width = Math.round(img.width * esc_); c.height = Math.round(img.height * esc_);
        const ctx = c.getContext("2d"); if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0, c.width, c.height); resolve(png ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", calidad));
      } catch { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl); img.src = dataUrl;
  });
}
async function guardarFoto(dataUrl) {
  const nombre = `foto-${Date.now()}-${Math.floor(Math.random() * 1e4)}.jpg`;
  const fs = Fs();
  if (fs) {
    try {
      await fs.writeFile({ path: "CeluFacil/fotos/" + nombre, data: dataUrl.split(",")[1] || "", directory: "DATA", recursive: true });
      fotosTmp.push({ f: nombre, src: dataUrl }); renderFotos(); return;
    } catch { }
  }
  if (fotosTmp.length >= 2) { toast("En la versión web se guardan hasta 2 fotos por orden"); return; }
  fotosTmp.push({ d: dataUrl, src: dataUrl }); renderFotos();
}
async function srcFoto(f) {
  if (f.src) return f.src; if (f.d) return f.d;
  const fs = Fs(); if (!fs || !f.f) return "";
  try { const r = await fs.readFile({ path: "CeluFacil/fotos/" + f.f, directory: "DATA" }); return "data:image/jpeg;base64," + r.data; } catch { return ""; }
}
async function borrarArchivoFoto(f) { const fs = Fs(); if (fs && f.f) await fs.deleteFile({ path: "CeluFacil/fotos/" + f.f, directory: "DATA" }); }
function quitarFoto(i) { const f = fotosTmp.splice(i, 1)[0]; if (f && f.f) fotosBorrar.push(f); renderFotos(); }
async function renderFotos() {
  const cont = $("#o-fotos");
  cont.innerHTML = fotosTmp.map((f, i) => `<div class="foto" data-i="${i}"><img alt="Foto ${i + 1}"><button type="button" class="x" onclick="quitarFoto(${i})" aria-label="Quitar foto">${ico("x", 14)}</button></div>`).join("")
    + `<button type="button" class="foto add" onclick="agregarFoto()">${ico("camera", 22)}<small>Agregar</small></button>`;
  for (let i = 0; i < fotosTmp.length; i++) { const src = await srcFoto(fotosTmp[i]); const img = cont.querySelector(`.foto[data-i="${i}"] img`); if (img && src) { img.src = src; fotosTmp[i].src = src; } }
}
function verFoto(src) { if (src) abrirUrl(src); }

// ---------- Ajustes ----------
function renderConfig() {
  $("#cfg-nombre").value = cfg.nombre; $("#cfg-tel").value = cfg.tel; $("#cfg-direccion").value = cfg.direccion; $("#cfg-localidad").value = cfg.localidad || ""; $("#cfg-gar").value = cfg.gar;
  $("#cfg-recargo").value = cfg.recargo; $("#cfg-horario").value = cfg.horario; $("#cfg-url").value = cfg.preciosUrl || PRECIOS_URL;
  renderMarcasPropias(); renderExclusiones();
  $("#precios").innerHTML = Object.entries(TRABAJOS).map(([k, t]) => `<div class="pitem"><span class="d"><span>${esc(t.nombre)}${precios[k] !== undefined && precios[k] !== t.mo ? `<small class="muted"> · base ${fmt(t.mo)}</small>` : ""}</span></span>$<input type="number" inputmode="numeric" value="${moBase(k)}" onchange="setPrecio('${k}',this.value)"></div>`).join("");
  renderLogos(); cargarCreditos();
  $("#app-version").textContent = `Celu Fácil ${APP_VERSION} · ${plataforma === "android" ? "Android" : plataforma === "windows" ? "Windows" : "web"}`;
  $("#respaldo-estado").textContent = Fs() ? (respaldoEstado || "El respaldo automático se guarda en el teléfono al cambiar cualquier dato. Compartilo a Drive o WhatsApp cada tanto.") : "En la versión web el respaldo es manual: exportá el archivo cada tanto.";
  renderMlEstado();
}
function renderMarcasPropias() {
  const c = $("#marcas-propias"); if (!c) return;
  const filas = [];
  for (const [m, g] of Object.entries(marcasExtra)) for (const gama of ["alta", "media", "baja"]) for (const x of (g[gama] || [])) filas.push({ m, x, gama });
  c.innerHTML = filas.length ? filas.map(f => `<div class="pitem"><span class="d"><span>${esc(f.m)} ${esc(f.x)} <span class="gama ${f.gama}">${f.gama}</span></span></span><button class="btn sm link danger" onclick="quitarModelo(this.dataset.m,this.dataset.x)" data-m="${esc(f.m)}" data-x="${esc(f.x)}">Quitar</button></div>`).join("")
    : `<p class="muted">Todavía no agregaste modelos. Desde la lista de modelos de cada marca podés sumar los que faltan; las marcas nuevas se crean acá.</p>`;
}
function renderExclusiones() {
  const c = $("#excl-estado"); if (!c) return;
  const n = exclusiones.ids.length;
  c.innerHTML = n ? `${n} publicaci${n === 1 ? "ón oculta" : "ones ocultas"} ("este precio no sirve"). <a href="#" onclick="copiarExclusiones();return false">Copiar lista para el robot</a> · <a href="#" onclick="restaurarPublicaciones();return false">Restaurar</a>` : "No ocultaste ninguna publicación. En cada nivel de precio tenés el botón “no sirve” para descartar una publicación que no corresponde.";
}
let creditosImg = null;
async function cargarCreditos() {
  if (creditosImg !== null) return creditosImg;
  if (typeof __CREDITOS !== "undefined") creditosImg = __CREDITOS;
  else try { const r = await fetch("marcas/creditos.json", { cache: "no-store" }); creditosImg = r.ok ? await r.json() : false; } catch { creditosImg = false; }
  renderCreditos();
  return creditosImg;
}
function renderCreditos() {
  const c = $("#creditos"); if (!c) return;
  const imgs = creditosImg && creditosImg.imagenes ? Object.entries(creditosImg.imagenes) : [];
  if (!imgs.length) { c.innerHTML = `<p class="muted">Sin imágenes de Wikimedia Commons cargadas. Para bajarlas: <code>npm run logos</code> en el proyecto o el workflow "Descargar imágenes de marcas" en GitHub.</p>`; return; }
  const fila = (nombre, i) => `<div class="credito"><b>${esc(nombre)}</b><span>${esc(i.titulo)} · <a href="${esc(i.fuente)}" target="_blank" rel="noopener">Wikimedia Commons</a> · ${i.licenciaUrl ? `<a href="${esc(i.licenciaUrl)}" target="_blank" rel="noopener">${esc(i.licencia)}</a>` : esc(i.licencia)}${i.autor ? ` · ${esc(i.autor)}` : ""}${i.credito ? ` · ${esc(i.credito)}` : ""}</span></div>`;
  const icos = creditosImg.iconos ? CATEGORIAS.map(c => creditosImg.iconos[c.id]).filter(Boolean) : [];
  c.innerHTML = `<p class="muted">${esc(creditosImg.aviso || "")}</p><div class="vlist" style="margin-top:8px">` + imgs.map(([m, i]) => fila(m, i)).join("") + `</div>`
    + (icos.length ? `<h4 class="sub-h">Íconos de categorías</h4><p class="muted">${esc(creditosImg.aviso_iconos || "")}</p><div class="vlist" style="margin-top:8px">` + icos.map(i => `<div class="credito"><div class="cred-ico">${iconoCat(i.archivo.replace(/\.png$/, ""), 22)}<b>${esc(i.categoria)}</b></div><span>${esc(i.titulo)} · <a href="${esc(i.fuente)}" target="_blank" rel="noopener">Wikimedia Commons</a> · <a href="${esc(i.licenciaUrl)}" target="_blank" rel="noopener">${esc(i.licencia)}</a> · ${esc(i.autor)}</span></div>`).join("") + `</div>` : "");
}
function renderLogos() {
  const c = $("#logos"); if (!c) return;
  c.innerHTML = Object.keys(MARCAS).filter(m => m !== "Otro").map(m => `<div class="logo-row">${tileMarca(m)}<span>${esc(m)}${logos[m] ? `<small>imagen propia</small>` : ""}</span><button class="btn sm" onclick="elegirLogo(this.dataset.m)" data-m="${esc(m)}">${logos[m] ? "Cambiar" : "Cargar"}</button>${logos[m] ? `<button class="btn sm link danger" onclick="quitarLogo(this.dataset.m)" data-m="${esc(m)}">Quitar</button>` : ""}</div>`).join("");
}
let logoMarcaPendiente = "";
function elegirLogo(m) { logoMarcaPendiente = m; $("#logo-input").click(); }
function logoDesdeInput(ev) {
  const f = ev.target.files && ev.target.files[0]; ev.target.value = ""; const m = logoMarcaPendiente; logoMarcaPendiente = ""; if (!f || !m) return;
  const r = new FileReader();
  r.onload = async () => { try { logos[m] = await reducirImagen(String(r.result), 320, 0.85, /png|svg|webp/i.test(f.type)); store.set("logos", logos); renderLogos(); toast(`Imagen de ${m} guardada`); } catch { toast("No se pudo procesar la imagen"); } };
  r.readAsDataURL(f);
}
function quitarLogo(m) { delete logos[m]; store.set("logos", logos); renderLogos(); }
function setPrecio(k, v) { v = Number(v); if (v > 0) precios[k] = v; else delete precios[k]; store.set("precios", precios); toast("Mano de obra actualizada"); }
async function restablecerPrecios() {
  const ok = await dialogo({ titulo: "Restablecer mano de obra", mensaje: "Vuelven los precios base de la app para todos los tipos de trabajo.", ok: "Restablecer" });
  if (!ok) return; precios = {}; store.set("precios", precios); renderConfig();
}
function guardarConfig() {
  cfg = { nombre: $("#cfg-nombre").value.trim(), tel: $("#cfg-tel").value.trim(), direccion: $("#cfg-direccion").value.trim(), localidad: $("#cfg-localidad").value.trim(), gar: Number($("#cfg-gar").value) || 30,
    recargo: Math.max(0, Number($("#cfg-recargo").value) || 0), horario: $("#cfg-horario").value.trim(), preciosUrl: $("#cfg-url").value.trim() === PRECIOS_URL ? "" : $("#cfg-url").value.trim() };
  store.set("cfg", cfg); toast("Guardado"); renderCrumbs("ajustes");
}
async function borrarTodo() {
  const ok = await dialogo({ titulo: "Borrar todos los datos", mensaje: "Se borran órdenes, precios y ajustes de este teléfono. Exportá un respaldo antes.", ok: "Borrar todo", peligro: true });
  if (!ok) return;
  Object.keys(localStorage).filter(k => k.startsWith("cf_")).forEach(k => localStorage.removeItem(k)); location.reload();
}

// ---------- Compartir / abrir ----------
function abrirUrl(url) { window.open(url, "_blank", "noopener"); }
async function compartir(texto) {
  const Share = Plugin("Share");
  if (Share) { try { await Share.share({ text: texto, dialogTitle: "Enviar" }); return; } catch { return; } }
  if (navigator.share) { try { await navigator.share({ text: texto }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  abrirUrl("https://wa.me/?text=" + encodeURIComponent(texto));
}

// ---------- Arranque ----------
function init() {
  $("#back").innerHTML = ico("back", 24); $("#search-ico").innerHTML = ico("search", 18); $("#q-clear").innerHTML = ico("x", 16); $("#cart-ico").innerHTML = ico("cart", 22);
  $("#hero-ico").innerHTML = ico("logo", 30); $("#qk-ord").innerHTML = ico("orders", 18); $("#qk-listo").innerHTML = ico("check", 18); $("#qk-gan").innerHTML = ico("tag", 18); $("#qk-cobrar").innerHTML = ico("receipt", 18);
  $("#add-ico").innerHTML = ico("plus", 16); $("#modal-x").innerHTML = ico("x", 20);
  $$("[data-ico]").forEach(e => { e.innerHTML = ico(e.dataset.ico, 22); });
  $$(".tab").forEach(t => { t.onclick = () => { hist = []; go(t.dataset.go); }; });
  $("#q").addEventListener("input", onBuscar);
  const cq = $("#cli-q"); if (cq) cq.addEventListener("input", () => { sel.cliQ = cq.value; renderClientes(); });
  const ot = $("#o-tel"); if (ot) { ot.addEventListener("change", sugerirCliente); ot.addEventListener("blur", sugerirCliente); }
  $("#dlg-ok").addEventListener("click", dlgAceptar); $("#dlg-cancel").addEventListener("click", dlgCancelar);
  $("#dlg-input").addEventListener("keydown", e => { if (e.key === "Enter") dlgAceptar(); });
  updCart(); go("inicio", false);
  cargarPreciosML().catch(() => { }); buscarActualizacion().catch(() => { }); ofrecerRestaurar().catch(() => { });
  if (!esNativo && "serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => { });
}
init();

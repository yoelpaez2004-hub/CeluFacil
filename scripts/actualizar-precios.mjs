#!/usr/bin/env node
// Robot de precios de Celu Fácil: actualiza www/precios-ml.json con precios EXACTOS de Mercado Libre (sitio MLA).
//
// Para cada repuesto × modelo busca publicaciones, descarta las que no corresponden (celulares, fundas, otra variante
// del modelo), clasifica las que quedan en tres niveles de calidad (económico / calidad original / premium) y guarda la
// publicación más barata creíble de cada nivel: precio exacto, envío gratis, título, link y cantidad vendida.
//
// Fuentes, en orden:
//   1. API oficial (https://developers.mercadolibre.com.ar/) si hay credenciales: ML_ACCESS_TOKEN, o ML_CLIENT_ID +
//      ML_CLIENT_SECRET (+ ML_REFRESH_TOKEN si la API exige token de usuario).
//   2. Página pública de resultados (listado.mercadolibre.com.ar) si no hay credenciales. No requiere configurar nada.
//
// Uso:  node scripts/actualizar-precios.mjs                      # todo
//       node scripts/actualizar-precios.mjs --solo "Galaxy A05"   # solo los modelos que contengan ese texto
//       node scripts/actualizar-precios.mjs --partes modulo,bateria --limite 20
//       node scripts/actualizar-precios.mjs --rotacion            # módulo, batería y pin todos los días; cámara, tapa y flex solo los domingos
//
// www/exclusiones.json (opcional): { "ids": ["MLA123", ...] } con publicaciones que no sirven (se copia desde la app,
// Mi taller → Precios de Mercado Libre). El robot las saltea.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = join(ROOT, "www", "precios-ml.json");
const API = "https://api.mercadolibre.com";
const LISTADO = "https://listado.mercadolibre.com.ar";

// Repuestos que se consultan por modelo (los demás usan la tabla de referencia de data.js)
const PARTES_DEFECTO = ["modulo", "bateria", "pin", "camara", "tapa", "flexpower"];
const PARTES_DIARIAS = ["modulo", "bateria", "pin"]; // con --rotacion, el resto solo los domingos
// Palabras que indican que la publicación NO es el repuesto buscado
const EXCLUIR = /\b(celular|smartphone|liberado|usado|funda|vidrio templado|hidrogel|cargador|cable|auricular|protector|soporte|kit|herramienta|pel[ií]cula|tablet|notebook|reloj|smartwatch|lote|pack|combo|mayorista|dual sim|servicio t[eé]cnico|en el d[ií]a|a domicilio)\b|^(cambio|servicio|reparaci[oó]n|colocaci[oó]n|instalaci[oó]n)\b|\bx\s?\d+\s?(u|un|unid|unidades)\b|\b\d{2,3}\s?gb\b|\b\d+\s?(gb )?ram\b/i;
// Lo que NO corresponde a cada repuesto (una tapa no es un módulo; un flex de encendido no es un pin de carga)
const EXCLUIR_PARTE = {
  modulo: /\b(glass|vidrio|solo vidrio|oca|flex|t[aá]ctil solo|solo touch|tapa|carcasa|bater[ií]a|c[aá]mara|pin de carga|placa|bisel|marco solo)\b/i,
  bateria: /\b(externa|power ?bank|magsafe|cargador|port[aá]til|flex|tapa|m[oó]dulo|pantalla)\b/i,
  pin: /\b(inal[aá]mbric[ao]|wireless|nfc|bobina|encendido|volumen|huella|bater[ií]a|pantalla|m[oó]dulo|tapa|placa madre)\b/i,
  tapa: /\b(funda|case|carcasa completa|bater[ií]a|m[oó]dulo|pantalla|vidrio templado)\b/i,
  camara: /\b(vidrio|lente solo|protector|m[oó]dulo pantalla|bater[ií]a|tapa)\b/i,
  flexpower: /\b(carga|usb|tipo c|pantalla|m[oó]dulo|bater[ií]a|c[aá]mara|tapa|placa)\b/i
};
// Lo que SÍ tiene que decir el título para contar como ese repuesto
const REQUERIR_PARTE = {
  modulo: /\b(m[oó]dulo|pantalla|display|lcd|oled|amoled|touch|screen)\b/i,
  bateria: /\bbater[ií]a\b/i,
  pin: /\b(carga|pin|conector|puerto|usb|lightning|tipo c|type c|dock|centro de carga)\b/i,
  camara: /\bc[aá]mara\b/i,
  tapa: /\b(tapa|carcasa|cover|back|trasera)\b/i,
  flexpower: /\b(power|encendido|bot[oó]n|flex)\b/i
};
// Cámara: si dice frontal/selfie y no dice trasera/principal, es otra cámara
const esCamaraFrontal = t => /\b(frontal|selfie|delantera)\b/i.test(t) && !/\b(trasera|principal)\b/i.test(t);
// Tope de precio por repuesto (por encima de esto es un celular u otro producto, no el repuesto)
const MAX_PRECIO = { modulo: 900000, bateria: 180000, pin: 120000, camara: 350000, tapa: 150000, flexpower: 80000 };
const LIMITE_API = 50;
const MAX_REINTENTOS = 3;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ---- Cargar MARCAS y REPUESTOS desde www/data.js (mismo archivo que usa la app) ----
function cargarDatos() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(ROOT, "www", "data.js"), "utf8") + ";this.MARCAS=MARCAS;this.REPUESTOS=REPUESTOS;", ctx);
  return { MARCAS: ctx.MARCAS, REPUESTOS: ctx.REPUESTOS };
}

const dormir = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
export const slug = s => norm(s).replace(/[^a-z0-9 ]/g, " ").trim().replace(/\s+/g, "-");
export const mediana = a => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
export const percentil = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; };

// ---- Clasificación por nivel de calidad ----
// Orden importante: "calidad original" y "original premium" son aftermarket bueno (nivel original), no original de fábrica.
const RE_PREMIUM = /\b(service ?pack|oem|genuin[oa]s?|de f[aá]brica|100 ?% ?original|original (samsung|apple|motorola|xiaomi|huawei|realme|nokia)|(samsung|apple|motorola|xiaomi|huawei|realme|nokia) original|soft oled|high performance)\b/i;
const RE_ORIGINAL = /\b(calidad original|original premium|hard oled|oled|amoled|aaa\+?|primera calidad|alta calidad|calidad superior)\b/i;
const RE_ECONOMICO = /\b(incell|in-cell|tft|lcd|gen[eé]ric[oa]s?|alternativ[oa]s?|compatible|china|econ[oó]mic[oa]|cof|copia)\b/i;

export function nivelPorTitulo(titulo) {
  const t = norm(titulo);
  if (RE_PREMIUM.test(t)) return "premium";
  if (RE_ORIGINAL.test(t)) return "original";
  if (RE_ECONOMICO.test(t)) return "economico";
  if (/\boriginal\b/.test(t)) return "original"; // "original" a secas: los vendedores lo usan para aftermarket bueno
  return null;
}

// Devuelve { economico, original, premium } con la publicación representativa de cada nivel (o null).
export function clasificarNiveles(items) {
  const lista = items.map(it => ({ ...it, nivel: nivelPorTitulo(it.title) }));
  const precios = lista.map(i => i.price);
  if (!precios.length) return { economico: null, original: null, premium: null };
  // Sin palabra clave: por posición en la distribución de precios (tercios)
  const p33 = percentil(precios, 1 / 3), p66 = percentil(precios, 2 / 3);
  for (const it of lista) if (!it.nivel) it.nivel = it.price <= p33 ? "economico" : it.price <= p66 ? "original" : "premium";
  const elegir = (grupo) => {
    if (!grupo.length) return null;
    const med = mediana(grupo.map(i => i.price));
    const creibles = grupo.filter(i => i.price >= med * 0.4); // descarta precios sospechosamente bajos (otro producto, error)
    const cand = (creibles.length ? creibles : grupo).slice().sort((a, b) => a.price - b.price || (b.shipping && b.shipping.free_shipping ? 1 : 0) - (a.shipping && a.shipping.free_shipping ? 1 : 0));
    const it = cand[0];
    const compacta = x => ({ p: x.price, env: !!(x.shipping && x.shipping.free_shipping), t: String(x.title || "").slice(0, 90), u: x.permalink || "", id: x.id || "" });
    // alt: las dos siguientes del mismo nivel, para que la app pueda saltar una publicación que el taller marcó como "no sirve"
    return { ...compacta(it), img: String(it.thumbnail || "").replace("http://", "https://"), v: Number(it.sold_quantity) || 0, n: grupo.length, alt: cand.slice(1, 3).map(x => { const c = compacta(x); return { p: c.p, env: c.env, u: c.u, id: c.id }; }) };
  };
  const res = { economico: elegir(lista.filter(i => i.nivel === "economico")), original: elegir(lista.filter(i => i.nivel === "original")), premium: elegir(lista.filter(i => i.nivel === "premium")) };
  // Coherencia: cada nivel debe costar al menos lo que el anterior; si no, se reordenan por precio los niveles presentes
  const presentes = ["economico", "original", "premium"].filter(k => res[k]);
  const ordenados = presentes.map(k => res[k]).sort((a, b) => a.p - b.p);
  presentes.forEach((k, idx) => { res[k] = ordenados[idx]; });
  return res;
}

// ---- Filtro: que la publicación sea el repuesto del modelo exacto ----
// Palabras que distinguen variantes de un mismo modelo (A05 ≠ A05s, Note 13 ≠ Note 13 Pro, G24 ≠ G24 Power)
const CALIFICADORES = new Set(["pro", "plus", "max", "ultra", "lite", "mini", "fe", "power", "core", "neo", "play", "note", "prime", "edge"]);
const tokens = s => norm(s).replace(/[^a-z0-9+ ]/g, " ").split(" ").filter(Boolean);
// Cómo nombran la marca las publicaciones ("Moto G24" sin "Motorola", "Redmi" sin "Xiaomi")
const MARCA_RE = { Samsung: /\b(samsung|galaxy)\b/, Motorola: /\b(motorola|moto)\b/, Xiaomi: /\b(xiaomi|redmi|poco)\b/, ZTE: /\b(zte|blade)\b/, Huawei: /\b(huawei|honor)\b/ };
// Palabras de línea que las publicaciones suelen omitir ("Motorola G24" por "Moto G24", "Xiaomi Note 13" por "Redmi Note 13")
const LINEA = new Set(["moto", "redmi", "poco", "blade", "xperia", "galaxy", "nokia", "alcatel", "realme", "noblex", "tcl", "joy", "z"]);
const contieneSeguidos = (lista, frase) => {
  if (!frase.length) return true;
  for (let i = 0; i + frase.length <= lista.length; i++) { let ok = true; for (let j = 0; j < frase.length; j++) if (lista[i + j] !== frase[j]) { ok = false; break; } if (ok) return true; }
  return false;
};
// El modelo tiene que aparecer como frase seguida en el título ("iphone 12", "a15", "g24 power"): así "iPhone 6s 12 Mp" no pasa por iPhone 12
export function mencionaModelo(titulo, marca, modelo) {
  const tt = tokens(titulo);
  const frase = tokens(modelo).filter(w => w !== "galaxy");
  if (marca === "iPhone" && frase[0] !== "iphone") frase.unshift("iphone");
  if (contieneSeguidos(tt, frase)) return true;
  const corta = LINEA.has(frase[0]) ? frase.slice(1) : null;
  if (corta && corta.length && (corta.length >= 2 || (/[a-z]/.test(corta[0]) && /\d/.test(corta[0])))) return contieneSeguidos(tt, corta);
  return false;
}

export function filtrar(results, parte, marca, modelo) {
  const modTok = tokens(modelo);
  const requeridos = modTok.filter(w => /\d/.test(w) || CALIFICADORES.has(w)); // "galaxy a05" → ["a05"], "redmi note 13 pro" → ["note","13","pro"]
  const prohibidos = [...CALIFICADORES].filter(q => !modTok.includes(q) && q !== "note" && q !== "edge");
  const excl = EXCLUIR_PARTE[parte], req = REQUERIR_PARTE[parte], tope = MAX_PRECIO[parte] || 900000;
  return results.filter(it => {
    const t = norm(it.title);
    if (!(it.price > 500) || it.price > tope) return false;
    if (EXCLUIR.test(t) || (excl && excl.test(t))) return false;
    if (req && !req.test(t)) return false;
    if (parte === "camara" && esCamaraFrontal(t)) return false;
    if (marca !== "iPhone" && !(MARCA_RE[marca] || new RegExp("\\b" + norm(marca) + "\\b")).test(t)) return false;
    const tt = new Set(tokens(it.title));
    if (!requeridos.every(w => tt.has(w))) return false;
    if (prohibidos.some(q => tt.has(q))) return false;
    if (!mencionaModelo(it.title, marca, modelo)) return false;
    return true;
  });
}

export function resumir(items) {
  const precios = items.map(i => i.price);
  return { n: items.length, min: Math.min(...precios), mediana: mediana(precios), max: Math.max(...precios), niveles: clasificarNiveles(items) };
}

// ---- Fuente 1: API oficial ----
async function obtenerToken() {
  if (process.env.ML_ACCESS_TOKEN) return process.env.ML_ACCESS_TOKEN;
  const { ML_CLIENT_ID, ML_CLIENT_SECRET, ML_REFRESH_TOKEN } = process.env;
  if (!ML_CLIENT_ID || !ML_CLIENT_SECRET) return null;
  const body = new URLSearchParams(ML_REFRESH_TOKEN
    ? { grant_type: "refresh_token", client_id: ML_CLIENT_ID, client_secret: ML_CLIENT_SECRET, refresh_token: ML_REFRESH_TOKEN }
    : { grant_type: "client_credentials", client_id: ML_CLIENT_ID, client_secret: ML_CLIENT_SECRET });
  const r = await fetch(`${API}/oauth/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body });
  if (!r.ok) { console.warn(`No se pudo obtener token de la API (HTTP ${r.status}); se usa la página pública.`); return null; }
  const j = await r.json();
  if (j.refresh_token) { console.log("::add-mask::" + j.refresh_token); console.log("Nuevo refresh_token emitido (guardalo como secret ML_REFRESH_TOKEN):", j.refresh_token); }
  return j.access_token || null;
}

async function buscarApi(q, token) {
  const url = `${API}/sites/MLA/search?q=${encodeURIComponent(q)}&condition=new&limit=${LIMITE_API}&sort=price_asc`;
  for (let i = 1; i <= MAX_REINTENTOS; i++) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (r.status === 429 || r.status >= 500) { await dormir(2000 * i); continue; }
    if (!r.ok) throw new Error(`HTTP ${r.status} en la API`);
    return ((await r.json()).results || []).map(it => ({ id: it.id, title: it.title, price: Number(it.price) || 0, permalink: it.permalink, thumbnail: it.thumbnail, shipping: { free_shipping: !!(it.shipping && it.shipping.free_shipping) }, sold_quantity: it.sold_quantity }));
  }
  return [];
}

// ---- Fuente 2: página pública de resultados ----
export function urlListado(q) { return `${LISTADO}/${slug(q)}_OrderId_PRICE`; } // ordenado por menor precio

const aNumero = s => { const n = Number(String(s || "").replace(/[^\d]/g, "")); return Number.isFinite(n) ? n : 0; };
const sinTags = s => String(s || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

// Extrae el objeto JSON que sigue a "window.__PRELOADED_STATE__ =" respetando llaves y strings
function jsonEmbebido(html, marca = "__PRELOADED_STATE__") {
  const i = html.indexOf(marca); if (i < 0) return null;
  const ini = html.indexOf("{", i); if (ini < 0) return null;
  let nivel = 0, enStr = false, esc = false;
  for (let k = ini; k < html.length; k++) {
    const c = html[k];
    if (enStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') enStr = false; continue; }
    if (c === '"') enStr = true;
    else if (c === "{") nivel++;
    else if (c === "}") { nivel--; if (nivel === 0) { try { return JSON.parse(html.slice(ini, k + 1)); } catch { return null; } } }
  }
  return null;
}

// Recorre el estado de la página buscando publicaciones (formato clásico "results[]" o tarjetas "polycard")
function publicacionesDesdeEstado(estado) {
  const out = [], vistos = new Set();
  const agregar = p => { if (p && p.price > 0 && p.title && !vistos.has(p.id || p.permalink)) { vistos.add(p.id || p.permalink); out.push(p); } };
  const textoDe = v => typeof v === "string" ? v : v && typeof v === "object" ? (v.text || v.value || "") : "";
  const walk = (o, prof) => {
    if (!o || typeof o !== "object" || prof > 40) return;
    if (Array.isArray(o)) { for (const x of o) walk(x, prof + 1); return; }
    const id = typeof o.id === "string" && /^MLA-?\d{6,}$/.test(o.id) ? o.id.replace("-", "") : null;
    if (id && (typeof o.title === "string" || o.price !== undefined)) {
      const price = typeof o.price === "number" ? o.price : o.price && typeof o.price === "object" ? Number(o.price.amount) : o.prices && o.prices.prices && o.prices.prices[0] ? Number(o.prices.prices[0].amount) : 0;
      const env = !!(o.shipping && (o.shipping.free_shipping === true || /gratis/i.test(textoDe(o.shipping))));
      agregar({ id, title: String(o.title || ""), price, permalink: o.permalink || o.url || "", thumbnail: o.thumbnail || (o.pictures && o.pictures.stack && (o.pictures.stack.retina || o.pictures.stack.normal)) || "", shipping: { free_shipping: env }, sold_quantity: o.sold_quantity });
    }
    if (o.polycard && o.polycard.metadata && typeof o.polycard.metadata.id === "string") {
      const pc = o.polycard; const comps = Array.isArray(pc.components) ? pc.components : [];
      const buscar = tipo => comps.find(c => c && c.type === tipo);
      const ct = buscar("title"), cp = buscar("price"), cs = buscar("shipping");
      const title = ct ? textoDe(ct.title) : ""; const pr = cp && cp.price ? cp.price.current_price || cp.price : null;
      const price = pr ? Number(pr.value !== undefined ? pr.value : pr.amount) : 0;
      const env = cs ? /gratis/i.test(JSON.stringify(cs)) : false;
      const pic = pc.pictures && Array.isArray(pc.pictures) && pc.pictures[0] ? (pc.pictures[0].url || pc.pictures[0].src || "") : "";
      agregar({ id: String(pc.metadata.id).replace("-", ""), title, price, permalink: pc.metadata.url || "", thumbnail: pic, shipping: { free_shipping: env }, sold_quantity: 0 });
    }
    for (const k of Object.keys(o)) if (k !== "polycard") walk(o[k], prof + 1);
  };
  walk(estado, 0);
  return out;
}

// Plan B: tarjetas en el HTML (clases "poly-*" de Mercado Libre; si cambian, el robot avisa y no inventa datos)
function publicacionesDesdeHtml(html) {
  const out = [], vistos = new Set();
  const bloques = html.split(/<li[^>]*class="[^"]*ui-search-layout__item[^"]*"[^>]*>/).slice(1);
  for (const b of bloques) {
    const mTitulo = b.match(/poly-component__title[^>]*>([\s\S]*?)<\/(?:a|h2|span|div)>/) || b.match(/ui-search-item__title[^>]*>([\s\S]*?)<\/(?:a|h2|span|div)>/);
    const mHref = b.match(/href="(https?:\/\/[^"]+)"/);
    const actual = b.match(/poly-price__current[\s\S]*?andes-money-amount__fraction[^>]*>([\d.,]+)</) || b.match(/ui-search-price__second-line[\s\S]*?andes-money-amount__fraction[^>]*>([\d.,]+)</) || b.match(/andes-money-amount__fraction[^>]*>([\d.,]+)</);
    if (!mTitulo || !actual) continue;
    const permalink = mHref ? mHref[1].replace(/#.*$/, "") : "";
    const mId = (b.match(/\b(MLA-?\d{6,})\b/) || [])[1];
    const id = mId ? mId.replace("-", "") : permalink;
    if (!id || vistos.has(id)) continue; vistos.add(id);
    const mImg = b.match(/<img[^>]+(?:data-src|src)="(https?:\/\/[^"]+)"/);
    out.push({ id: mId ? mId.replace("-", "") : "", title: sinTags(mTitulo[1]), price: aNumero(actual[1]), permalink, thumbnail: mImg ? mImg[1] : "", shipping: { free_shipping: /env[ií]o gratis|llega gratis/i.test(sinTags(b)) }, sold_quantity: 0 });
  }
  return out;
}

export function extraerPublicaciones(html) {
  const estado = jsonEmbebido(html);
  let lista = estado ? publicacionesDesdeEstado(estado) : [];
  if (!lista.length) lista = publicacionesDesdeHtml(html);
  return lista.filter(p => p.price > 0 && p.title);
}

async function buscarPagina(q, estadisticas) {
  const url = urlListado(q);
  for (let i = 1; i <= MAX_REINTENTOS; i++) {
    let r;
    try { r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "es-AR,es;q=0.9", "Cache-Control": "no-cache" }, redirect: "follow" }); }
    catch (e) { if (i === MAX_REINTENTOS) throw e; await dormir(2000 * i); continue; }
    if (r.status === 429 || r.status === 403 || r.status >= 500) { if (i === MAX_REINTENTOS) throw new Error(`HTTP ${r.status} en ${url}`); await dormir(3000 * i); continue; }
    if (r.status === 404) return []; // sin resultados
    if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
    const html = await r.text();
    // Muro anti-robot: Mercado Libre redirige a "account-verification" y pide iniciar sesión. No hay datos que leer.
    if (/account-verification/.test(r.url || "") || /ingresa a\s*tu cuenta|account-verification/i.test(html.slice(0, 60000))) { estadisticas.bloqueado++; throw new Error("Mercado Libre pide iniciar sesión para ver resultados (bloqueo anti-robot)"); }
    const lista = extraerPublicaciones(html);
    if (!lista.length) {
      // ¿Página sin resultados o cambió el formato? Si no hay ni rastro de tarjetas ni de estado, lo contamos como formato desconocido.
      const sinResultados = /no hay publicaciones|no encontramos|sin resultados/i.test(html);
      if (!sinResultados && !/ui-search-layout__item|__PRELOADED_STATE__|poly-card/.test(html)) estadisticas.formatoDesconocido++;
    }
    return lista;
  }
  return [];
}

// ---- Programa principal ----
function argumentos() {
  const a = process.argv.slice(2); const get = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const rotacion = a.includes("--rotacion") && new Date().getDay() !== 0; // domingo: todas las partes
  return { solo: get("--solo"), partes: (get("--partes") || (rotacion ? PARTES_DIARIAS : PARTES_DEFECTO).join(",")).split(",").map(s => s.trim()).filter(Boolean), limite: Number(get("--limite")) || 0, rotacion };
}
export function cargarExclusiones() {
  const ruta = join(ROOT, "www", "exclusiones.json");
  try { const j = JSON.parse(readFileSync(ruta, "utf8")); return new Set(Array.isArray(j.ids) ? j.ids.map(String) : []); } catch { return new Set(); }
}

async function main() {
  const { MARCAS, REPUESTOS } = cargarDatos();
  const args = argumentos();
  const excluidas = cargarExclusiones();
  if (excluidas.size) console.log(`${excluidas.size} publicaciones excluidas (www/exclusiones.json)`);
  if (args.rotacion) console.log(`Rotación: hoy solo ${args.partes.join(", ")} (cámara, tapa y flex los domingos)`);
  const token = await obtenerToken();
  const fuente = token ? "api.mercadolibre.com" : "listado.mercadolibre.com.ar (página pública)";
  const pausa = token ? 400 : 900;
  console.log(`Fuente: ${fuente}`);
  const previo = existsSync(SALIDA) ? JSON.parse(readFileSync(SALIDA, "utf8")) : { precios: {} };
  const salida = { actualizado: new Date().toISOString(), fuente, precios: { ...(previo.precios || {}) } };
  const est = { consultas: 0, conDatos: 0, errores: 0, fallosSeguidos: 0, formatoDesconocido: 0, bloqueado: 0 };

  bucle:
  for (const [marca, gamas] of Object.entries(MARCAS)) {
    if (marca === "Otro") continue;
    for (const modelo of [...gamas.alta, ...gamas.media, ...gamas.baja]) {
      if (args.solo && !norm(`${marca} ${modelo}`).includes(norm(args.solo))) continue;
      let encontrados = 0;
      for (const parte of args.partes) {
        const rep = REPUESTOS[parte]; if (!rep || !rep.ml) continue;
        const q = `${rep.ml} ${marca === "iPhone" ? "" : marca} ${modelo}`.replace(/\s+/g, " ").trim();
        const clave = `${parte}|${marca}|${modelo}`;
        try {
          const crudo = (token ? await buscarApi(q, token) : await buscarPagina(q, est)).filter(it => !excluidas.has(String(it.id || "")));
          const res = filtrar(crudo, parte, marca, modelo);
          est.consultas++; est.fallosSeguidos = 0;
          if (res.length >= 2) { salida.precios[clave] = { ...resumir(res), q, f: salida.actualizado }; est.conDatos++; encontrados++; }
          else if (res.length === 1) { const nv = clasificarNiveles(res); salida.precios[clave] = { n: 1, min: res[0].price, mediana: res[0].price, max: res[0].price, niveles: { economico: null, original: nv.original || nv.economico || nv.premium, premium: null }, q, f: salida.actualizado }; est.conDatos++; encontrados++; }
          else if (salida.precios[clave]) salida.precios[clave].viejo = true; // mantener el último conocido, marcado
        } catch (e) {
          est.errores++; est.fallosSeguidos++; console.warn(`✗ ${clave}: ${e.message}`);
          if (est.bloqueado >= 5 && est.conDatos === 0) { console.error("Mercado Libre bloquea la página pública de resultados (pide iniciar sesión). Para que el robot funcione, cargá ML_CLIENT_ID y ML_CLIENT_SECRET como secrets del repo (ver README)."); process.exitCode = 1; break bucle; }
          if (est.fallosSeguidos >= 12 && est.consultas === 0) { console.error("Mercado Libre no responde a ninguna consulta (¿bloqueo?). Probá más tarde o configurá las credenciales de la API (ver README)."); process.exitCode = 1; break bucle; }
          if (est.errores > 60) { console.error("Demasiados errores, se guarda lo obtenido hasta acá."); break bucle; }
        }
        await dormir(pausa);
        if (args.limite && est.consultas >= args.limite) break bucle;
      }
      console.log(`${encontrados ? "✓" : "·"} ${marca} ${modelo}: ${encontrados}/${args.partes.length} repuestos con precio`);
    }
  }
  if (est.formatoDesconocido > 5) console.warn(`⚠ ${est.formatoDesconocido} páginas con formato desconocido: puede que Mercado Libre haya cambiado el diseño. Ver publicacionesDesdeHtml().`);
  salida.resumen = { ...est, claves: Object.keys(salida.precios).length };
  if (est.conDatos > 0 || !existsSync(SALIDA)) writeFileSync(SALIDA, JSON.stringify(salida));
  console.log(`\nListo: ${est.conDatos} combinaciones con precio de ${est.consultas} consultas (${est.errores} errores). ${est.conDatos ? "Guardado en " + SALIDA : "No se guardó nada nuevo."}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(e => { console.error(e); process.exit(1); });

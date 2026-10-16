#!/usr/bin/env node
// Descarga una foto de cada modelo de celular desde Wikimedia Commons (solo archivos con licencia libre),
// como miniatura de 240 px, en www/modelos/<marca>-<modelo>.(png|jpg), y escribe www/modelos/index.json con
// el archivo y los créditos (autor, licencia, fuente) de cada uno. La web para clientes la usa en la lista de
// modelos; si un modelo no tiene foto, muestra una silueta.
//
//   node scripts/descargar-modelos.mjs                 # todos los modelos
//   node scripts/descargar-modelos.mjs Samsung Xiaomi  # solo esas marcas
//   node scripts/descargar-modelos.mjs --faltantes     # solo los que todavía no tienen foto
//
// Commons no tiene foto de todos los modelos (sobre todo gama baja y marcas locales): es normal que falten.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(ROOT, "www", "modelos");
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "CeluFacil/2.1 (app de taller de celulares; contacto: github.com/yoelpaez2004-hub/CeluFacil)";
const ANCHO = 240;

export const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sinHtml = s => String(s || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const dormir = ms => new Promise(r => setTimeout(r, ms));

function cargarMarcas() {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(readFileSync(join(ROOT, "www", "data.js"), "utf8") + ";this.MARCAS=MARCAS;", ctx);
  return ctx.MARCAS;
}
export function licenciaLibre(meta) {
  const lic = sinHtml(meta && meta.LicenseShortName && meta.LicenseShortName.value).toLowerCase();
  if (sinHtml(meta && meta.Copyrighted && meta.Copyrighted.value).toLowerCase() === "false") return true;
  return /public domain|dominio p[uú]blico|cc0|^cc by|^cc-by|attribution/.test(lic);
}
// Nombre con el que se busca: "Samsung Galaxy A05", "Apple iPhone 13", "Motorola Moto G23"
export function nombreBusqueda(marca, modelo) { return marca === "iPhone" ? `Apple ${modelo}` : `${marca} ${modelo}`; }

// Elige la mejor foto: tiene que nombrar el modelo exacto (todas sus palabras), ser libre y ser una foto del equipo
export function elegirCandidato(paginas, marca, modelo) {
  const palabras = slug(modelo).split("-").filter(Boolean);
  let mejor = null, mejorPuntos = -1e9;
  for (const p of paginas || []) {
    if (!p || p.missing || !p.imageinfo || !p.imageinfo[0]) continue;
    const ii = p.imageinfo[0]; const meta = ii.extmetadata || {};
    if (!licenciaLibre(meta)) continue;
    if (!/^image\/(jpeg|png|webp)$/.test(ii.mime || "")) continue;
    const t = slug(String(p.title || "").replace(/^File:/, ""));
    const partes = t.split("-");
    // Todas las palabras del modelo tienen que estar, como palabras enteras ("a05" no sirve para "a05s")
    if (!palabras.every(w => partes.includes(w))) continue;
    let puntos = 0;
    if (partes.includes(slug(marca)) || (marca === "iPhone" && partes.includes("apple"))) puntos += 2;
    if (/front|frente|frontal|display|screen/.test(t)) puntos += 2;
    if (/back|rear|trasera|camera|cámara/.test(t)) puntos += 1;
    if (/box|caja|logo|icon|screenshot|captura|wallpaper|teardown|desarm|pcb|battery|bateria|charger|case|funda|ad-|poster/.test(t)) continue; // no es una foto del equipo
    if (/pro|plus|ultra|max|lite|mini|fe|neo|power/.test(t) && !palabras.some(w => /pro|plus|ultra|max|lite|mini|fe|neo|power/.test(w))) puntos -= 4; // es otra variante
    if (ii.width && ii.height && ii.height > ii.width) puntos += 1; // un celular parado
    puntos -= Math.min(3, t.length / 60);
    if (puntos > mejorPuntos) { mejorPuntos = puntos; mejor = { titulo: p.title, pagina: ii.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`, thumb: ii.thumburl, mime: ii.thumbmime || ii.mime, licencia: sinHtml(meta.LicenseShortName && meta.LicenseShortName.value) || "Dominio público", licenciaUrl: sinHtml(meta.LicenseUrl && meta.LicenseUrl.value), autor: sinHtml(meta.Artist && meta.Artist.value) }; }
  }
  return mejor;
}

async function api(params) {
  const url = API + "?" + new URLSearchParams({ action: "query", format: "json", formatversion: "2", prop: "imageinfo", iiprop: "url|extmetadata|mime|size", iiurlwidth: String(ANCHO), ...params });
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (r.status === 429) { await dormir(5000); return api(params); }
  if (!r.ok) throw new Error(`Commons HTTP ${r.status}`);
  const j = await r.json();
  return (j.query && j.query.pages) || [];
}
async function buscarModelo(marca, modelo) {
  const q = nombreBusqueda(marca, modelo);
  for (const s of [`"${q}" filetype:bitmap`, `${q} filetype:bitmap`]) {
    const c = elegirCandidato(await api({ generator: "search", gsrsearch: s, gsrnamespace: "6", gsrlimit: "20" }), marca, modelo);
    if (c) return c;
    await dormir(250);
  }
  return null;
}
async function descargar(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`descarga HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function main() {
  const args = process.argv.slice(2); const soloFaltantes = args.includes("--faltantes");
  const pedidas = args.filter(a => !a.startsWith("--")).map(x => x.toLowerCase());
  const MARCAS = cargarMarcas();
  mkdirSync(DESTINO, { recursive: true });
  const rutaIndex = join(DESTINO, "index.json");
  const index = existsSync(rutaIndex) ? JSON.parse(readFileSync(rutaIndex, "utf8")) : { aviso: "", modelos: {} };
  index.aviso = "Fotos de referencia de cada modelo obtenidas de Wikimedia Commons con las licencias indicadas. Los nombres son marcas de sus dueños.";
  let ok = 0, total = 0;
  for (const [marca, gamas] of Object.entries(MARCAS)) {
    if (pedidas.length && !pedidas.includes(marca.toLowerCase())) continue;
    for (const modelo of [...gamas.alta, ...gamas.media, ...gamas.baja]) {
      const clave = `${marca}|${modelo}`; total++;
      if (soloFaltantes && index.modelos[clave]) continue;
      try {
        const c = await buscarModelo(marca, modelo);
        if (!c) { console.log(`· ${marca} ${modelo}: sin foto libre en Commons (queda la silueta)`); continue; }
        const buf = await descargar(c.thumb);
        const ext = /png/.test(c.mime) ? "png" : "jpg";
        const archivo = `${slug(marca)}-${slug(modelo)}.${ext}`;
        writeFileSync(join(DESTINO, archivo), buf);
        index.modelos[clave] = { archivo, titulo: c.titulo.replace(/^File:/, ""), fuente: c.pagina, licencia: c.licencia, licenciaUrl: c.licenciaUrl, autor: c.autor, descargado: new Date().toISOString().slice(0, 10) };
        ok++; console.log(`✓ ${marca} ${modelo}: ${c.titulo} · ${c.licencia}`);
      } catch (e) { console.warn(`✗ ${marca} ${modelo}: ${e.message}`); }
      await dormir(400);
    }
    writeFileSync(rutaIndex, JSON.stringify(index, null, 2)); // guardar marca por marca por si se corta
  }
  writeFileSync(rutaIndex, JSON.stringify(index, null, 2));
  console.log(`\n${ok} fotos nuevas · ${Object.keys(index.modelos).length}/${total} modelos con foto en ${DESTINO}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(e => { console.error(e); process.exit(1); });

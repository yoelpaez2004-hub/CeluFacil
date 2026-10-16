#!/usr/bin/env node
// Descarga imágenes de marcas desde Wikimedia Commons (solo archivos con licencia libre) como PNG de 320 px con
// fondo transparente, en www/marcas/<marca>.png, y escribe www/marcas/creditos.json con autor, licencia y fuente
// de cada una. La app muestra esos créditos en Mi taller → Acerca de.
//
//   node scripts/descargar-logos.mjs            # todas las marcas
//   node scripts/descargar-logos.mjs Samsung LG  # solo algunas
//
// Los logos son marcas registradas de sus dueños: la app los usa para indicar qué equipos repara (uso nominativo).
// Commons solo aloja archivos de uso libre (dominio público, CC0, CC BY/BY-SA); los demás se descartan.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(ROOT, "www", "marcas");
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "CeluFacil/2.0 (app de taller de celulares; contacto: github.com/yoelpaez2004-hub/CeluFacil)"; // Wikimedia pide un User-Agent descriptivo
const ANCHO = 320;

// Títulos preferidos en Commons (se prueban en orden); si ninguno existe o no es libre, se busca.
const PREFERIDOS = {
  Samsung: ["Samsung_wordmark.svg", "Samsung_Logo.svg"],
  Motorola: ["Motorola_logo.svg", "Motorola_M_symbol.svg"],
  Xiaomi: ["Xiaomi_logo_(2021-).svg", "Xiaomi_logo.svg"],
  iPhone: ["Apple_logo_black.svg", "IPhone_logo.svg"],
  TCL: ["TCL_logo.svg", "TCL_Technology_logo.svg", "TCL_Logo.svg"],
  ZTE: ["ZTE_logo.svg", "ZTE-logo.svg", "ZTE_Corporation_logo.svg"],
  Realme: ["Realme_logo.svg", "Realme-realme-logo.svg"],
  Huawei: ["Huawei_Standard_logo.svg", "Huawei.svg"],
  Nokia: ["Nokia_wordmark.svg", "Nokia_logo.svg"],
  Alcatel: ["Alcatel_logo_2016.svg", "Alcatel_Mobile_logo.svg", "Alcatel_logo.svg"],
  Noblex: ["Noblex_logo.svg", "Noblex.svg", "Logo_Noblex.svg"],
  LG: ["LG_logo_(2015).svg", "LG_symbol.svg", "LG_logo.svg"],
  Sony: ["Sony_logo.svg"],
  BGH: ["BGH_logo.svg", "BGH.svg"],
  BLU: ["BLU_Products_logo.svg", "Blu_Products_logo.svg", "BLU_logo.svg"]
};
const BUSQUEDA = { iPhone: "Apple logo", Motorola: "Motorola logo", LG: "LG Electronics logo", BLU: "BLU Products logo", BGH: "BGH logo Argentina" };

export const slugMarca = m => String(m).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const sinHtml = s => String(s || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const dormir = ms => new Promise(r => setTimeout(r, ms));

function cargarMarcas() {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(readFileSync(join(ROOT, "www", "data.js"), "utf8") + ";this.MARCAS=MARCAS;", ctx);
  return Object.keys(ctx.MARCAS).filter(m => m !== "Otro");
}

// Licencias aceptadas: dominio público, CC0, CC BY, CC BY-SA (todas permiten uso con atribución)
export function licenciaLibre(meta) {
  const lic = sinHtml(meta && meta.LicenseShortName && meta.LicenseShortName.value).toLowerCase();
  const copyrighted = sinHtml(meta && meta.Copyrighted && meta.Copyrighted.value).toLowerCase();
  if (copyrighted === "false") return true;
  return /public domain|dominio p[uú]blico|cc0|^cc by|^cc-by|attribution/.test(lic);
}

// Elige el mejor candidato de una lista de páginas de la API para una marca
export function elegirCandidato(paginas, marca) {
  const m = marca.toLowerCase();
  let mejor = null, mejorPuntos = -1e9;
  for (const p of paginas || []) {
    if (!p || p.missing || !p.imageinfo || !p.imageinfo[0]) continue;
    const ii = p.imageinfo[0]; const meta = ii.extmetadata || {};
    if (!licenciaLibre(meta)) continue;
    const t = String(p.title || "").toLowerCase();
    let puntos = 0;
    if (t.includes(m)) puntos += 4; else if (m === "iphone" && t.includes("apple")) puntos += 4; else continue;
    if (/logo|wordmark|symbol/.test(t)) puntos += 2;
    if (/\.svg$/.test(t)) puntos += 2;
    if (/old|former|antigu|19\d\d|200\d|201[0-4]/.test(t)) puntos -= 3;
    if (/icon|app|store|galaxy|pay|music|tv|health|cloud|watch/.test(t)) puntos -= 2;
    puntos -= Math.min(3, t.length / 40);
    if (puntos > mejorPuntos) { mejorPuntos = puntos; mejor = { titulo: p.title, pagina: ii.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`, thumb: ii.thumburl, original: ii.url, licencia: sinHtml(meta.LicenseShortName && meta.LicenseShortName.value) || "Dominio público", licenciaUrl: sinHtml(meta.LicenseUrl && meta.LicenseUrl.value), autor: sinHtml(meta.Artist && meta.Artist.value), credito: sinHtml(meta.Credit && meta.Credit.value) }; }
  }
  return mejor;
}

async function api(params) {
  const url = API + "?" + new URLSearchParams({ action: "query", format: "json", formatversion: "2", prop: "imageinfo", iiprop: "url|extmetadata|mime", iiurlwidth: String(ANCHO), ...params });
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error(`Commons HTTP ${r.status}`);
  const j = await r.json();
  return (j.query && j.query.pages) || [];
}

async function buscarMarca(marca) {
  const titulos = (PREFERIDOS[marca] || []).map(t => "File:" + t);
  if (titulos.length) {
    const paginas = await api({ titles: titulos.join("|") });
    // respetar el orden de preferencia
    for (const t of titulos) { const c = elegirCandidato(paginas.filter(p => p.title === t), marca); if (c) return c; }
  }
  for (const q of [`${BUSQUEDA[marca] || marca + " logo"} filetype:drawing`, `${BUSQUEDA[marca] || marca + " logo"}`]) {
    const paginas = await api({ generator: "search", gsrsearch: q, gsrnamespace: "6", gsrlimit: "15" });
    const c = elegirCandidato(paginas, marca); if (c) return c;
    await dormir(300);
  }
  return null;
}

async function descargar(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`descarga HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function main() {
  const pedidas = process.argv.slice(2);
  const marcas = cargarMarcas().filter(m => !pedidas.length || pedidas.map(x => x.toLowerCase()).includes(m.toLowerCase()));
  mkdirSync(DESTINO, { recursive: true });
  const rutaCreditos = join(DESTINO, "creditos.json");
  const creditos = existsSync(rutaCreditos) ? JSON.parse(readFileSync(rutaCreditos, "utf8")) : { aviso: "", imagenes: {} };
  creditos.aviso = "Los nombres y logos de las marcas son marcas registradas de sus respectivos dueños y se muestran solo para indicar qué equipos repara el taller. Imágenes obtenidas de Wikimedia Commons con las licencias indicadas.";
  let ok = 0;
  for (const marca of marcas) {
    try {
      const c = await buscarMarca(marca);
      if (!c) { console.log(`· ${marca}: no encontré un archivo con licencia libre en Commons (queda el monograma)`); continue; }
      const png = await descargar(c.thumb || c.original);
      if (!(png.length > 200 && png[0] === 0x89 && png[1] === 0x50)) throw new Error("la descarga no es un PNG");
      writeFileSync(join(DESTINO, slugMarca(marca) + ".png"), png);
      creditos.imagenes[marca] = { archivo: slugMarca(marca) + ".png", titulo: c.titulo.replace(/^File:/, ""), fuente: c.pagina, licencia: c.licencia, licenciaUrl: c.licenciaUrl, autor: c.autor, credito: c.credito, descargado: new Date().toISOString().slice(0, 10) };
      ok++;
      console.log(`✓ ${marca}: ${c.titulo} · ${c.licencia}`);
    } catch (e) { console.warn(`✗ ${marca}: ${e.message}`); }
    await dormir(400);
  }
  writeFileSync(rutaCreditos, JSON.stringify(creditos, null, 2));
  console.log(`\n${ok}/${marcas.length} imágenes en ${DESTINO}. Créditos en creditos.json.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(e => { console.error(e); process.exit(1); });

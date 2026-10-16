#!/usr/bin/env node
// Empaqueta www/ en un solo archivo HTML (dist/celufacil.html) para probar o compartir la versión web.
//   node scripts/bundle.mjs          → sin datos de ejemplo
//   node scripts/bundle.mjs --demo   → con precios de Mercado Libre de ejemplo (solo para mostrar la interfaz)
//   node scripts/bundle.mjs --real   → con los precios reales de www/precios-ml.json y las imágenes de marcas incrustadas
// bundle({ bridge: true }) incluye además native/bridge.js (lo usan los tests del envoltorio nativo).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WWW = join(ROOT, "www");
const leer = f => readFileSync(join(WWW, f), "utf8");

export function datosDemo() {
  // Generador determinista de precios de ejemplo (misma forma que produce scripts/actualizar-precios.mjs)
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const base = { modulo: { baja: [18000, 26000, 38000], media: [35000, 65000, 110000], alta: [90000, 160000, 280000], iphone: [45000, 95000, 170000] }, bateria: { baja: [12000, 16000, 22000], media: [15000, 22000, 32000], alta: [22000, 35000, 55000], iphone: [18000, 28000, 45000] }, pin: { baja: [5000, 8500, 13000], media: [8000, 13000, 20000], alta: [15000, 25000, 42000], iphone: [14000, 24000, 40000] }, camara: { baja: [9000, 14000, 22000], media: [16000, 28000, 45000], alta: [40000, 75000, 130000], iphone: [35000, 70000, 140000] }, tapa: { baja: [6000, 10000, 15000], media: [10000, 18000, 28000], alta: [25000, 45000, 75000], iphone: [20000, 40000, 80000] }, flexpower: { baja: [3500, 5500, 8500], media: [5000, 8000, 12000], alta: [9000, 14000, 22000], iphone: [10000, 16000, 26000] } };
  const nombre = { modulo: "Módulo Pantalla Display", bateria: "Batería", pin: "Flex Pin De Carga", camara: "Cámara Trasera", tapa: "Tapa Trasera", flexpower: "Flex Botón Encendido" };
  const sufijo = { economico: "Incell Compatible", original: "Calidad Original Oled", premium: "Service Pack Original" };
  const modelos = [["Samsung", "Galaxy A05", "baja"], ["Samsung", "Galaxy A15", "baja"], ["Samsung", "Galaxy A14", "baja"], ["Samsung", "Galaxy A54", "media"], ["Motorola", "Moto G23", "baja"], ["Motorola", "Moto G14", "baja"], ["Motorola", "Moto G54", "media"], ["Xiaomi", "Redmi 13C", "baja"], ["Xiaomi", "Redmi Note 13", "media"], ["iPhone", "iPhone 11", "iphone"], ["iPhone", "iPhone 13", "iphone"]];
  const ahora = new Date().toISOString(); const out = { actualizado: ahora, demo: true, fuente: "datos de ejemplo", precios: {} };
  const slug = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, "-");
  for (const [marca, mod, g] of modelos) for (const [parte, b] of Object.entries(base)) {
    const url = "https://listado.mercadolibre.com.ar/" + slug(`${nombre[parte]} ${marca === "iPhone" ? "" : marca} ${mod}`);
    const niveles = {};
    ["economico", "original", "premium"].forEach((k, idx) => { const p = Math.round(b[g][idx] * (0.85 + rnd() * 0.3) / 100) * 100; niveles[k] = { p, env: rnd() > 0.4, t: `${nombre[parte]} ${marca === "iPhone" ? "" : marca + " "}${mod} ${sufijo[k]}`, u: url, img: "", v: Math.floor(rnd() * 300), n: 2 + Math.floor(rnd() * 8) }; });
    const n = niveles.economico.n + niveles.original.n + niveles.premium.n;
    out.precios[`${parte}|${marca}|${mod}`] = { n, min: niveles.economico.p, mediana: niveles.original.p, max: niveles.premium.p, niveles, f: ahora };
  }
  return out;
}

// Versión de un solo archivo con los datos reales: precios-ml.json, imágenes de marcas y créditos incrustados
function datosReales() {
  const ruta = join(WWW, "precios-ml.json");
  const precios = existsSync(ruta) ? JSON.parse(readFileSync(ruta, "utf8")) : null;
  const logos = {}; const dir = join(WWW, "marcas");
  if (existsSync(dir)) for (const f of readdirSync(dir)) if (f.endsWith(".png")) logos[f.replace(/\.png$/, "")] = "data:image/png;base64," + readFileSync(join(dir, f)).toString("base64");
  const creditos = existsSync(join(dir, "creditos.json")) ? JSON.parse(readFileSync(join(dir, "creditos.json"), "utf8")) : null;
  const iconos = {}; const dirI = join(WWW, "iconos");
  if (existsSync(dirI)) for (const f of readdirSync(dirI)) if (f.endsWith(".png")) iconos[f.replace(/\.png$/, "")] = "data:image/png;base64," + readFileSync(join(dirI, f)).toString("base64");
  let s = "";
  if (precios && precios.actualizado) s += `const __DEMO_ML=${JSON.stringify(precios)};`;
  if (Object.keys(logos).length) s += `const __LOGOS=${JSON.stringify(logos)};`;
  if (Object.keys(iconos).length) s += `const __ICONOS=${JSON.stringify(iconos)};`;
  if (creditos) s += `const __CREDITOS=${JSON.stringify(creditos)};`;
  return s ? `<script>${s}</script>` : "";
}

export function bundle({ demo = false, real = false, fuentes = true, bridge = false } = {}) {
  let html = leer("index.html");
  let css = leer("style.css");
  if (fuentes) for (const w of [400, 600, 700]) {
    const b64 = readFileSync(join(WWW, "fonts", `nunito-latin-${w}-normal.woff2`)).toString("base64");
    css = css.replace(`url(fonts/nunito-latin-${w}-normal.woff2)`, () => `url(data:font/woff2;base64,${b64})`);
  }
  // Reemplazos con función: un string de reemplazo interpretaría "$$", "$&", etc. y rompería el código.
  const poner = (marca, texto) => { if (!html.includes(marca)) throw new Error("No encontré en index.html: " + marca); html = html.replace(marca, () => texto); };
  poner('<link rel="manifest" href="manifest.json">\n', "");
  poner('<link rel="stylesheet" href="style.css">', `<style>${css}</style>`);
  const demoScript = demo ? `<script>const __DEMO_ML=${JSON.stringify(datosDemo())};</script>` : real ? datosReales() : "";
  poner('<script src="data.js"></script>', `${demoScript}<script>${leer("data.js")}</script>`);
  poner('<script src="icons.js"></script>', `<script>${leer("icons.js")}</script>`);
  // bridge: true → puente Android (native/bridge.js); "desktop" → puente de escritorio (native/desktop-bridge.js)
  const puente = bridge ? `<script>${readFileSync(join(ROOT, "native", bridge === "desktop" ? "desktop-bridge.js" : "bridge.js"), "utf8")}</script>` : "";
  poner('<script src="app.js"></script>', `${puente}<script>${leer("app.js")}</script>`);
  return html;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const demo = process.argv.includes("--demo"), real = process.argv.includes("--real");
  mkdirSync(join(ROOT, "dist"), { recursive: true });
  const salida = join(ROOT, "dist", demo ? "celufacil-demo.html" : real ? "celufacil-real.html" : "celufacil.html");
  writeFileSync(salida, bundle({ demo, real }));
  console.log("Generado", salida);
}

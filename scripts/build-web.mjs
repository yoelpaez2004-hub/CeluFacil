// Arma la web para clientes en dist/web: junta web/ con lo que comparte con la app (data.js, precios de
// Mercado Libre, imágenes de marcas, íconos y tipografía). Lo usa el workflow "Publicar web" y `npm run web`.
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] || join(raiz, "dist", "web");
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });

cpSync(join(raiz, "web"), out, { recursive: true });
// URL pública (para og:image y canonical): https://<usuario>.github.io/<repo>/ a partir de REPO en www/data.js
const repo = (readFileSync(join(raiz, "www", "data.js"), "utf8").match(/const REPO = "([^"]+)"/) || [])[1] || "";
const [usuario, nombre] = repo.split("/");
const urlBase = usuario && nombre ? `https://${usuario.toLowerCase()}.github.io/${nombre}/` : "";
writeFileSync(join(out, "index.html"), readFileSync(join(out, "index.html"), "utf8").replaceAll("__URL_BASE__", urlBase));
for (const f of ["data.js", "icon-192.png", "icon-512.png"]) if (existsSync(join(raiz, "www", f))) cpSync(join(raiz, "www", f), join(out, f));
for (const d of ["marcas", "iconos", "fonts", "modelos"]) if (existsSync(join(raiz, "www", d))) cpSync(join(raiz, "www", d), join(out, d), { recursive: true, filter: s => !s.endsWith("LEEME.txt") });
// Precios de Mercado Libre: la web solo necesita el precio de cada nivel, no títulos, links ni alternativas (de ~900 KB a ~60 KB)
if (existsSync(join(raiz, "www", "precios-ml.json"))) {
  const ml = JSON.parse(readFileSync(join(raiz, "www", "precios-ml.json"), "utf8")); const precios = {};
  for (const [k, v] of Object.entries(ml.precios || {})) { const n = {}; for (const [niv, d] of Object.entries(v.niveles || {})) if (d && d.p > 0) n[niv] = { p: d.p }; if (Object.keys(n).length) precios[k] = { niveles: n }; }
  writeFileSync(join(out, "precios-ml.json"), JSON.stringify({ actualizado: ml.actualizado, precios }));
}
if (!existsSync(join(out, "modelos", "index.json"))) { mkdirSync(join(out, "modelos"), { recursive: true }); writeFileSync(join(out, "modelos", "index.json"), JSON.stringify({ modelos: {} })); }
writeFileSync(join(out, ".nojekyll"), "");
console.log("Web lista en", out);

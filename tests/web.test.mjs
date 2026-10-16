// Pruebas de la web para clientes (web/): arma dist/web, la abre en un navegador simulado y recorre el flujo
// marca → modelo → categoría → falla → precio. También verifica que el precio que ve el cliente sea el mismo
// que calcula la app del taller (mano de obra + repuesto con recargo) y que el mensaje de WhatsApp salga armado.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist", "web-test");
execFileSync(process.execPath, [join(ROOT, "scripts", "build-web.mjs"), OUT], { stdio: "ignore" });

let total = 0, ok = 0;
function prueba(nombre, fn) { total++; try { fn(); ok++; console.log(`✓ ${nombre}`); } catch (e) { console.log(`✗ ${nombre}\n    ${e.message}`); } }

function abrir({ whatsapp = "5491100000000", recargo = 20 } = {}) {
  let html = readFileSync(join(OUT, "index.html"), "utf8").replace(/<script src="[^"]+"><\/script>\s*/g, "");
  const dom = new JSDOM(html, { url: "https://yoelpaez2004-hub.github.io/CeluFacil/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  w.scrollTo = () => { }; w.HTMLElement.prototype.scrollIntoView = () => { }; w.fetch = () => Promise.resolve({ ok: false });
  let cfg = readFileSync(join(OUT, "config.js"), "utf8").replace(/whatsapp: "[^"]*"/, `whatsapp: "${whatsapp}"`).replace(/recargo: \d+/, `recargo: ${recargo}`);
  // Un solo eval: los const/let de un script quedan fuera del alcance de otro eval, igual que en pestañas <script> no
  w.eval([cfg, readFileSync(join(OUT, "data.js"), "utf8"), readFileSync(join(OUT, "site.js"), "utf8"), "window.FALLAS=FALLAS;window.TRABAJOS=TRABAJOS;window.REPUESTOS=REPUESTOS;window.MARCAS=MARCAS;"].join("\n;\n"));
  const $ = s => w.document.querySelector(s); const $$ = s => [...w.document.querySelectorAll(s)];
  const click = s => { const el = typeof s === "string" ? $(s) : s; assert.ok(el, `no existe ${s}`); el.dispatchEvent(new w.MouseEvent("click", { bubbles: true })); };
  const visible = id => !$(id).classList.contains("hidden");
  return { w, $, $$, click, visible };
}

prueba("el armado deja todo lo que la web necesita", () => {
  for (const f of ["index.html", "site.js", "site.css", "config.js", "data.js", "precios-ml.json", "modelos/index.json", "marcas/samsung.png", "iconos/pantalla.png", "fonts/nunito-latin-600-normal.woff2", ".nojekyll"]) assert.ok(existsSync(join(OUT, f)), `falta ${f}`);
  const ml = JSON.parse(readFileSync(join(OUT, "precios-ml.json"), "utf8"));
  const k = Object.keys(ml.precios)[0]; assert.ok(k && ml.precios[k].niveles, "precios recortados sin niveles");
  assert.ok(!JSON.stringify(ml).includes("mercadolibre.com"), "la versión web no debe traer links de publicaciones");
  assert.ok(readFileSync(join(OUT, "index.html"), "utf8").includes('og:image" content="https://'), "og:image debe ser absoluta");
});

prueba("arranca en el paso 1 con las 8 marcas principales y botones de WhatsApp armados", () => {
  const { $, $$, visible } = abrir();
  assert.equal($$("#brands .brand-btn").length, 8);
  assert.ok(visible("#p-marca") && !visible("#p-modelo"));
  assert.ok($("#top-wa").href.startsWith("https://wa.me/5491100000000?text="));
  assert.ok($("#fab").href.includes("wa.me") && visible("#fab"));
  assert.equal($("#brand-name").textContent, "SuperCell La Matanza");
});

prueba("sin WhatsApp cargado, los botones llevan al mapa y no queda nada vacío", () => {
  const { $, visible } = abrir({ whatsapp: "" });
  assert.ok($("#top-wa").href.includes("google.com/maps"));
  assert.ok(!visible("#fab") && !visible("#wa-donde"));
  assert.equal($("#top-wa").textContent.trim(), "Cómo llegar");
});

prueba("flujo completo: Samsung → Galaxy A05 → Pantalla → falla → precio igual al de la app", () => {
  const { w, $, $$, click, visible } = abrir();
  click('[data-m="Samsung"]');
  assert.ok(visible("#p-modelo")); assert.ok($$("#models [data-x]").length > 20);
  assert.equal($("#t-modelo").textContent, "¿Qué Samsung es?");
  click('[data-x="Galaxy A05"]');
  assert.ok(visible("#p-falla") && visible("#f-cats") && !visible("#f-list"));
  assert.equal($$("#cats .cat").length, 8, "las 8 categorías a la vista");
  click('.cat[data-c="pantalla"]');
  assert.ok(visible("#f-list") && !visible("#f-cats"), "se muestran las fallas de la categoría");
  assert.equal($$("#faults .fault").length, w.FALLAS.filter(f => f.cat === "pantalla").length);
  click("#back-cats"); assert.ok(visible("#f-cats"), "el botón atrás vuelve a las categorías");
  click('.cat[data-c="pantalla"]');
  const i = w.FALLAS.findIndex(f => f.sintoma.startsWith("Pantalla negra"));
  click(`#faults [data-i="${i}"]`);
  assert.ok(visible("#p-precio"));
  // mismo cálculo que la app: mano de obra (gama baja ×1) + repuesto de referencia "original" con 20% de recargo
  const mo = Math.round(w.TRABAJOS.modulo.mo / 500) * 500;
  const rep = Math.round(w.REPUESTOS.modulo.baja[1] * 1.2 / 500) * 500;
  const total = "$" + (mo + rep).toLocaleString("es-AR");
  assert.equal($("#result .tp").textContent, total);
  assert.equal($$("#result .level").length, 3); assert.ok($("#result .level.sel b").textContent.includes("Calidad original"));
  const wa = decodeURIComponent($("#result a.btn-wa").href);
  assert.ok(wa.includes("Samsung Galaxy A05") && wa.includes("Pantalla negra") && wa.includes(total), "mensaje de WhatsApp completo: " + wa);
});

prueba("cambiar el nivel de repuesto cambia el total; software no muestra niveles", () => {
  const { w, $, $$, click } = abrir();
  click('[data-m="Motorola"]'); click('[data-x="Moto G23"]'); click('.cat[data-c="bateria"]');
  const i = w.FALLAS.findIndex(f => f.sintoma === "La batería dura muy poco"); click(`#faults [data-i="${i}"]`);
  const antes = $("#result .tp").textContent; click('#result [data-n="premium"]');
  assert.notEqual($("#result .tp").textContent, antes); assert.ok($("#result .tl").textContent.includes("premium"));
  click("#otra-falla"); click('.cat[data-c="software"]');
  const j = w.FALLAS.findIndex(f => f.parte === "frp"); click(`#faults [data-i="${j}"]`);
  assert.equal($$("#result .level").length, 0); assert.ok($("#result .tm").textContent.includes("sin repuesto"));
});

prueba("iPhone: mano de obra con recargo y nombre sin repetir la marca", () => {
  const { w, $, click } = abrir();
  click('[data-m="iPhone"]'); click('[data-x="iPhone 13"]'); click('.cat[data-c="bateria"]');
  const i = w.FALLAS.findIndex(f => f.sintoma === "La batería dura muy poco"); click(`#faults [data-i="${i}"]`);
  assert.equal($("#result .res-eq").textContent, "iPhone 13");
  const mo = Math.round(w.TRABAJOS.bateria.mo * 1.3 * 1.25 / 500) * 500; // iPhone 13 es gama media
  assert.ok($("#result .tm").textContent.includes("$" + mo.toLocaleString("es-AR")), $("#result .tm").textContent);
});

prueba("buscar por síntoma, buscar modelo con Enter, y volver desde los pasos", () => {
  const { w, $, $$, click, visible } = abrir();
  click('[data-m="Xiaomi"]');
  const q = $("#q-modelo"); q.value = "13c"; q.dispatchEvent(new w.Event("input", { bubbles: true }));
  assert.equal($$("#models [data-x]").length, 1);
  q.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  assert.ok(visible("#p-falla") && $("#t-falla").textContent.includes("Redmi 13C"));
  const qf = $("#q-falla"); qf.value = "no carga"; qf.dispatchEvent(new w.Event("input", { bubbles: true }));
  assert.ok($$("#faults-search .fault").length >= 1 && $("#cats").classList.contains("hidden"));
  click('.step.done[data-step="1"]'); assert.ok(visible("#p-marca"), "tocar el paso 1 vuelve a las marcas");
});

prueba("'Lo que más arreglamos' recuerda la categoría y la abre después de elegir el equipo", () => {
  const { $, click, visible } = abrir();
  click('.svc[data-c="bateria"]'); assert.ok(visible("#p-marca"));
  click('[data-m="Samsung"]'); click('[data-x="Galaxy A14"]');
  assert.ok(visible("#f-list") && $("#cat-title").textContent.includes("Batería"));
});

prueba("accesibilidad básica: labels, foco al cambiar de paso, textos alternativos", () => {
  const { w, $, $$, click } = abrir();
  assert.ok($('label[for="q-modelo"]') && $('label[for="q-falla"]'));
  assert.ok($(".skip") && $("#result").getAttribute("aria-live") === "polite");
  click('[data-m="Samsung"]');
  assert.equal(w.document.activeElement, $("#p-modelo h2"), "el foco pasa al título del paso");
  for (const img of $$("img")) assert.ok(img.hasAttribute("alt"), "imagen sin alt: " + img.outerHTML.slice(0, 60));
  assert.ok($$(".step.done[role=button]").length === 1);
});

console.log(`\n${ok}/${total} pruebas de la web`);
if (ok !== total) process.exit(1);

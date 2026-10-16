// Pruebas de la app en un navegador simulado (jsdom). Correr con: npm test
import { JSDOM } from "jsdom";
import { bundle } from "../scripts/bundle.mjs";
import { clasificarNiveles, nivelPorTitulo, filtrar, extraerPublicaciones, urlListado } from "../scripts/actualizar-precios.mjs";
import { elegirCandidato, licenciaLibre } from "../scripts/descargar-logos.mjs";

let fallas = 0, total = 0;
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));
async function test(nombre, fn) { total++; try { await fn(); console.log("  ✓", nombre); } catch (e) { fallas++; console.log("  ✗", nombre, "→", e.message); } }
const assert = (cond, msg) => { if (!cond) throw new Error(msg || "aserción falló"); };
const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg || "esperado"}: ${JSON.stringify(b)} pero fue ${JSON.stringify(a)}`); };

function crearNavegador({ demo = false, capacitor = null, fetch = null, nativo = null, neutralino = null, preLocalStorage = null } = {}) {
  const abiertos = [], descargas = [];
  const dom = new JSDOM(bundle({ demo, fuentes: false, bridge: neutralino ? "desktop" : !!nativo }), {
    runScripts: "dangerously", pretendToBeVisual: true, url: "https://localhost/index.html",
    beforeParse(w) {
      w.scrollTo = () => { }; w.open = url => { abiertos.push(url); return null; };
      w.console.error = (...a) => console.log("    [console.error]", ...a);
      if (capacitor) w.Capacitor = capacitor;
      if (nativo) w.CeluNative = nativo;
      if (neutralino) { w.Neutralino = neutralino; w.NL_PATH = "C:\\Users\\Yoel\\Escritorio\\CeluFacil"; w.NL_OS = "Windows"; }
      if (fetch) w.fetch = fetch;
      if (preLocalStorage) for (const [k, v] of Object.entries(preLocalStorage)) w.localStorage.setItem(k, v);
    }
  });
  const w = dom.window, d = w.document;
  w.HTMLAnchorElement.prototype.click = function () { descargas.push(this.href); }; // jsdom no navega: capturamos las descargas
  // Diálogos propios: aceptar/cancelar
  const dlgOk = async () => { await tick(); const b = d.querySelector("#dlg-ok"); assert(!d.querySelector("#dlg").classList.contains("hidden"), "el diálogo no está abierto"); b.click(); await tick(); };
  const dlgCancel = async () => { await tick(); d.querySelector("#dlg-cancel").click(); await tick(); };
  return { w, d, abiertos, descargas, dlgOk, dlgCancel, ev: expr => w.eval(expr) };
}

console.log("Flujo principal");
{
  const { w, d, abiertos, descargas, dlgOk, dlgCancel, ev } = crearNavegador();
  await test("datos del taller por defecto: nombre y dirección", () => {
    eq(ev("cfg.nombre"), "SuperCell La Matanza"); eq(ev("cfg.direccion"), "Barragán Bastilla 6662"); eq(ev("cfg.localidad"), "La Matanza, Buenos Aires");
    assert(!d.querySelector("#crumbs").textContent.includes("La Matanza, Buenos Aires"), "la localidad no se muestra");
    assert(ev("mapsUrl()").includes(encodeURIComponent("Barragán Bastilla 6662, La Matanza, Buenos Aires")), "el mapa sí usa la localidad: " + ev("mapsUrl()"));
    eq(d.querySelector("#hero-taller").textContent, "SuperCell La Matanza", "el banner muestra solo el nombre");
    assert(d.querySelector("#crumbs").textContent.includes("Barragán Bastilla 6662"), "la dirección va en el encabezado");
  });
  await test("inicio renderiza marcas, categorías, populares e íconos", () => {
    eq(d.querySelectorAll("#marcas .brand").length, 8, "8 marcas principales");
    w.toggleMarcas(); eq(d.querySelectorAll("#marcas .brand").length, 16, "con Otras marcas: las 16"); assert(d.querySelector("#mas-marcas").textContent.includes("Menos"), "botón para plegar");
    w.toggleMarcas(); eq(d.querySelectorAll("#marcas .brand").length, 8);
    assert(d.querySelector("#marcas .brand .lg span").textContent.trim() === "S", "monograma visible mientras no hay imagen");
    assert(d.querySelector("#marcas .brand .lg img").getAttribute("src") === "marcas/samsung.png", "busca la imagen del proyecto");
    assert(d.querySelectorAll("#categorias .cat").length === 8, "8 categorías");
    assert(d.querySelectorAll("#populares .prod").length === 8, "8 populares");
    assert(d.querySelector("#search-ico svg path, #search-ico svg circle"), "ícono de búsqueda");
    assert(d.querySelectorAll(".tab").length === 5, "5 pestañas");
    assert(d.querySelectorAll(".tab svg").length === 5, "íconos en pestañas");
    assert(d.querySelector("#update-banner").classList.contains("hidden"), "sin banner de actualización");
  });
  await test("marca → modelos con filtro de gama", () => {
    w.abrirMarca("Samsung");
    eq(d.querySelector(".screen.active").dataset.screen, "modelos");
    const n = d.querySelectorAll("#modelos .ri").length; assert(n === 23, "23 modelos Samsung: " + n);
    ev("sel.gamaF='baja'; renderModelos()"); eq(d.querySelectorAll("#modelos .ri").length, 9, "9 de gama baja");
    assert(!d.querySelector("#back").classList.contains("hidden"), "botón volver visible");
  });
  await test("modelo → fallas con precio = mano de obra + repuesto con recargo", () => {
    w.abrirModelo("Galaxy A05");
    eq(d.querySelector(".screen.active").dataset.screen, "fallas");
    assert(d.querySelectorAll("#fallas .prod").length === 44, "44 fallas");
    // falla 0: módulo → MO 25000 (gama baja) + repuesto económico 18000 × 1.20 = 21600 → redondeo a 500 → 21500 → 46500 ("desde")
    eq(d.querySelector("#fallas .prod .price").firstChild.textContent, "$46.500");
    assert(d.querySelector("#crumbs").textContent.includes("Galaxy A05"), "migas con el modelo");
  });
  await test("búsqueda filtra por texto", () => {
    const q = d.querySelector("#q"); q.value = "no carga"; q.dispatchEvent(new w.Event("input"));
    const n = d.querySelectorAll("#fallas .prod").length; assert(n >= 1 && n < 44, "resultados filtrados: " + n);
    w.limpiarBusqueda(); eq(d.querySelectorAll("#fallas .prod").length, 44);
  });
  await test("detalle: repuesto, link a Mercado Libre y precio propio por modelo", () => {
    w.abrirDetalle(0);
    assert(d.querySelector("#detalle .rep"), "bloque de repuesto");
    const a = d.querySelector("#detalle .rep .ml"); assert(a, "link ML");
    eq(a.href, "https://listado.mercadolibre.com.ar/modulo-pantalla-samsung-galaxy-a05");
    // nivel por defecto "calidad original": 25000 + 26000×1.2 = 31200 → 31000 → 56000
    eq(d.querySelector("#detalle .price").firstChild.textContent, "$56.000", "precio detalle con nivel original");
    eq(d.querySelectorAll("#detalle .nivel").length, 3, "3 niveles"); assert(d.querySelector("#detalle .nivel.on small").textContent.includes("Calidad original"), "original seleccionado");
    w.setNivel("economico"); eq(d.querySelector("#detalle .price").firstChild.textContent, "$46.500", "económico");
    w.setNivel("premium"); eq(d.querySelector("#detalle .price").firstChild.textContent, "$70.500", "premium 38000×1.2=45600→45500");
    w.setNivel("original");
    w.setRep("modulo|Samsung|Galaxy A05", 30000); w.renderDetalle();
    // 25000 + 30000×1.2 = 61000
    eq(d.querySelector("#detalle .price").firstChild.textContent, "$61.000", "usa el precio propio");
    eq(ev("repCustom['modulo|Samsung|Galaxy A05']"), 30000, "guardado por modelo");
  });
  await test("falla sin repuesto (software) no muestra bloque de repuesto", () => {
    w.abrirDetalle(31); assert(!d.querySelector("#detalle .rep"), "sin bloque"); assert(d.querySelector("#detalle .price").textContent.includes("sin repuesto"), "texto");
    w.abrirDetalle(0);
  });
  await test("agregar al presupuesto → carrito con costo, venta y ganancia", async () => {
    const p = w.aPresupuesto(0); await p;
    eq(d.querySelector(".screen.active").dataset.screen, "carrito");
    eq(ev("pres.items.length"), 1); eq(ev("pres.items[0].costo"), 30000); eq(ev("pres.items[0].p"), 36000); eq(ev("pres.items[0].ref"), "tu precio");
    eq(d.querySelector("#t-total").textContent, "$61.000"); eq(d.querySelector("#t-gan").textContent, "$31.000");
    eq(d.querySelector("#cart-n").textContent, "2");
  });
  await test("cambiar costo con diálogo con campo", async () => {
    const p = w.cambiarCosto(0); await tick(); d.querySelector("#dlg-input").value = "28000"; d.querySelector("#dlg-ok").click(); await p;
    eq(ev("pres.items[0].costo"), 28000); eq(d.querySelector("#t-gan").textContent, "$33.000");
  });
  await test("agregar ítem manual calcula costo desde el recargo", () => {
    d.querySelector("#item-desc").value = "Vidrio templado"; d.querySelector("#item-precio").value = "6000"; w.agregarItem();
    eq(ev("pres.items.length"), 2); eq(ev("pres.items[1].costo"), 5000); eq(d.querySelector("#t-total").textContent, "$67.000");
  });
  await test("quitar ítem", () => { w.quitarItem(1); eq(ev("pres.items.length"), 1); });
  await test("vaciar: cancelar no borra, aceptar sí", async () => {
    let p = w.vaciarPresupuesto(); await dlgCancel(); await p; eq(ev("pres.items.length"), 1, "cancelar conserva");
    p = w.vaciarPresupuesto(); await dlgOk(); await p; eq(ev("pres.items.length"), 0, "aceptar vacía");
  });
  await test("reemplazar presupuesto de otro equipo pide confirmación", async () => {
    await w.aPresupuesto(0);
    ev("sel.marca='Motorola'; sel.modelo='Moto G23'; sel.gama='baja'");
    let p = w.aPresupuesto(6); await dlgCancel(); await p; eq(ev("pres.equipo"), "Samsung Galaxy A05", "cancelar mantiene");
    p = w.aPresupuesto(6); await dlgOk(); await p; eq(ev("pres.equipo"), "Motorola Moto G23", "aceptar reemplaza");
    eq(ev("pres.items[0].d"), "Batería (calidad original)"); eq(ev("pres.items[0].costo"), 16000); eq(ev("pres.items[0].ref"), "referencia");
  });
  await test("ingresar equipo abre la orden precargada y guarda", async () => {
    d.querySelector("#pres-sena").value = "5000"; w.calcTotales();
    w.crearOrdenDesdePresupuesto();
    assert(!d.querySelector("#modal").classList.contains("hidden"), "modal abierto");
    eq(d.querySelector("#o-marca").value, "Motorola"); eq(d.querySelector("#o-modelo").value, "Moto G23");
    assert(Number(d.querySelector("#o-total").value) > 0, "total precargado"); eq(d.querySelector("#o-sena").value, "5000");
    assert(Number(d.querySelector("#o-costo").value) > 0, "costo precargado");
    d.querySelector("#o-cliente").value = "Juan Pérez"; d.querySelector("#o-tel").value = "11 2345 6789";
    d.querySelector('#o-recibido .chip[data-c="Rayones"]').click(); d.querySelector('#o-recibido .chip[data-c="Con funda"]').click();
    await w.guardarOrden();
    eq(ev("ordenes.length"), 1); eq(ev("ordenes[0].estado"), "Recibido"); eq(ev("ordenes[0].recibido.join()"), "Rayones,Con funda");
    eq(ev("pres.items.length"), 0, "presupuesto vaciado"); eq(d.querySelector(".screen.active").dataset.screen, "ordenes");
    assert(d.querySelector("#ordenes .ord"), "orden en la lista");
  });
  await test("comprobante incluye checklist y WhatsApp normaliza el número", () => {
    const o = ev("ordenes[0]"); const txt = w.textoComprobante(o);
    assert(txt.includes("Rayones, Con funda") && txt.includes("Juan Pérez"), "texto del comprobante");
    w.enviarWhatsApp("011 2345-6789", "hola"); assert(abiertos.at(-1).startsWith("https://wa.me/5491123456789?text=hola"), "normaliza 011: " + abiertos.at(-1));
    w.enviarWhatsApp("+54 9 11 2345 6789", "x"); assert(abiertos.at(-1).startsWith("https://wa.me/5491123456789"), "normaliza +549");
  });
  await test("avanzar estado y mensajes por estado", async () => {
    const id = ev("ordenes[0].id");
    const p = w.avanzarEstado(id); await dlgCancel(); await p;             // Recibido → Diagnóstico (ofrece avisar)
    eq(ev("ordenes[0].estado"), "Diagnóstico");
    assert(w.mensajeEstado(ev("ordenes[0]")).includes("presupuesto total"), "mensaje de diagnóstico");
    await w.avanzarEstado(id); await w.avanzarEstado(id);                 // → Esperando repuesto → En reparación (sin diálogo)
    eq(ev("ordenes[0].estado"), "En reparación");
    const p2 = w.avanzarEstado(id); await dlgOk(); await p2;               // → Listo y avisa
    eq(ev("ordenes[0].estado"), "Listo"); assert(abiertos.at(-1).includes("wa.me/5491123456789"), "abrió WhatsApp al cliente");
    assert(decodeURIComponent(abiertos.at(-1)).includes("está listo"), "mensaje de listo");
    const p3 = w.avanzarEstado(id); await dlgCancel(); await p3;           // → Entregado
    eq(ev("ordenes[0].estado"), "Entregado"); assert(ev("!!ordenes[0].fechaEntrega"), "fecha de entrega");
  });
  await test("inicio muestra ganancia del mes y órdenes", () => {
    w.go("inicio"); const g = d.querySelector("#ganancia-mes").textContent; assert(g !== "$0", "ganancia: " + g);
    eq(d.querySelector("#ord-count").textContent, "0"); eq(d.querySelector("#listo-count").textContent, "0");
  });
  await test("fotos (versión web): guarda hasta 2 y las muestra", async () => {
    const id = ev("ordenes[0].id"); w.abrirOrden(id);
    const px = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=";
    await w.guardarFoto(px); await w.guardarFoto(px); await w.guardarFoto(px);
    eq(ev("fotosTmp.length"), 2, "máximo 2 en web"); await tick();
    eq(d.querySelectorAll("#o-fotos .foto img").length, 2); assert(d.querySelector("#o-fotos .foto img").src.startsWith("data:image/jpeg"), "src cargado");
    w.quitarFoto(0); eq(ev("fotosTmp.length"), 1);
    await w.guardarOrden(); eq(ev("ordenes[0].fotos.length"), 1);
    assert(d.querySelector("#ordenes .ord").textContent.includes("1"), "contador de fotos en la tarjeta");
  });
  await test("eliminar orden pide confirmación", async () => {
    const id = ev("ordenes[0].id"); w.abrirOrden(id);
    let p = w.eliminarOrden(); await dlgCancel(); await p; eq(ev("ordenes.length"), 1);
    w.abrirOrden(id); p = w.eliminarOrden(); await dlgOk(); await p; eq(ev("ordenes.length"), 0);
  });
  await test("imágenes de marcas: carga propia tiene prioridad y se puede quitar", async () => {
    w.go("ajustes"); eq(d.querySelectorAll("#logos .logo-row").length, 15);
    ev("logos.Samsung = 'data:image/png;base64,iVBORw0KGgo='; store.set('logos', logos)"); w.renderInicio();
    eq(d.querySelector("#marcas .brand .lg img").getAttribute("src"), "data:image/png;base64,iVBORw0KGgo=", "usa la imagen cargada");
    w.quitarLogo("Samsung"); w.renderInicio(); eq(d.querySelector("#marcas .brand .lg img").getAttribute("src"), "marcas/samsung.png");
  });
  await test("ajustes: mano de obra por tipo (23), cambio y restablecer", async () => {
    w.go("ajustes"); eq(d.querySelectorAll("#precios .pitem").length, 23);
    w.setPrecio("modulo", 30000); ev("sel.marca='Samsung'; sel.modelo='Galaxy A05'; sel.gama='baja'");
    eq(ev("calcMO(0,'Samsung','baja')"), 30000); eq(ev("calcMO(0,'Samsung','media')"), 39000); eq(ev("calcMO(0,'iPhone','baja')"), 37500);
    const p = w.restablecerPrecios(); await dlgOk(); await p; eq(ev("calcMO(0,'Samsung','baja')"), 25000);
  });
  await test("guardar config: recargo cambia el precio de venta; dirección en migas, presupuesto y WhatsApp", () => {
    d.querySelector("#cfg-recargo").value = "50"; d.querySelector("#cfg-nombre").value = "Taller Yoel"; d.querySelector("#cfg-direccion").value = "Barragán Bastilla 6662"; w.guardarConfig();
    eq(ev("cfg.recargo"), 50); eq(ev("precioVenta(10000)"), 15000); assert(d.querySelector("#crumbs").textContent.includes("Taller Yoel") && d.querySelector("#crumbs").textContent.includes("Barragán Bastilla 6662"), "nombre y dirección en migas");
    w.go("carrito"); assert(d.querySelector("#doc-tel").textContent.includes("Barragán Bastilla 6662"), "pie del presupuesto");
    const o = { id: 1, cliente: "Ana", tel: "", marca: "Samsung", modelo: "A05", falla: "x", total: 1000, sena: 0, estado: "Listo" };
    const m = w.mensajeEstado(o); assert(m.includes("por Barragán Bastilla 6662") && m.includes("google.com/maps"), "mensaje de listo con dirección y mapa: " + m);
    assert(w.textoComprobante(o).includes("📍 Barragán Bastilla 6662"), "comprobante con dirección");
    assert(ev("textoDiag(0)").includes("📍 Barragán Bastilla 6662"), "diagnóstico con dirección");
  });
  await test("exportar e importar respaldo (web)", async () => {
    await w.exportar(); eq(descargas.length, 1, "descarga el archivo"); assert(descargas[0].startsWith("data:application/json"), "JSON");
    const exportado = JSON.parse(decodeURIComponent(descargas[0].split(",")[1])); eq(exportado.v, 4); assert(Array.isArray(exportado.ordenes), "incluye órdenes"); assert(exportado.marcasExtra && exportado.exclusiones, "incluye marcas propias y publicaciones ocultas");
    const datos = JSON.stringify({ v: 3, cfg: { nombre: "Importado", gar: 15 }, precios: { bateria: 20000, zzz: 1 }, repCustom: {}, ordenes: [{ id: 7, fecha: new Date().toISOString(), cliente: "Ana", marca: "Xiaomi", modelo: "Redmi 13C", falla: "Batería", total: 30000, sena: 0, estado: "Recibido" }] });
    const archivo = new w.File([datos], "r.json", { type: "application/json" });
    w.importar({ target: { files: [archivo], value: "" } }); await tick(50);
    eq(ev("ordenes.length"), 1); eq(ev("cfg.nombre"), "Importado"); eq(ev("precios.bateria"), 20000); eq(ev("precios.zzz"), undefined, "descarta claves desconocidas");
    eq(ev("ordenes[0].fotos.length"), 0, "normaliza campos faltantes");
  });
  await test("volver y pestañas", () => {
    w.go("inicio"); w.abrirMarca("Xiaomi"); w.volver(); eq(d.querySelector(".screen.active").dataset.screen, "inicio");
    d.querySelectorAll(".tab")[2].onclick(); eq(d.querySelector(".screen.active").dataset.screen, "ordenes");
    d.querySelector(".lnk[onclick=\"go('buscar')\"]") || w.go("buscar"); w.go("buscar"); eq(d.querySelector("#fallas-title").textContent, "Todas las fallas");
  });
  await test("borrar todo pide confirmación y no borra al cancelar", async () => {
    const p = w.borrarTodo(); await dlgCancel(); await p; eq(ev("ordenes.length"), 1);
  });
}

console.log("Íconos");
{
  const { w, d } = crearNavegador();
  await test("todos los íconos usados existen (sin SVG vacíos)", () => {
    w.go("inicio"); w.abrirMarca("Samsung"); w.abrirModelo("Galaxy A05"); w.abrirDetalle(0); w.go("carrito"); w.go("ordenes"); w.nuevaOrden(); w.go("ajustes");
    const vacios = Array.from(d.querySelectorAll("svg.ico")).filter(s => !s.innerHTML.trim());
    eq(vacios.length, 0, "SVG vacíos");
  });
}

console.log("Precios de Mercado Libre (demo)");
{
  const { w, d, ev } = crearNavegador({ demo: true });
  await test("detalle muestra los 3 niveles reales de ML con envío y link, y usa el nivel elegido como costo", () => {
    ev("sel.marca='Samsung'; sel.modelo='Galaxy A05'; sel.gama='baja'; sel.nivel='original'"); w.abrirDetalle(0);
    assert(d.querySelector("#detalle .live"), "badge Mercado Libre");
    const nv = ev("mlData.precios['modulo|Samsung|Galaxy A05'].niveles"); const cards = d.querySelectorAll("#detalle .nivel"); eq(cards.length, 3);
    eq(cards[0].querySelector("b").textContent, ev(`fmt(${nv.economico.p})`)); eq(cards[1].querySelector("b").textContent, ev(`fmt(${nv.original.p})`)); eq(cards[2].querySelector("b").textContent, ev(`fmt(${nv.premium.p})`));
    for (let k = 0; k < 3; k++) { const key = ["economico", "original", "premium"][k]; const env = cards[k].querySelector(".env"); assert(env.classList.contains(nv[key].env ? "si" : "no"), "envío " + key); assert(cards[k].querySelector("a").href === nv[key].u, "link " + key); }
    eq(ev("repInfo(0,'Samsung','baja').costo"), nv.original.p, "costo = nivel original");
    w.setNivel("premium"); eq(ev("repInfo(0,'Samsung','baja').costo"), nv.premium.p, "costo = premium");
    assert(ev("textoDiag(0)").includes("Repuesto premium") && ev("textoDiag(0)").includes("Otras opciones"), "WhatsApp con nivel y alternativas");
  });
  await test("ajustes muestra el estado de la demo", () => { w.go("ajustes"); assert(d.querySelector("#ml-estado").textContent.includes("Demo"), d.querySelector("#ml-estado").textContent); });
  await test("compatibilidad con JSON viejo del robot (mediana/top)", () => {
    ev("mlData={actualizado:new Date().toISOString(),precios:{'bateria|Samsung|Galaxy A05':{n:5,min:11000,p25:12000,mediana:14000,p75:17000,max:20000,top:[{t:'Bateria A05',p:11000,u:'https://x/y',env:true}]}}}");
    ev("sel.nivel='economico'"); const r = ev("repInfo(6,'Samsung','baja')"); eq(r.niveles.economico.p, 11000); eq(r.niveles.economico.env, true); eq(r.niveles.original.p, 14000); eq(r.niveles.premium.p, 17000); eq(r.costo, 11000);
    w.abrirDetalle(6); assert(d.querySelectorAll("#detalle .nivel").length === 3, "renderiza");
  });
  await test("insumos (limpieza) muestran un solo precio", () => { ev("sel.nivel='premium'"); w.abrirDetalle(36); assert(!d.querySelector("#detalle .nivel"), "sin tarjetas"); eq(ev("repInfo(36,'Samsung','baja').costo"), 3000); });
}

console.log("Robot de precios: clasificación por nivel");
{
  await test("nivel por título", () => {
    eq(nivelPorTitulo("Modulo Samsung A05 Incell Compatible"), "economico"); eq(nivelPorTitulo("Modulo Samsung A05 Calidad Original"), "original");
    eq(nivelPorTitulo("Modulo A05 Service Pack Original Samsung"), "premium"); eq(nivelPorTitulo("Modulo A05 Original Premium"), "original");
    eq(nivelPorTitulo("Modulo Oled A54"), "original"); eq(nivelPorTitulo("Modulo A05 Original"), "original"); eq(nivelPorTitulo("Modulo A05 Negro"), null);
  });
  await test("clasifica, elige el más barato creíble por nivel y conserva envío gratis", () => {
    const env = e => ({ free_shipping: e });
    const r = clasificarNiveles([
      { title: "Modulo Samsung A05 Incell", price: 19000, shipping: env(false), permalink: "u1" },
      { title: "Modulo Samsung A05 Incell Tft", price: 20000, shipping: env(true), permalink: "u1b" },
      { title: "Modulo Samsung A05 Calidad Original Oled", price: 27000, shipping: env(true), permalink: "u2" },
      { title: "Modulo Samsung A05 Service Pack Samsung Original", price: 42000, shipping: env(true), permalink: "u3" },
      { title: "Modulo Samsung A05 A055", price: 23000, shipping: env(true), permalink: "u4" },
      { title: "Modulo Samsung A05", price: 3000, shipping: env(false), permalink: "sospechoso" }
    ]);
    eq(r.economico.p, 19000); eq(r.economico.env, false); eq(r.original.p, 23000, "sin palabra clave cae por precio en original"); eq(r.premium.p, 42000); eq(r.premium.u, "u3"); eq(r.premium.env, true);
    assert(r.economico.p <= r.original.p && r.original.p <= r.premium.p, "orden coherente");
  });
  await test("con pocas publicaciones no inventa niveles vacíos y reordena por precio", () => {
    const r = clasificarNiveles([{ title: "Modulo A05 Original", price: 30000, shipping: { free_shipping: true } }, { title: "Modulo A05 Incell", price: 35000, shipping: { free_shipping: false } }]);
    assert(r.economico && r.original && !r.premium, "dos niveles"); eq(r.economico.p, 30000, "el más barato pasa a económico aunque diga original");
  });
  await test("filtrar descarta celulares, fundas y modelos que no coinciden", () => {
    const res = filtrar([
      { title: "Modulo Samsung A05 Incell", price: 19000 }, { title: "Celular Samsung Galaxy A05 128gb Liberado", price: 250000 },
      { title: "Funda Samsung A05", price: 3000 }, { title: "Modulo Samsung A15", price: 22000 }, { title: "Vidrio Templado Samsung A05", price: 2000 }
    ], "modulo", "Samsung", "Galaxy A05");
    eq(res.length, 1); eq(res[0].price, 19000);
  });
}

{
  await test("filtrar distingue variantes: A05/A05s, Note 13/13C/Note 13 Pro, iPhone 15 Pro Max", () => {
    const f = (titulos, marca, modelo) => filtrar(titulos.map(t => ({ title: t, price: 20000 })), "modulo", marca, modelo).map(x => x.title);
    eq(f(["Modulo Samsung A05", "Modulo Samsung A05s", "Modulo Samsung Galaxy A05 Incell"], "Samsung", "Galaxy A05").join("|"), "Modulo Samsung A05|Modulo Samsung Galaxy A05 Incell");
    eq(f(["Modulo Xiaomi Redmi Note 13", "Modulo Xiaomi Redmi 13C", "Modulo Xiaomi Redmi Note 13 Pro", "Modulo Xiaomi Redmi 13"], "Xiaomi", "Redmi Note 13").join("|"), "Modulo Xiaomi Redmi Note 13");
    eq(f(["Modulo Xiaomi Redmi 13C", "Modulo Xiaomi Redmi Note 13"], "Xiaomi", "Redmi 13C").join("|"), "Modulo Xiaomi Redmi 13C");
    eq(f(["Modulo Iphone 15 Pro Max Incell", "Modulo Iphone 15 Pro", "Modulo Iphone 15"], "iPhone", "iPhone 15 Pro Max").join("|"), "Modulo Iphone 15 Pro Max Incell");
    eq(f(["Modulo Iphone 15 Pro Max", "Modulo Iphone 15 Oled", "Pantalla Iphone 15 Plus"], "iPhone", "iPhone 15").join("|"), "Modulo Iphone 15 Oled");
    eq(f(["Modulo Moto G24 Power", "Modulo Motorola Moto G24"], "Motorola", "Moto G24 Power").join("|"), "Modulo Moto G24 Power");
  });
  await test("filtrar exige que sea el repuesto pedido y el modelo como frase (no una tapa por un módulo, no 'iPhone 6s 12 Mp' por iPhone 12)", () => {
    const f = (parte, titulos, marca, modelo, precio = 20000) => filtrar(titulos.map(t => ({ title: t, price: precio })), parte, marca, modelo).map(x => x.title);
    eq(f("modulo", ["Tapa Carcasa Trasera Para Samsung A05", "Modulo Pantalla Para Samsung A05 Display Touch"], "Samsung", "Galaxy A05").join("|"), "Modulo Pantalla Para Samsung A05 Display Touch");
    eq(f("pin", ["Flex Moto G24 Power Encendido Y Volumen", "Repuesto Pin De Carga Para Moto G24 Power Lote X 5", "Placa Pin De Carga Para Motorola G24 Power"], "Motorola", "Moto G24 Power").join("|"), "Placa Pin De Carga Para Motorola G24 Power");
    eq(f("camara", ["Cámara Trasera Principal Compatible iPhone 6s 12 Mp", "Cámara Trasera Para iPhone 12 Oem", "Camara Frontal Para iPhone 12"], "iPhone", "iPhone 12").join("|"), "Cámara Trasera Para iPhone 12 Oem");
    eq(f("bateria", ["Cambio De Batería iPhone 13 En El Día", "Bateria Para iPhone 13 Certificada", "Batería Magsafe 5000mah Para iPhone 13 14"], "iPhone", "iPhone 13").join("|"), "Bateria Para iPhone 13 Certificada");
    eq(f("modulo", ["Modulo Xiaomi Note 13 Pro 5g", "Modulo Para Xiaomi 14 Ultra"], "Xiaomi", "Redmi Note 13 Pro").join("|"), "Modulo Xiaomi Note 13 Pro 5g");
    eq(f("tapa", ["Tapa Samsung Flip 5"], "Samsung", "Galaxy Z Flip 5").length, 1, "frase sin la letra de línea");
    eq(f("flexpower", ["Flex Pin De Carga Motorola G14", "Flex Para Moto G14 Encendido Y Volumen"], "Motorola", "Moto G14").join("|"), "Flex Para Moto G14 Encendido Y Volumen");
    eq(f("pin", ["Pin De Carga Para Samsung A14"], "Samsung", "Galaxy A14", 350000).length, 0, "precio imposible para un pin: es otro producto");
  });
}

console.log("Precios de Mercado Libre en la app: gana el archivo más nuevo");
{
  await test("el precios-ml.json incluido en el APK se usa aunque falle la descarga, y uno online más nuevo lo reemplaza", async () => {
    const incluido = { actualizado: "2026-10-16T18:00:00.000Z", fuente: "listado", precios: { "modulo|Samsung|Galaxy A05": { n: 3, min: 20000, mediana: 25000, max: 40000, niveles: { economico: { p: 20000, env: true, t: "Modulo A05 Incell", u: "", id: "", img: "", v: 0, n: 1 }, original: null, premium: null } } } };
    const online = { actualizado: "2026-10-17T06:00:00.000Z", fuente: "listado", precios: { "modulo|Samsung|Galaxy A05": { n: 5, min: 21000, mediana: 26000, max: 41000, niveles: { economico: { p: 21000, env: true, t: "Modulo A05 Incell", u: "", id: "", img: "", v: 0, n: 2 }, original: null, premium: null } } } };
    let respuestas = { "precios-ml.json": incluido, online: null };
    const fetchFalso = async (url) => { const j = String(url).startsWith("precios-ml.json") ? respuestas["precios-ml.json"] : respuestas.online; if (!j) throw new Error("sin red"); return { ok: true, json: async () => JSON.parse(JSON.stringify(j)) }; };
    const { w, d, ev } = crearNavegador({ fetch: fetchFalso });
    await w.cargarPreciosML();
    eq(ev("mlData.actualizado"), incluido.actualizado, "sin red: queda el incluido");
    assert(d.querySelector("#ml-estado").textContent.includes("1 precios exactos"), "estado: " + d.querySelector("#ml-estado").textContent);
    respuestas.online = online;
    await w.cargarPreciosML(true);
    eq(ev("mlData.actualizado"), online.actualizado, "online más nuevo gana");
    eq(JSON.parse(w.localStorage.getItem("cf_mldata")).actualizado, online.actualizado, "y se guarda");
    respuestas.online = { actualizado: "2026-10-01T00:00:00.000Z", precios: { x: {} } };
    await w.cargarPreciosML(true);
    eq(ev("mlData.actualizado"), online.actualizado, "uno online más viejo no pisa al guardado");
  });
}

console.log("Robot de precios: lectura de la página pública de Mercado Libre");
{
  await test("estado embebido clásico (results[])", () => {
    const estado = { pageState: { initialState: { results: [
      { id: "MLA1234567890", title: "Modulo Samsung A05 Incell", price: { amount: 19999, currency_id: "ARS" }, permalink: "https://articulo.mercadolibre.com.ar/MLA-1234567890-x", thumbnail: "http://http2.mlstatic.com/a.jpg", shipping: { free_shipping: true }, sold_quantity: 120 },
      { id: "MLA987654321", title: "Modulo Samsung A05 Calidad Original", price: 27500, permalink: "https://x/y", shipping: { free_shipping: false } } ] } } };
    const r = extraerPublicaciones('<html><script>window.__PRELOADED_STATE__ = ' + JSON.stringify(estado) + ';</script><body>"}</body></html>');
    eq(r.length, 2); eq(r[0].price, 19999); eq(r[0].shipping.free_shipping, true); eq(r[0].sold_quantity, 120); eq(r[1].price, 27500); eq(r[1].shipping.free_shipping, false);
  });
  await test("estado embebido con tarjetas polycard", () => {
    const pc = { results: [{ polycard: { metadata: { id: "MLA-555555555", url: "https://www.mercadolibre.com.ar/x/p/MLA555" }, components: [{ type: "title", title: { text: "Módulo A05 Service Pack" } }, { type: "price", price: { current_price: { value: 42000 } } }, { type: "shipping", shipping: { text: "Envío gratis" } }], pictures: [{ url: "https://img/1.jpg" }] } }] };
    const r = extraerPublicaciones("<script>window.__PRELOADED_STATE__ = " + JSON.stringify(pc) + ";</script>");
    eq(r.length, 1); eq(r[0].id, "MLA555555555"); eq(r[0].title, "Módulo A05 Service Pack"); eq(r[0].price, 42000); eq(r[0].shipping.free_shipping, true);
  });
  await test("HTML de tarjetas: toma el precio actual (no el tachado), envío gratis, link e id", () => {
    const html = '<ol><li class="ui-search-layout__item"><div class="poly-card"><img data-src="https://img/2.jpg"><h2><a class="poly-component__title" href="https://www.mercadolibre.com.ar/modulo-a05/p/MLA65696110#abc">Módulo Pantalla Compatible Samsung A05</a></h2><div class="poly-component__price"><s class="andes-money-amount--previous"><span class="andes-money-amount__fraction">25.999</span></s><div class="poly-price__current"><span class="andes-money-amount__fraction">21.499</span></div></div><p class="poly-component__shipping">Envío gratis</p></div></li><li class="ui-search-layout__item"><a class="poly-component__title" href="https://articulo.mercadolibre.com.ar/MLA-111222333-bat">Batería A05</a><div class="poly-price__current"><span class="andes-money-amount__fraction">15.000</span></div></li></ol>';
    const r = extraerPublicaciones(html);
    eq(r.length, 2); eq(r[0].price, 21499); eq(r[0].id, "MLA65696110"); eq(r[0].permalink, "https://www.mercadolibre.com.ar/modulo-a05/p/MLA65696110"); eq(r[0].shipping.free_shipping, true); eq(r[0].thumbnail, "https://img/2.jpg");
    eq(r[1].price, 15000); eq(r[1].shipping.free_shipping, false);
  });
  await test("página sin resultados o formato desconocido → lista vacía, sin inventar", () => { eq(extraerPublicaciones("<html><body>No hay publicaciones que coincidan</body></html>").length, 0); });
  await test("URL del listado ordenada por menor precio", () => { eq(urlListado("modulo pantalla Samsung Galaxy A05"), "https://listado.mercadolibre.com.ar/modulo-pantalla-samsung-galaxy-a05_OrderId_PRICE"); });
}

console.log("Descarga de imágenes de marcas (Wikimedia Commons)");
{
  const pag = (title, lic, extra = {}, copyrighted) => ({ title, imageinfo: [{ url: "https://upload.wikimedia.org/x/" + title, thumburl: "https://upload.wikimedia.org/thumb/" + title + "/320px.png", descriptionurl: "https://commons.wikimedia.org/wiki/" + title, extmetadata: { LicenseShortName: { value: lic }, Artist: { value: "<a href='x'>Samsung</a>" }, ...(copyrighted ? { Copyrighted: { value: copyrighted } } : {}), ...extra } }] });
  await test("acepta solo licencias libres", () => {
    assert(licenciaLibre({ LicenseShortName: { value: "Public domain" } }) && licenciaLibre({ LicenseShortName: { value: "CC BY-SA 4.0" } }) && licenciaLibre({ LicenseShortName: { value: "CC0" } }), "libres");
    assert(!licenciaLibre({ LicenseShortName: { value: "Fair use" } }) && !licenciaLibre({ LicenseShortName: { value: "Copyrighted" } }), "no libres");
  });
  await test("elige el logo actual de la marca, en SVG, y descarta páginas inexistentes o ajenas", () => {
    const c = elegirCandidato([{ title: "File:Samsung_Logo.svg", missing: true }, pag("File:Samsung_wordmark.svg", "Public domain"), pag("File:Samsung_logo_1993.svg", "Public domain"), pag("File:Samsung_Galaxy_Store_icon.svg", "Public domain"), pag("File:Motorola_logo.svg", "Public domain")], "Samsung");
    eq(c.titulo, "File:Samsung_wordmark.svg"); eq(c.autor, "Samsung"); eq(c.licencia, "Public domain"); assert(c.thumb.endsWith("320px.png"), "thumb PNG");
  });
  await test("iPhone acepta el logo de Apple; sin licencia libre no elige nada", () => {
    eq(elegirCandidato([pag("File:Apple_logo_black.svg", "Public domain")], "iPhone").titulo, "File:Apple_logo_black.svg");
    eq(elegirCandidato([pag("File:Huawei_logo.svg", "Fair use")], "Huawei"), null);
  });
}

{
  const fetchMock = async url => {
    if (String(url).includes("marcas/creditos.json")) return { ok: true, json: async () => ({ aviso: "Marcas registradas de sus dueños.", imagenes: { Samsung: { archivo: "samsung.png", titulo: "Samsung_wordmark.svg", fuente: "https://commons.wikimedia.org/wiki/File:Samsung_wordmark.svg", licencia: "Public domain", licenciaUrl: "", autor: "Samsung" } }, aviso_iconos: "Íconos de Font Awesome (CC BY 4.0).", iconos: { pantalla: { archivo: "pantalla.png", categoria: "Pantalla / Táctil", titulo: "Font Awesome 5 solid mobile-alt.svg", fuente: "https://commons.wikimedia.org/wiki/File:Font_Awesome_5_solid_mobile-alt.svg", licencia: "CC BY 4.0", licenciaUrl: "https://creativecommons.org/licenses/by/4.0", autor: "Font Awesome" } } }) };
    return { ok: false, status: 404 };
  };
  const { w, d } = crearNavegador({ fetch: fetchMock });
  await test("Ajustes muestra los créditos de imágenes con licencia y fuente", async () => {
    w.go("ajustes"); await tick(20);
    const c = d.querySelector("#creditos"); assert(c.textContent.includes("Samsung_wordmark.svg") && c.textContent.includes("Public domain") && c.textContent.includes("Marcas registradas"), c.textContent);
    assert(c.querySelector("a[href*='commons.wikimedia.org']"), "link a la fuente");
    assert(c.textContent.includes("Íconos de categorías") && c.textContent.includes("Font Awesome 5 solid mobile-alt.svg") && c.textContent.includes("CC BY 4.0"), "créditos de los íconos PNG");
    eq(d.querySelectorAll("#categorias .cico img[src='iconos/pantalla.png']").length, 1, "la categoría usa el PNG con el SVG de respaldo");
  });
}

console.log("Aviso de nueva versión");
{
  const fetchMock = async url => {
    if (String(url).includes("api.github.com")) return { ok: true, json: async () => ({ tag_name: "v9.9.0", html_url: "https://github.com/x/y/releases", assets: [{ name: "CeluFacil-9.9.0.apk", browser_download_url: "https://github.com/x/y/releases/download/v9.9.0/CeluFacil.apk" }] }) };
    return { ok: false, status: 404 };
  };
  const { w, d } = crearNavegador({ fetch: fetchMock });
  await test("muestra banner con enlace al APK cuando hay versión mayor", async () => {
    await tick(20);
    const b = d.querySelector("#update-banner"); assert(!b.classList.contains("hidden"), "banner visible");
    assert(b.textContent.includes("9.9.0"), "versión"); eq(b.querySelector("a").href, "https://github.com/x/y/releases/download/v9.9.0/CeluFacil.apk");
  });
  await test("comparación de versiones", () => {
    assert(w.versionMayor("2.1.0", "2.0.9") && w.versionMayor("v3.0.0", "2.9.9") && !w.versionMayor("2.0.0", "2.0.0") && !w.versionMayor("1.9", "2.0.0"), "semver");
  });
}

console.log("Respaldo con plugins nativos simulados");
{
  const archivos = {}; const compartidos = [];
  const Filesystem = {
    async writeFile({ path, data, directory }) { archivos[directory + "/" + path] = data; return { uri: "file:///" + directory + "/" + path }; },
    async readFile({ path, directory }) { const k = directory + "/" + path; if (!(k in archivos)) throw new Error("no existe"); return { data: archivos[k] }; },
    async deleteFile({ path, directory }) { delete archivos[directory + "/" + path]; }
  };
  const Share = { async share(o) { compartidos.push(o); } };
  const Camera = { async getPhoto() { return { dataUrl: "data:image/jpeg;base64,AAAA" }; } };
  const cap = { isNativePlatform: () => true, Plugins: { Filesystem, Share, Camera } };
  // Primer arranque: sin órdenes, pero con un respaldo previo en el teléfono
  archivos["DATA/CeluFacil/respaldo-ultimo.json"] = JSON.stringify({ v: 3, fecha: new Date().toISOString(), cfg: { nombre: "Taller restaurado" }, precios: {}, repCustom: {}, ordenes: [{ id: 3, fecha: new Date().toISOString(), cliente: "Luz", marca: "Samsung", modelo: "Galaxy A14", falla: "Módulo", total: 50000, sena: 10000, estado: "Listo" }] });
  const { w, d, dlgOk, ev } = crearNavegador({ capacitor: cap });
  await test("ofrece restaurar el respaldo encontrado y lo aplica", async () => {
    await tick(20); assert(!d.querySelector("#dlg").classList.contains("hidden"), "diálogo de restauración"); assert(d.querySelector("#dlg-msg").textContent.includes("1 órdenes"), "cuenta órdenes");
    await dlgOk(); await tick(); eq(ev("ordenes.length"), 1); eq(ev("cfg.nombre"), "Taller restaurado");
  });
  await test("respaldo automático escribe en DATA y EXTERNAL", async () => {
    await w.respaldar(); assert(archivos["DATA/CeluFacil/respaldo-ultimo.json"].includes("Luz"), "DATA"); assert(archivos["EXTERNAL/CeluFacil/respaldo-ultimo.json"], "EXTERNAL");
    w.go("ajustes"); assert(d.querySelector("#respaldo-estado").textContent.includes("Respaldo automático"), d.querySelector("#respaldo-estado").textContent);
  });
  await test("exportar comparte el archivo con el plugin Share", async () => {
    await w.exportar(); eq(compartidos.length, 1); assert(compartidos[0].url.includes("respaldo"), "url del archivo");
  });
  await test("fotos nativas se guardan como archivo y se borran con la orden", async () => {
    w.abrirOrden(3); await w.agregarFoto(); await w.agregarFoto(); await w.agregarFoto();
    eq(ev("fotosTmp.length"), 3, "sin límite de 2 en nativo"); assert(Object.keys(archivos).some(k => k.includes("/fotos/")), "archivo escrito");
    await w.guardarOrden(); eq(ev("ordenes[0].fotos.length"), 3); assert(ev("ordenes[0].fotos[0].f"), "guarda nombre de archivo, no base64");
    w.abrirOrden(3); const p = w.eliminarOrden(); await dlgOk(); await p; await tick(20);
    assert(!Object.keys(archivos).some(k => k.includes("/fotos/")), "fotos borradas");
  });
  await test("compartir usa el plugin Share en nativo", async () => { await w.compartir("hola"); eq(compartidos.at(-1).text, "hola"); });
}

console.log("Envoltorio nativo (APK directo): puente CeluNative simulado");
{
  // Simula el puente Java de native/MainActivity.java con la misma forma de respuestas JSON
  const archivos = {}, llamadas = [];
  const okJson = extra => JSON.stringify({ ok: true, ...extra });
  const nativo = {
    version: () => okJson({ version: "directo" }),
    atras: r => { llamadas.push(["atras", r]); },
    writeFile: (dir, ruta, datos, enc) => { llamadas.push(["writeFile", dir, ruta, enc]); archivos[dir + "/" + ruta] = { datos, enc }; return okJson({ uri: `celunative://${dir}/${ruta}` }); },
    readFile: (dir, ruta, enc) => { const f = archivos[dir + "/" + ruta]; if (!f) return JSON.stringify({ ok: false, error: "no existe" }); return okJson({ data: f.datos }); },
    deleteFile: (dir, ruta) => { delete archivos[dir + "/" + ruta]; return okJson({}); },
    share: (texto, titulo) => { llamadas.push(["share", texto, titulo]); return okJson({}); },
    shareFile: (dir, ruta, mime, titulo) => { llamadas.push(["shareFile", dir, ruta, mime, titulo]); return okJson({}); },
    openUrl: url => { llamadas.push(["openUrl", url]); return okJson({}); },
    toast: () => okJson({})
  };
  archivos["DATA/CeluFacil/respaldo-ultimo.json"] = { datos: JSON.stringify({ v: 3, fecha: new Date().toISOString(), cfg: { nombre: "Taller directo" }, precios: {}, repCustom: {}, ordenes: [{ id: 9, fecha: new Date().toISOString(), cliente: "Pía", tel: "1133334444", marca: "Motorola", modelo: "Moto G14", falla: "Batería", total: 40000, sena: 0, estado: "Recibido" }] }), enc: "utf8" };
  const { w, d, dlgOk, ev } = crearNavegador({ nativo });
  await test("la app se reconoce como nativa a través del puente", () => {
    assert(ev("esNativo") === true, "esNativo"); assert(ev("typeof Plugin('Filesystem').writeFile") === "function", "Filesystem"); assert(ev("Plugin('Camera')") === null, "sin Camera → usa el selector de archivos");
  });
  await test("al arrancar ofrece restaurar el respaldo guardado por el envoltorio", async () => {
    await tick(20); assert(!d.querySelector("#dlg").classList.contains("hidden"), "diálogo"); await dlgOk(); await tick();
    eq(ev("ordenes.length"), 1); eq(ev("cfg.nombre"), "Taller directo");
  });
  await test("el respaldo automático escribe en DATA y EXTERNAL en utf8", async () => {
    llamadas.length = 0; await w.respaldar();
    const w1 = llamadas.filter(l => l[0] === "writeFile"); assert(w1.some(l => l[1] === "DATA" && l[3] === "utf8"), "DATA utf8"); assert(w1.some(l => l[1] === "EXTERNAL"), "EXTERNAL");
    assert(JSON.parse(archivos["EXTERNAL/CeluFacil/respaldo-ultimo.json"].datos).ordenes.length === 1, "contenido");
  });
  await test("exportar comparte el archivo con shareFile (MediaStore en Android 10+)", async () => {
    llamadas.length = 0; await w.exportar();
    const sf = llamadas.find(l => l[0] === "shareFile"); assert(sf, "shareFile llamado"); eq(sf[1], "EXTERNAL"); assert(sf[2].startsWith("CeluFacil/celufacil-respaldo-"), sf[2]); eq(sf[3], "application/json");
  });
  await test("compartir texto y abrir WhatsApp usan share/openUrl", async () => {
    llamadas.length = 0; await w.compartir("hola"); eq(llamadas.at(-1)[0], "share"); eq(llamadas.at(-1)[1], "hola");
    w.enviarWhatsApp("11 3333 4444", "listo"); const o = llamadas.at(-1); eq(o[0], "openUrl"); assert(o[1].startsWith("https://wa.me/5491133334444?text=listo"), o[1]);
  });
  await test("las fotos se guardan como archivos base64 en DATA y se leen de vuelta", async () => {
    w.abrirOrden(9); await w.guardarFoto("data:image/jpeg;base64,QUJD"); await w.guardarFoto("data:image/jpeg;base64,REVG"); await w.guardarFoto("data:image/jpeg;base64,R0hJ");
    eq(ev("fotosTmp.length"), 3, "sin el límite web de 2"); const k = Object.keys(archivos).find(x => x.startsWith("DATA/CeluFacil/fotos/")); assert(k, "archivo de foto"); eq(archivos[k].enc, "base64"); eq(archivos[k].datos, "QUJD");
    await w.guardarOrden(); eq(ev("ordenes[0].fotos.length"), 3); assert(ev("ordenes[0].fotos[0].f"), "nombre de archivo");
    w.abrirOrden(9); await tick(); const src = await w.srcFoto(ev("ordenes[0].fotos[0]")); eq(src, "data:image/jpeg;base64,QUJD");
    const p = w.eliminarOrden(); await dlgOk(); await p; await tick(20); assert(!Object.keys(archivos).some(x => x.includes("/fotos/")), "fotos borradas");
  });
  await test("botón atrás: cierra diálogo/modal, vuelve de pantalla y en Inicio deja salir", () => {
    w.go("inicio"); eq(w.__atras(), "x", "en inicio sale");
    w.abrirMarca("Samsung"); eq(w.__atras(), "h", "vuelve"); eq(d.querySelector(".screen.active").dataset.screen, "inicio");
    w.nuevaOrden(); eq(w.__atras(), "h", "cierra modal"); assert(d.querySelector("#modal").classList.contains("hidden"), "modal cerrado");
    w.dialogo({ titulo: "x" }); eq(w.__atras(), "h", "cierra diálogo"); assert(d.querySelector("#dlg").classList.contains("hidden"), "diálogo cerrado");
  });
  await test("window.open va al puente (enlaces externos)", () => { llamadas.length = 0; w.abrirUrl("https://listado.mercadolibre.com.ar/x"); eq(llamadas.at(-1)[0], "openUrl"); });
}


console.log("Versión de escritorio (Windows): puente Neutralino");
{
  // Neutralino simulado: archivos en memoria, enlaces y portapapeles registrados
  const archivos = new Map(), abiertos = [], portapapeles = [], eventos = {};
  const neutralino = {
    init() { setTimeout(() => (eventos.ready || []).forEach(cb => cb()), 0); },
    events: { on(n, cb) { (eventos[n] = eventos[n] || []).push(cb); } },
    app: { exit() { } },
    filesystem: {
      async createDirectory(p) { archivos.set(p + "\\", "<dir>"); },
      async writeFile(p, d) { archivos.set(p, String(d)); }, async writeBinaryFile(p, b) { archivos.set(p, Buffer.from(b)); },
      async readFile(p) { if (!archivos.has(p)) throw new Error("NE_FS_FILRDER"); return archivos.get(p); },
      async readBinaryFile(p) { if (!archivos.has(p)) throw new Error("NE_FS_FILRDER"); const v = archivos.get(p); return Uint8Array.from(v).buffer; },
      async remove(p) { archivos.delete(p); }
    },
    os: { async open(u) { abiertos.push(u); } }, clipboard: { async writeText(t) { portapapeles.push(t); } }
  };
  const { w, d, ev } = crearNavegador({ neutralino });
  await test("la app se reconoce como Windows y escribe el respaldo en datos\\CeluFacil al lado del .exe", async () => {
    eq(ev("plataforma"), "windows"); eq(ev("esNativo"), true);
    if (typeof w.renderConfig === "function") { w.renderConfig(); assert(d.querySelector("#app-version").textContent.includes("Windows"), d.querySelector("#app-version").textContent); }
    await w.respaldar();
    assert(d.querySelector("#respaldo-estado").textContent.includes("datos\\CeluFacil") && !d.querySelector("#respaldo-estado").textContent.includes("Android"), d.querySelector("#respaldo-estado").textContent);
    const ruta = "C:\\Users\\Yoel\\Escritorio\\CeluFacil\\datos\\CeluFacil\\respaldo-ultimo.json";
    assert(archivos.has(ruta), "rutas: " + [...archivos.keys()].join(" | "));
    eq(JSON.parse(archivos.get(ruta)).cfg.nombre, "SuperCell La Matanza");
    assert(archivos.has("C:\\Users\\Yoel\\Escritorio\\CeluFacil\\datos\\CeluFacil\\"), "crea la carpeta");
  });
  await test("exportar guarda el archivo y abre la carpeta; WhatsApp y Mercado Libre se abren en el navegador del sistema", async () => {
    await w.exportar();
    assert([...archivos.keys()].some(k => /datos\\CeluFacil\\celufacil-respaldo-\d{4}-\d\d-\d\d\.json$/.test(k)), "archivo exportado");
    eq(abiertos[abiertos.length - 1], "C:\\Users\\Yoel\\Escritorio\\CeluFacil\\datos\\CeluFacil", "abre la carpeta");
    w.enviarWhatsApp("11 2345-6789", "Hola"); await tick();
    assert(abiertos[abiertos.length - 1].startsWith("https://wa.me/5491123456789?text=Hola"), "wa.me: " + abiertos[abiertos.length - 1]);
    await w.compartir("Presupuesto de prueba"); eq(portapapeles[portapapeles.length - 1], "Presupuesto de prueba", "sin teléfono va al portapapeles");
    w.abrirUrl("https://listado.mercadolibre.com.ar/modulo"); await tick(); eq(abiertos[abiertos.length - 1], "https://listado.mercadolibre.com.ar/modulo");
  });
  await test("el estado (localStorage) se espeja en datos\\estado.json y se restaura al abrir", async () => {
    w.eval('store.set("cfg", { ...cfg, nombre: "Taller Prueba" })');
    await tick(1700);
    const ruta = "C:\\Users\\Yoel\\Escritorio\\CeluFacil\\datos\\estado.json";
    assert(archivos.has(ruta), "estado.json escrito: " + [...archivos.keys()].filter(k => k.includes("estado")).join(","));
    eq(JSON.parse(JSON.parse(archivos.get(ruta)).cf_cfg).nombre, "Taller Prueba");
    w.localStorage.clear(); eq(w.localStorage.getItem("cf_cfg"), null);
    eq(await w.__estadoCF.restaurar(), true, "restaura cuando no hay nada");
    eq(JSON.parse(w.localStorage.getItem("cf_cfg")).nombre, "Taller Prueba");
  });
  await test("las fotos se guardan y se leen en base64 desde la carpeta datos", async () => {
    const Fs = w.Capacitor.Plugins.Filesystem;
    const b64 = Buffer.from("foto de prueba").toString("base64");
    const r = await Fs.writeFile({ path: "CeluFacil/fotos/orden-1.jpg", data: b64, directory: "DATA", encoding: "base64" });
    assert(r.uri.endsWith("datos\\CeluFacil\\fotos\\orden-1.jpg"), r.uri);
    eq((await Fs.readFile({ path: "CeluFacil/fotos/orden-1.jpg", directory: "DATA" })).data, b64);
    await Fs.deleteFile({ path: "CeluFacil/fotos/orden-1.jpg", directory: "DATA" });
    let fallo = false; try { await Fs.readFile({ path: "CeluFacil/fotos/orden-1.jpg", directory: "DATA" }); } catch { fallo = true; } assert(fallo, "borrada");
  });
}


console.log("Renovación 2.1: clientes, garantía, compras, avisos, modelos propios, imagen, exclusiones");
{
  const { w, d, ev, dlgOk, descargas } = crearNavegador();
  const orden = async (campos) => {
    w.nuevaOrden(campos); await tick();
    for (const [id, v] of Object.entries({ "o-cliente": campos.cliente || "", "o-tel": campos.tel || "", "o-marca": campos.marca || "", "o-modelo": campos.modelo || "", "o-falla": campos.falla || "", "o-total": campos.total || "", "o-costo": campos.costo || "" })) d.querySelector("#" + id).value = v;
    if (campos.estado) w.renderEstadoChips(campos.estado);
    await w.guardarOrden(); return ev("ordenes[ordenes.length-1]");
  };
  await test("garantía con fecha: al entregar queda la fecha y los días vigentes, y se ve en la tarjeta y en el WhatsApp", async () => {
    const o = await orden({ cliente: "Juan Pérez", tel: "11 2345-6789", marca: "Motorola", modelo: "Moto G14", falla: "Módulo", total: 50000, costo: 20000, estado: "Listo" });
    assert(o.fechaListo, "guarda cuándo quedó listo");
    const pa = w.avanzarEstado(o.id); await tick(); // Listo → Entregado (abre diálogo de aviso)
    if (!d.querySelector("#dlg").classList.contains("hidden")) w.dlgCancelar(); await pa;
    const e = ev("ordenes[0]"); eq(e.estado, "Entregado"); assert(e.fechaEntrega, "fecha de entrega"); eq(e.gar, 30, "días de garantía fijados");
    const hasta = w.garHasta(e); eq(Math.round((hasta - new Date(e.fechaEntrega)) / 864e5), 30); eq(w.garVigente(e), true);
    w.go("ordenes"); assert(d.querySelector("#ordenes .gar.si").textContent.includes("vigente hasta"), d.querySelector("#ordenes .gar").textContent);
    assert(w.mensajeEstado(e).includes("hasta el"), "mensaje con fecha");
    // vencida
    e.fechaEntrega = new Date(Date.now() - 40 * 864e5).toISOString(); eq(w.garVigente(e), false); w.renderOrdenes(); assert(d.querySelector("#ordenes .gar.no").textContent.includes("vencida"));
    e.fechaEntrega = new Date().toISOString(); ev('store.set("ordenes", ordenes)');
  });
  await test("clientes: se agrupan por WhatsApp aunque el número esté escrito distinto; ficha con historial y garantía", async () => {
    await orden({ cliente: "", tel: "+54 9 11 2345 6789", marca: "Samsung", modelo: "Galaxy A15", falla: "Batería", total: 40000, estado: "Recibido" });
    await orden({ cliente: "Ana López", tel: "11 9876 5432", marca: "Xiaomi", modelo: "Redmi 13C", falla: "Pin", total: 15000 });
    const cs = w.clientes(); eq(cs.length, 2, "dos clientes");
    const juan = cs.find(c => c.nombre === "Juan Pérez"); assert(juan, "Juan agrupado"); eq(juan.ordenes.length, 2, "sus dos órdenes"); eq(juan.abiertas, 1); eq(juan.garantias.length, 1, "garantía vigente"); eq(juan.total, 50000, "solo lo entregado");
    w.go("clientes"); eq(d.querySelectorAll("#clientes .ri").length, 2); assert(d.querySelector("#clientes .ri .opc.gar-on"), "marca de garantía");
    d.querySelector("#cli-q").value = "ana"; d.querySelector("#cli-q").dispatchEvent(new w.Event("input")); eq(d.querySelectorAll("#clientes .ri").length, 1);
    d.querySelector("#cli-q").value = "2345"; d.querySelector("#cli-q").dispatchEvent(new w.Event("input")); eq(d.querySelectorAll("#clientes .ri").length, 1, "búsqueda por teléfono");
    w.abrirCliente(juan.clave); eq(d.querySelector(".screen.active").dataset.screen, "cliente");
    assert(d.querySelector("#cliente-head h2").textContent === "Juan Pérez"); eq(d.querySelectorAll("#cliente-ordenes .ord").length, 2); assert(d.querySelector("#cliente-head .gar.si").textContent.includes("Moto G14"));
    // en el modal, el teléfono conocido completa el nombre y avisa la garantía
    w.nuevaOrden(); d.querySelector("#o-tel").value = "1123456789"; w.sugerirCliente();
    eq(d.querySelector("#o-cliente").value, "Juan Pérez", "autocompleta el nombre"); assert(d.querySelector("#o-cliente-info").textContent.includes("Garantía vigente"), d.querySelector("#o-cliente-info").textContent);
    w.cerrarModal();
  });
  await test("compras: los repuestos del presupuesto viajan a la orden y aparecen cuando espera repuesto", async () => {
    w.go("inicio"); w.abrirMarca("Samsung"); w.abrirModelo("Galaxy A05"); await w.aPresupuesto(0);
    eq(ev("pres.items.length"), 1);
    w.crearOrdenDesdePresupuesto(); await tick(); eq(ev("itemsTmp.length"), 1, "ítems en el modal");
    d.querySelector("#o-cliente").value = "Pedro"; d.querySelector("#o-tel").value = "11 5555 5555"; w.renderEstadoChips("Esperando repuesto"); await w.guardarOrden();
    const o = ev("ordenes[ordenes.length-1]"); eq(o.estado, "Esperando repuesto"); eq(o.items.length, 1); assert(o.items[0].d.includes("Módulo"), o.items[0].d);
    const c = w.listaCompras(); eq(c.pendientes, 1); eq(c.ordenes.length, 1); assert(c.costo > 0, "costo estimado");
    w.go("inicio"); assert(!d.querySelector("#compras-card").classList.contains("hidden"), "tarjeta de compras en Inicio"); assert(d.querySelector("#compras-card").textContent.includes("1 repuesto"));
    w.go("compras"); eq(d.querySelectorAll("#compras .compra-item").length, 1); assert(d.querySelector("#compras .compra-item a").href.includes("mercadolibre"), "link a ML");
    w.marcarComprado(o.id, 0, true); eq(ev("listaCompras().pendientes"), 0); assert(d.querySelector("#compras .btn.primary").textContent.includes("Llegó todo"));
    const pb = w.avanzarEstado(o.id); await tick(); if (!d.querySelector("#dlg").classList.contains("hidden")) w.dlgCancelar(); await pb;
    eq(ev("ordenes[ordenes.length-1].estado"), "En reparación"); eq(ev("listaCompras().ordenes.length"), 0);
  });
  await test("avisos en Inicio: listo sin retirar, sin diagnóstico, presupuesto sin respuesta", async () => {
    const hace = dias => new Date(Date.now() - dias * 864e5).toISOString();
    ev(`ordenes.push({ id: 90, fecha: "${hace(12)}", fechaListo: "${hace(9)}", estado: "Listo", cliente: "Lu", tel: "1144444444", marca: "iPhone", modelo: "iPhone 11", falla: "Batería", total: 60000, fotos: [], recibido: [] })`);
    ev(`ordenes.push({ id: 91, fecha: "${hace(3)}", estado: "Recibido", cliente: "Mario", marca: "LG", modelo: "K22", falla: "No carga", total: 0, fotos: [], recibido: [] })`);
    ev(`ordenes.push({ id: 92, fecha: "${hace(5)}", fechaEstado: "${hace(4)}", estado: "Diagnóstico", cliente: "Sofi", tel: "1133333333", marca: "Samsung", modelo: "Galaxy A14", falla: "Módulo", total: 45000, fotos: [], recibido: [] })`);
    ev('store.set("ordenes", ordenes)');
    const av = w.avisos(); eq(av.length, 3); eq(av[0].o.id, 90, "el más demorado primero"); assert(av[0].texto.includes("9 días") && av[0].texto.includes("listo"), av[0].texto); eq(av[0].accion, "Avisar");
    assert(av.find(a => a.o.id === 91).texto.includes("sin diagnóstico")); assert(av.find(a => a.o.id === 92).texto.includes("no respondió"));
    w.go("inicio"); eq(d.querySelectorAll("#avisos .aviso").length, 3); assert(!d.querySelector("#avisos").classList.contains("hidden"));
    ev("ordenes = ordenes.filter(o => o.id < 90)"); ev('store.set("ordenes", ordenes)'); w.go("inicio"); assert(d.querySelector("#avisos").classList.contains("hidden"), "sin demoras no se muestra");
  });
  await test("marcas y modelos propios: se agregan desde la lista de modelos, quedan en el respaldo y se pueden quitar", async () => {
    eq(w.agregarModelo("Samsung", "Galaxy A16", "media"), true); assert(ev("MARCAS.Samsung.media").includes("Galaxy A16"));
    eq(w.agregarModelo("Samsung", "galaxy a16", "baja"), false, "no duplica"); eq(w.gamaDe("Samsung", "Galaxy A16"), "media");
    w.abrirMarca("Samsung"); assert([...d.querySelectorAll("#modelos .ri .t")].some(e => e.textContent.includes("Galaxy A16") && e.querySelector(".opc")), "aparece como propio");
    const p = w.nuevaMarca(); await tick(); d.querySelector("#dlg-input").value = "Infinix"; await dlgOk(); await tick(); d.querySelector("#dlg-input").value = "Hot 30"; await dlgOk(); await p;
    assert(ev("MARCAS.Infinix") && ev("MARCAS.Infinix.baja").includes("Hot 30"), "marca nueva con su modelo");
    assert(w.listaMarcas().includes("Infinix") && w.listaMarcas()[w.listaMarcas().length - 1] === "Otro", "Otro queda al final");
    w.go("inicio"); w.toggleMarcas(); assert([...d.querySelectorAll("#marcas .brand small")].some(e => e.textContent === "Infinix"), "en Otras marcas"); w.toggleMarcas();
    eq(JSON.parse(w.localStorage.getItem("cf_marcas_extra")).Infinix.baja[0], "Hot 30");
    w.go("ajustes"); eq(d.querySelectorAll("#marcas-propias .pitem").length, 2);
    w.quitarModelo("Infinix", "Hot 30"); eq(ev("MARCAS.Infinix"), undefined, "la marca vacía desaparece"); w.quitarModelo("Samsung", "Galaxy A16"); assert(!ev("MARCAS.Samsung.media").includes("Galaxy A16"));
  });
  await test("el presupuesto se puede enviar como imagen (PNG)", async () => {
    w.HTMLCanvasElement.prototype.getContext = function () { return { fillRect() { }, fillText() { }, measureText: t => ({ width: t.length * 12 }), beginPath() { }, moveTo() { }, lineTo() { }, stroke() { }, font: "", fillStyle: "", strokeStyle: "", textAlign: "", lineWidth: 1 }; };
    w.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,iVBORw0KGgo=";
    w.go("inicio"); w.abrirMarca("Motorola"); w.abrirModelo("Moto G14"); await w.aPresupuesto(0); w.go("carrito");
    const antes = descargas.length; await w.compartirPresupuestoImagen();
    eq(descargas.length, antes + 1); assert(descargas[descargas.length - 1].startsWith("data:image/png"), "descarga PNG en la web");
  });
  await test("ocultar una publicación de ML: se usa la alternativa guardada y se cuenta en la nota", async () => {
    ev(`mlData = { actualizado: new Date().toISOString(), precios: { "modulo|Motorola|Moto G14": { n: 5, min: 20000, mediana: 25000, max: 40000, f: new Date().toISOString(), niveles: {
      economico: { p: 20000, env: true, t: "Modulo G14 incell", u: "https://x/1", id: "MLA1", img: "", v: 0, n: 2, alt: [{ p: 21500, env: false, t: "Modulo G14 otro", u: "https://x/2", id: "MLA2" }] },
      original: { p: 25000, env: true, t: "Modulo G14 oled", u: "https://x/3", id: "MLA3", img: "", v: 0, n: 2 }, premium: null } } } }`);
    w.abrirDetalle(0); let r = ev("repInfo(0, 'Motorola', 'baja')"); eq(r.niveles.economico.p, 20000); assert(d.querySelector("#detalle .nivel .nosirve"), "botón no sirve");
    w.ocultarPublicacion("MLA1"); r = ev("repInfo(0, 'Motorola', 'baja')"); eq(r.niveles.economico.p, 21500, "pasa a la alternativa"); eq(r.niveles.economico.id, "MLA2"); eq(r.ocultas, 1);
    assert(d.querySelector("#detalle .rep .note").textContent.includes("1 publicación oculta"));
    w.ocultarPublicacion("MLA2"); r = ev("repInfo(0, 'Motorola', 'baja')"); eq(r.niveles.economico.ref, true, "sin alternativas: referencia");
    w.go("ajustes"); assert(d.querySelector("#excl-estado").textContent.includes("2 publicaciones ocultas"));
    w.restaurarPublicaciones(); eq(ev("exclusiones.ids.length"), 0);
  });
}
{
  await test("el ajuste global de mano de obra desaparece y queda aplicado en los precios por trabajo", async () => {
    const { w, ev } = crearNavegador({ preLocalStorage: { cf_cfg: JSON.stringify({ nombre: "T", ajuste: 20 }), cf_precios: JSON.stringify({ bateria: 10000 }) } });
    eq(ev("cfg.ajuste"), undefined); eq(ev("precios.bateria"), 12000, "override con +20%"); eq(ev("precios.modulo"), Math.round(ev("TRABAJOS.modulo.mo") * 1.2), "base con +20%");
    eq(JSON.parse(w.localStorage.getItem("cf_cfg")).ajuste, undefined, "migración guardada");
  });
}

console.log(`\n${total - fallas}/${total} pruebas pasaron`);
process.exit(fallas ? 1 : 0);

// Puente entre la web app y el envoltorio de escritorio (Neutralinojs → CeluFacil.exe en Windows).
// Expone window.Capacitor con los plugins Filesystem y Share sobre la API de Neutralino, para que app.js
// funcione igual que en el APK. Solo se incluye en el ejecutable que arma scripts/build-exe.sh.
//
// Datos: carpeta "datos" al lado de CeluFacil.exe (respaldos, fotos). Si la app está en una carpeta protegida
// (Archivos de programa) no se puede escribir ahí: conviene tenerla en Documentos o en el Escritorio.
(function () {
  "use strict";
  var N = window.Neutralino;
  if (!N) return;

  var listo = new Promise(function (res) { N.events.on("ready", function () { res(); }); });
  try { N.init(); } catch (e) { }
  // Cerrar la ventana cierra la app (por si exitProcessOnClose no está disponible)
  N.events.on("windowClose", function () { try { N.app.exit(); } catch (e) { } });

  var SEP = (typeof NL_OS !== "undefined" && NL_OS === "Windows") ? "\\" : "/";
  var BASE = (typeof NL_PATH !== "undefined" ? NL_PATH : ".") + SEP + "datos";
  function ruta(dir, p) {
    var carpeta = dir === "CACHE" ? BASE + SEP + "tmp" : BASE; // DATA y EXTERNAL van a la misma carpeta "datos"
    return carpeta + SEP + String(p || "").replace(/^\/+/, "").split("/").join(SEP);
  }
  async function crearCarpetas(rutaArchivo) {
    var partes = rutaArchivo.split(SEP); partes.pop();
    var acum = "";
    for (var i = 0; i < partes.length; i++) {
      acum = i === 0 ? partes[0] : acum + SEP + partes[i];
      if (!acum || /^[A-Za-z]:$/.test(acum)) continue;
      try { await N.filesystem.createDirectory(acum); } catch (e) { }
    }
  }
  function b64aBytes(b64) { var bin = atob(String(b64 || "").replace(/\s/g, "")); var out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out.buffer; }
  function bytesAb64(buf) { var bytes = new Uint8Array(buf), bin = ""; for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); }
  function avisar(msg) { if (typeof window.toast === "function") window.toast(msg); }

  var Filesystem = {
    writeFile: async function (o) {
      await listo;
      var r = ruta(o.directory, o.path);
      await crearCarpetas(r);
      if (o.encoding === "utf8") await N.filesystem.writeFile(r, o.data == null ? "" : String(o.data));
      else await N.filesystem.writeBinaryFile(r, b64aBytes(o.data));
      return { uri: r };
    },
    readFile: async function (o) {
      await listo;
      var r = ruta(o.directory, o.path);
      if (o.encoding === "utf8") return { data: await N.filesystem.readFile(r) };
      return { data: bytesAb64(await N.filesystem.readBinaryFile(r)) };
    },
    deleteFile: async function (o) {
      await listo;
      var r = ruta(o.directory, o.path);
      if (N.filesystem.remove) await N.filesystem.remove(r); else await N.filesystem.removeFile(r);
    }
  };

  var Share = {
    // Un archivo: se abre la carpeta donde quedó (el usuario lo manda por Drive/WhatsApp Web). Un texto: al portapapeles.
    share: async function (o) {
      await listo; o = o || {};
      if (o.url && !/^https?:/i.test(o.url)) {
        if (/\.(png|jpe?g)$/i.test(o.url)) { try { await N.os.open(String(o.url)); } catch (e) { } avisar("Imagen guardada en datos\\CeluFacil\\presupuestos"); return; }
        var carpeta = String(o.url).split(SEP); carpeta.pop();
        try { await N.os.open(carpeta.join(SEP)); } catch (e) { }
        avisar("Respaldo guardado en la carpeta datos\\CeluFacil (se abrió la carpeta)");
        return;
      }
      var texto = o.text || o.url || "";
      try { await N.clipboard.writeText(texto); avisar("Texto copiado: pegalo en WhatsApp"); } catch (e) { }
    }
  };

  window.Capacitor = {
    isNativePlatform: function () { return true; },
    getPlatform: function () { return "windows"; },
    Plugins: { Filesystem: Filesystem, Share: Share }
  };

  // ---- Estado de la app (localStorage) espejado en datos/estado.json ----
  // Neutralino abre la app en un puerto local distinto cada vez y el navegador guarda localStorage por puerto: sin esto,
  // cada apertura arrancaría de cero. Se restaura antes de cargar app.js y se vuelve a escribir en cada cambio.
  var ESTADO = BASE + SEP + "estado.json";
  var timerEstado = null;
  async function guardarEstado() {
    try {
      await listo;
      var obj = {};
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf("cf_") === 0) obj[k] = localStorage.getItem(k); }
      await crearCarpetas(ESTADO);
      await N.filesystem.writeFile(ESTADO, JSON.stringify(obj));
    } catch (e) { }
  }
  function programarGuardado() { clearTimeout(timerEstado); timerEstado = setTimeout(guardarEstado, 1500); }
  async function restaurarEstado() {
    try {
      await listo;
      var obj = JSON.parse((await N.filesystem.readFile(ESTADO)) || "{}");
      var vacio = !localStorage.getItem("cf_ordenes") && !localStorage.getItem("cf_cfg");
      if (vacio) for (var k in obj) if (k.indexOf("cf_") === 0) localStorage.setItem(k, obj[k]);
      return vacio;
    } catch (e) { return false; }
  }
  var setOriginal = Storage.prototype.setItem, removeOriginal = Storage.prototype.removeItem, clearOriginal = Storage.prototype.clear;
  Storage.prototype.setItem = function (k, v) { setOriginal.call(this, k, v); if (this === window.localStorage && String(k).indexOf("cf_") === 0) programarGuardado(); };
  Storage.prototype.removeItem = function (k) { removeOriginal.call(this, k); if (this === window.localStorage && String(k).indexOf("cf_") === 0) programarGuardado(); };
  Storage.prototype.clear = function () { clearOriginal.call(this); if (this === window.localStorage) programarGuardado(); };
  window.__estadoCF = { guardar: guardarEstado, restaurar: restaurarEstado };
  // En el .exe, app.js no está en el HTML: se carga acá, después de restaurar el estado
  if (window.__CARGAR_APP) {
    var cargado = false;
    var cargarApp = function () { if (cargado) return; cargado = true; var s = document.createElement("script"); s.src = window.__CARGAR_APP; document.body.appendChild(s); };
    restaurarEstado().then(cargarApp, cargarApp);
    setTimeout(cargarApp, 4000); // por si el runtime nunca avisa "ready": la app abre igual
  }

  // Enlaces externos (WhatsApp, Mercado Libre, GitHub, Google Maps) → navegador del sistema
  window.open = function (url) { if (url) listo.then(function () { return N.os.open(String(url)); }).catch(function () { }); return null; };
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
    if (a && /^https?:/i.test(a.getAttribute("href") || "")) { ev.preventDefault(); window.open(a.href); }
  }, true);
})();

// Puente entre la web app y el envoltorio nativo (native/MainActivity.java).
// Expone window.Capacitor con los plugins Filesystem y Share sobre window.CeluNative, para que app.js
// funcione igual que con Capacitor. Solo se incluye en el APK compilado con scripts/build-apk-directo.sh.
(function () {
  "use strict";
  var N = window.CeluNative;
  if (!N) return;

  function parse(s) {
    var r;
    try { r = JSON.parse(s || "{}"); } catch (e) { throw new Error("respuesta nativa inválida"); }
    if (!r.ok) throw new Error(r.error || "error nativo");
    return r;
  }
  function dir(d) { return d === "EXTERNAL" || d === "CACHE" ? d : "DATA"; }

  var Filesystem = {
    writeFile: function (o) {
      return new Promise(function (res, rej) {
        try { var r = parse(N.writeFile(dir(o.directory), o.path, o.data == null ? "" : String(o.data), o.encoding === "utf8" ? "utf8" : "base64")); res({ uri: r.uri }); } catch (e) { rej(e); }
      });
    },
    readFile: function (o) {
      return new Promise(function (res, rej) {
        try { var r = parse(N.readFile(dir(o.directory), o.path, o.encoding === "utf8" ? "utf8" : "base64")); res({ data: r.data }); } catch (e) { rej(e); }
      });
    },
    deleteFile: function (o) {
      return new Promise(function (res, rej) {
        try { parse(N.deleteFile(dir(o.directory), o.path)); res(); } catch (e) { rej(e); }
      });
    }
  };

  var Share = {
    share: function (o) {
      return new Promise(function (res, rej) {
        try {
          o = o || {};
          var titulo = o.dialogTitle || o.title || "Compartir";
          if (o.url && o.url.indexOf("celunative://") === 0) {
            var resto = o.url.slice("celunative://".length), i = resto.indexOf("/");
            var ruta = resto.slice(i + 1), ext = (ruta.split(".").pop() || "").toLowerCase();
            var mime = o.mime || (ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/json");
            parse(N.shareFile(resto.slice(0, i), ruta, mime, titulo));
          } else {
            parse(N.share(o.text || o.url || "", titulo));
          }
          res();
        } catch (e) { rej(e); }
      });
    }
  };

  window.Capacitor = {
    isNativePlatform: function () { return true; },
    getPlatform: function () { return "android"; },
    Plugins: { Filesystem: Filesystem, Share: Share }
  };

  // window.open → intent externo (WhatsApp, Mercado Libre, GitHub)
  window.open = function (url) { if (url) { try { N.openUrl(String(url)); } catch (e) { } } return null; };

  // Botón atrás de Android: lo consulta MainActivity.onBackPressed
  window.__atras = function () {
    try {
      var d = document.getElementById("dlg"), m = document.getElementById("modal");
      if (d && !d.classList.contains("hidden")) { if (typeof dlgCancelar === "function") dlgCancelar(); return "h"; }
      if (m && !m.classList.contains("hidden")) { if (typeof cerrarModal === "function") cerrarModal(); return "h"; }
      var s = document.querySelector(".screen.active");
      if (s && s.getAttribute("data-screen") !== "inicio") { if (typeof volver === "function") volver(); return "h"; }
    } catch (e) { }
    return "x";
  };
})();

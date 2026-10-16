package ar.com.celufacil.app;

// Envoltorio nativo liviano de Celu Fácil (Java puro, sin AndroidX ni Capacitor).
// Sirve la web app desde https://localhost (mismo origen que usa Capacitor, así los datos se conservan si
// después se instala la versión compilada en GitHub) y expone un puente "CeluNative" para respaldo, compartir y abrir enlaces.
//
// Estilo deliberado: sin clases anónimas, sin lambdas, sin clases internas privadas y sin genéricos en firmas.
// El dexer d8 que trae bundletool (usado por scripts/build-apk-directo.sh) no acepta esas construcciones cuando
// el código viene de un javac moderno.

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {

    static final String ORIGEN = "https://localhost";
    static final int REQ_ARCHIVO = 1001;

    WebView web;
    ValueCallback callbackArchivo;      // ValueCallback<Uri[]> (sin genéricos a propósito)
    Uri fotoPendiente;                  // foto tomada con la cámara (fila de MediaStore) mientras el selector está abierto
    boolean paginaCargada = false;
    boolean atrasRespondido = false;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        getWindow().setStatusBarColor(0xFF0F7D86);

        web = new WebView(this);
        web.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        web.setBackgroundColor(0xFFEEF3F3);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);

        web.addJavascriptInterface(new Puente(this), "CeluNative");
        web.setWebViewClient(new Cliente(this));
        web.setWebChromeClient(new Chrome(this));
        setContentView(web);

        if (estado == null) web.loadUrl(ORIGEN + "/index.html");
        else web.restoreState(estado);
    }

    @Override
    protected void onSaveInstanceState(Bundle salida) {
        super.onSaveInstanceState(salida);
        web.saveState(salida);
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }

    // Botón atrás: se lo pregunta a la app (cierra diálogos, vuelve de pantalla). Si está en Inicio, o la página
    // no respondió a tiempo, se cierra la app.
    @Override
    public void onBackPressed() {
        if (web == null || !paginaCargada) { finish(); return; }
        atrasRespondido = false;
        web.evaluateJavascript("(function(){var r='x';try{r=typeof window.__atras==='function'?window.__atras():'x'}catch(e){}CeluNative.atras(r);})()", null);
        web.postDelayed(new SalirSiNoRespondio(this), 700);
    }

    void atrasResultado(String r) {
        atrasRespondido = true;
        if (!"h".equals(r)) finish();
    }

    @Override
    protected void onActivityResult(int req, int res, Intent datos) {
        if (req == REQ_ARCHIVO) {
            Uri[] resultado = WebChromeClient.FileChooserParams.parseResult(res, datos);
            if (fotoPendiente != null) {
                boolean usoCamara = res == RESULT_OK && (datos == null || datos.getData() == null);
                if (usoCamara) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    try { getContentResolver().update(fotoPendiente, v, null, null); } catch (Exception e) { }
                    resultado = new Uri[] { fotoPendiente };
                } else {
                    try { getContentResolver().delete(fotoPendiente, null, null); } catch (Exception e) { } // eligió galería o canceló: borrar la fila vacía
                }
                fotoPendiente = null;
            }
            if (callbackArchivo != null) {
                callbackArchivo.onReceiveValue(resultado);
                callbackArchivo = null;
            }
            return;
        }
        super.onActivityResult(req, res, datos);
    }

    // Prepara una foto en la galería (Pictures/CeluFacil) para que la app de cámara escriba ahí. Android 10+.
    Uri prepararFotoCamara() {
        if (Build.VERSION.SDK_INT < 29) return null;
        try {
            ContentValues v = new ContentValues();
            v.put(MediaStore.MediaColumns.DISPLAY_NAME, "celufacil-" + System.currentTimeMillis() + ".jpg");
            v.put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg");
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, "Pictures/CeluFacil");
            v.put(MediaStore.MediaColumns.IS_PENDING, 1);
            return getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
        } catch (Exception e) {
            return null;
        }
    }

    void aviso(String msg) {
        runOnUiThread(new Aviso(this, msg));
    }

    // Enlaces fuera de la app (Mercado Libre, WhatsApp, GitHub): se abren con la app que corresponda.
    boolean abrirExterno(Uri u) {
        if (u == null) return false;
        if ("localhost".equals(u.getHost())) return false;
        String esquema = u.getScheme();
        if (esquema == null || "data".equals(esquema) || "blob".equals(esquema) || "javascript".equals(esquema) || "about".equals(esquema)) return true;
        Intent i = new Intent(Intent.ACTION_VIEW, u);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        runOnUiThread(new Lanzar(this, i, null, "No hay una app para abrir ese enlace"));
        return true;
    }

    static String mime(String ruta) {
        String r = ruta.toLowerCase();
        if (r.endsWith(".html")) return "text/html";
        if (r.endsWith(".js") || r.endsWith(".mjs")) return "application/javascript";
        if (r.endsWith(".css")) return "text/css";
        if (r.endsWith(".json") || r.endsWith(".webmanifest")) return "application/json";
        if (r.endsWith(".png")) return "image/png";
        if (r.endsWith(".jpg") || r.endsWith(".jpeg")) return "image/jpeg";
        if (r.endsWith(".svg")) return "image/svg+xml";
        if (r.endsWith(".woff2")) return "font/woff2";
        if (r.endsWith(".woff")) return "font/woff";
        if (r.endsWith(".ico")) return "image/x-icon";
        return "application/octet-stream";
    }

    // ---------- Runnables con nombre (reemplazan clases anónimas) ----------

    static class Aviso implements Runnable {
        final MainActivity act;
        final String msg;
        Aviso(MainActivity act, String msg) { this.act = act; this.msg = msg; }
        public void run() { Toast.makeText(act, msg, Toast.LENGTH_SHORT).show(); }
    }

    static class SalirSiNoRespondio implements Runnable {
        final MainActivity act;
        SalirSiNoRespondio(MainActivity act) { this.act = act; }
        public void run() { if (!act.atrasRespondido) act.finish(); }
    }

    // Lanza un Intent (con selector de apps si tiene título) desde el hilo de la interfaz
    static class Lanzar implements Runnable {
        final MainActivity act;
        final Intent intent;
        final String titulo;
        final String siFalla;
        Lanzar(MainActivity act, Intent intent, String titulo, String siFalla) { this.act = act; this.intent = intent; this.titulo = titulo; this.siFalla = siFalla; }
        public void run() {
            try {
                act.startActivity(titulo == null ? intent : Intent.createChooser(intent, titulo));
            } catch (ActivityNotFoundException e) {
                act.aviso(siFalla);
            }
        }
    }

    // ---------- Sirve los archivos de assets/www como si fueran https://localhost/... ----------
    static class Cliente extends WebViewClient {
        final MainActivity act;
        Cliente(MainActivity act) { this.act = act; }

        @Override
        public void onPageFinished(WebView vista, String url) {
            act.paginaCargada = true;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView vista, WebResourceRequest pedido) {
            Uri u = pedido.getUrl();
            if (u == null || !"localhost".equals(u.getHost())) return null;
            String ruta = u.getPath();
            if (ruta == null || ruta.isEmpty() || "/".equals(ruta)) ruta = "/index.html";
            ruta = ruta.substring(1);
            Map cab = new HashMap();
            cab.put("Access-Control-Allow-Origin", "*");
            cab.put("Cache-Control", "no-cache");
            try {
                InputStream in = act.getAssets().open("www/" + ruta);
                WebResourceResponse resp = new WebResourceResponse(mime(ruta), "utf-8", in);
                resp.setResponseHeaders(cab);
                return resp;
            } catch (IOException e) {
                WebResourceResponse resp = new WebResourceResponse("text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
                resp.setStatusCodeAndReasonPhrase(404, "Not Found");
                resp.setResponseHeaders(cab);
                return resp;
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView vista, WebResourceRequest pedido) {
            return act.abrirExterno(pedido.getUrl());
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView vista, String url) {
            return act.abrirExterno(Uri.parse(url));
        }
    }

    // ---------- Selector de archivos para <input type="file"> (fotos del equipo, importar respaldo) ----------
    static class Chrome extends WebChromeClient {
        final MainActivity act;
        Chrome(MainActivity act) { this.act = act; }

        @Override
        @SuppressWarnings("unchecked")
        public boolean onShowFileChooser(WebView vista, ValueCallback cb, FileChooserParams params) {
            if (act.callbackArchivo != null) act.callbackArchivo.onReceiveValue(null);
            act.callbackArchivo = cb;
            try {
                Intent elegir = params.createIntent();
                String[] tipos = params.getAcceptTypes();
                boolean imagenes = false;
                if (tipos != null) for (String t : tipos) if (t != null && t.startsWith("image")) imagenes = true;
                Intent selector = Intent.createChooser(elegir, imagenes ? "Foto del equipo" : "Elegir archivo");
                if (imagenes) {
                    // Sumar la cámara al selector (la app de cámara guarda la foto en Pictures/CeluFacil)
                    act.fotoPendiente = act.prepararFotoCamara();
                    if (act.fotoPendiente != null) {
                        Intent camara = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                        camara.putExtra(MediaStore.EXTRA_OUTPUT, act.fotoPendiente);
                        camara.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                        selector.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[] { camara });
                    }
                }
                act.startActivityForResult(selector, REQ_ARCHIVO);
                return true;
            } catch (ActivityNotFoundException e) {
                act.callbackArchivo = null;
                act.aviso("No se encontró una app para elegir archivos");
                return false;
            }
        }
    }

    // ---------- Puente JavaScript (window.CeluNative) ----------
    // Todas las funciones devuelven un JSON: {"ok":true,...} o {"ok":false,"error":"..."}.
    public static class Puente {
        final MainActivity act;

        Puente(MainActivity act) { this.act = act; }

        File base(String dir) {
            if ("EXTERNAL".equals(dir)) { File f = act.getExternalFilesDir(null); if (f != null) return f; }
            if ("CACHE".equals(dir)) return act.getCacheDir();
            return act.getFilesDir();
        }

        File archivo(String dir, String ruta) throws IOException {
            File b = base(dir);
            File f = new File(b, ruta == null ? "" : ruta);
            if (!f.getCanonicalPath().startsWith(b.getCanonicalPath())) throw new IOException("ruta inválida");
            return f;
        }

        static String json(boolean ok, String clave, String valor) {
            StringBuilder sb = new StringBuilder("{\"ok\":").append(ok ? "true" : "false");
            if (clave != null) sb.append(",\"").append(clave).append("\":\"").append(escapar(valor)).append("\"");
            return sb.append("}").toString();
        }

        static String escapar(String s) {
            if (s == null) return "";
            StringBuilder sb = new StringBuilder(s.length() + 16);
            for (int i = 0; i < s.length(); i++) {
                char c = s.charAt(i);
                if (c == '"') sb.append("\\\"");
                else if (c == '\\') sb.append("\\\\");
                else if (c == '\n') sb.append("\\n");
                else if (c == '\r') sb.append("\\r");
                else if (c == '\t') sb.append("\\t");
                else if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                else sb.append(c);
            }
            return sb.toString();
        }

        static byte[] leerTodo(InputStream in) throws IOException {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            in.close();
            return out.toByteArray();
        }

        @JavascriptInterface
        public String version() { return json(true, "version", "directo"); }

        @JavascriptInterface
        public void atras(String r) { act.atrasResultado(r); }

        @JavascriptInterface
        public String writeFile(String dir, String ruta, String datos, String codificacion) {
            try {
                File f = archivo(dir, ruta);
                File padre = f.getParentFile();
                if (padre != null && !padre.exists() && !padre.mkdirs()) throw new IOException("no se pudo crear la carpeta");
                byte[] bytes = "utf8".equals(codificacion) ? (datos == null ? "" : datos).getBytes(StandardCharsets.UTF_8) : Base64.decode(datos == null ? "" : datos, Base64.DEFAULT);
                File tmp = new File(padre, f.getName() + ".tmp");
                OutputStream out = new FileOutputStream(tmp);
                out.write(bytes);
                out.close();
                if (f.exists() && !f.delete()) throw new IOException("no se pudo reemplazar el archivo");
                if (!tmp.renameTo(f)) throw new IOException("no se pudo guardar el archivo");
                String d = "EXTERNAL".equals(dir) || "CACHE".equals(dir) ? dir : "DATA";
                return json(true, "uri", "celunative://" + d + "/" + ruta);
            } catch (Exception e) {
                return json(false, "error", String.valueOf(e.getMessage()));
            }
        }

        @JavascriptInterface
        public String readFile(String dir, String ruta, String codificacion) {
            try {
                File f = archivo(dir, ruta);
                if (!f.isFile()) return json(false, "error", "no existe");
                byte[] bytes = leerTodo(new FileInputStream(f));
                String data = "utf8".equals(codificacion) ? new String(bytes, StandardCharsets.UTF_8) : Base64.encodeToString(bytes, Base64.NO_WRAP);
                return json(true, "data", data);
            } catch (Exception e) {
                return json(false, "error", String.valueOf(e.getMessage()));
            }
        }

        @JavascriptInterface
        public String deleteFile(String dir, String ruta) {
            try {
                File f = archivo(dir, ruta);
                if (f.exists() && !f.delete()) return json(false, "error", "no se pudo borrar");
                return json(true, null, null);
            } catch (Exception e) {
                return json(false, "error", String.valueOf(e.getMessage()));
            }
        }

        @JavascriptInterface
        public String share(String texto, String titulo) {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_TEXT, texto == null ? "" : texto);
            act.runOnUiThread(new Lanzar(act, i, titulo == null || titulo.isEmpty() ? "Compartir" : titulo, "No hay una app para compartir"));
            return json(true, null, null);
        }

        // Comparte un archivo propio: en Android 10+ lo copia a Descargas/CeluFacil (queda visible en el teléfono)
        // y lo manda con el selector de apps; en versiones anteriores manda el contenido como texto.
        @JavascriptInterface
        public String shareFile(String dir, String ruta, String mime, String titulo) {
            try {
                File f = archivo(dir, ruta);
                if (!f.isFile()) return json(false, "error", "no existe");
                String tipo = mime == null || mime.isEmpty() ? "application/octet-stream" : mime;
                byte[] bytes = leerTodo(new FileInputStream(f));
                String nombre = f.getName();
                String tit = titulo == null || titulo.isEmpty() ? "Compartir" : titulo;
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentResolver cr = act.getContentResolver();
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.MediaColumns.DISPLAY_NAME, nombre);
                    v.put(MediaStore.MediaColumns.MIME_TYPE, tipo);
                    v.put(MediaStore.MediaColumns.RELATIVE_PATH, "Download/CeluFacil");
                    v.put(MediaStore.MediaColumns.IS_PENDING, 1);
                    Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    if (uri == null) throw new IOException("no se pudo crear el archivo en Descargas");
                    OutputStream out = cr.openOutputStream(uri);
                    if (out == null) throw new IOException("no se pudo escribir en Descargas");
                    out.write(bytes);
                    out.close();
                    v.clear();
                    v.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    cr.update(uri, v, null, null);
                    Intent i = new Intent(Intent.ACTION_SEND);
                    i.setType(tipo);
                    i.putExtra(Intent.EXTRA_STREAM, uri);
                    i.putExtra(Intent.EXTRA_SUBJECT, nombre);
                    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    act.runOnUiThread(new Lanzar(act, i, tit, "Guardado en Descargas/CeluFacil"));
                    act.aviso("Copia guardada en Descargas/CeluFacil");
                } else {
                    Intent i = new Intent(Intent.ACTION_SEND);
                    i.setType("text/plain");
                    i.putExtra(Intent.EXTRA_SUBJECT, nombre);
                    i.putExtra(Intent.EXTRA_TEXT, new String(bytes, StandardCharsets.UTF_8));
                    act.runOnUiThread(new Lanzar(act, i, tit, "No hay una app para compartir"));
                }
                return json(true, null, null);
            } catch (Exception e) {
                return json(false, "error", String.valueOf(e.getMessage()));
            }
        }

        @JavascriptInterface
        public String openUrl(String url) {
            try {
                act.abrirExterno(Uri.parse(url == null ? "" : url));
                return json(true, null, null);
            } catch (Exception e) {
                return json(false, "error", String.valueOf(e.getMessage()));
            }
        }

        @JavascriptInterface
        public String toast(String msg) {
            act.aviso(msg == null ? "" : msg);
            return json(true, null, null);
        }
    }
}

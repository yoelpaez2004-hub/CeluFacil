#!/usr/bin/env bash
# Arma la versión de escritorio de Celu Fácil para Windows 10/11 (64 bits) con Neutralinojs: un CeluFacil.exe
# chico (~3 MB) que abre la app en una ventana propia usando el WebView2 que ya trae Windows. No hace falta
# Windows ni Visual Studio para compilarlo: solo Node (el runtime se baja de GitHub).
# Resultado: dist/CeluFacil-<versión>-windows.zip (CeluFacil.exe + resources.neu + LEEME.txt).
#
#   bash scripts/build-exe.sh
#
# Los datos (respaldos y fotos) quedan en la carpeta "datos" al lado del .exe.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="$ROOT/build-exe"
DIST="$ROOT/dist"
VERSION="$(node -p "require('$ROOT/package.json').version")"
NEU_VERSION="${NEU_VERSION:-6.5.0}"

echo "== Celu Fácil $VERSION — ejecutable de Windows (Neutralinojs $NEU_VERSION) =="
node "$ROOT/scripts/version-sync.mjs" >/dev/null
[ -d "$ROOT/node_modules/@neutralinojs/neu" ] || (cd "$ROOT" && npm install --no-audit --no-fund)

# ---------- 1. Recursos: la app + el puente de escritorio ----------
rm -rf "$BUILD" && mkdir -p "$BUILD/resources/js" "$DIST"
cp -r "$ROOT/www/." "$BUILD/resources/"
rm -f "$BUILD/resources/sw.js" "$BUILD/resources/manifest.json"
cp "$ROOT/native/desktop-bridge.js" "$BUILD/resources/desktop-bridge.js"
cp "$ROOT/www/icon-512.png" "$BUILD/resources/icon.png"
python3 - "$BUILD/resources/index.html" <<'EOF'
import sys
p = sys.argv[1]; h = open(p, encoding="utf-8").read()
marca = '<script src="app.js"></script>'
assert marca in h, "no encontré app.js en index.html"
# app.js lo carga el puente después de restaurar el estado guardado (ver native/desktop-bridge.js)
h = h.replace(marca, '<script src="js/neutralino.js"></script>\n<script>window.__CARGAR_APP = "app.js";</script>\n<script src="desktop-bridge.js"></script>')
h = h.replace('<link rel="manifest" href="manifest.json">\n', '')
open(p, "w", encoding="utf-8").write(h)
EOF

# ---------- 2. Configuración de Neutralino ----------
cat > "$BUILD/neutralino.config.json" <<EOF
{
  "applicationId": "ar.com.celufacil.app",
  "version": "$VERSION",
  "defaultMode": "window",
  "port": 0,
  "documentRoot": "/resources/",
  "url": "/",
  "enableServer": true,
  "enableNativeAPI": true,
  "tokenSecurity": "one-time",
  "logging": { "enabled": false, "writeToLogFile": false },
  "nativeAllowList": ["app.*", "os.*", "filesystem.*", "clipboard.*", "window.*", "events.*"],
  "modes": {
    "window": {
      "title": "Celu Fácil",
      "width": 480,
      "height": 900,
      "minWidth": 380,
      "minHeight": 600,
      "center": true,
      "fullScreen": false,
      "alwaysOnTop": false,
      "icon": "/resources/icon.png",
      "enableInspector": false,
      "borderless": false,
      "maximize": false,
      "hidden": false,
      "resizable": true,
      "exitProcessOnClose": true
    }
  },
  "cli": {
    "binaryName": "celufacil",
    "resourcesPath": "/resources/",
    "extensionsPath": "/extensions/",
    "clientLibrary": "/resources/js/neutralino.js",
    "binaryVersion": "$NEU_VERSION",
    "clientVersion": "$NEU_VERSION"
  }
}
EOF

# ---------- 3. Runtime de Neutralino (binarios + librería cliente, desde GitHub) y empaquetado ----------
NEU="$ROOT/node_modules/.bin/neu"
(cd "$BUILD" && "$NEU" update && "$NEU" build --release)
EXE="$BUILD/dist/celufacil/celufacil-win_x64.exe"
[ -s "$EXE" ] || { echo "No se generó el ejecutable de Windows"; exit 1; }

# ---------- 4. Ícono y datos de versión dentro del .exe (sin Windows: resedit en Node) ----------
python3 - "$ROOT/www/icon-512.png" "$BUILD/icono.ico" <<'EOF'
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGBA")
im.save(sys.argv[2], format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
EOF
node "$ROOT/scripts/exe-icono.mjs" "$EXE" "$BUILD/icono.ico" "$VERSION" "$BUILD/CeluFacil.exe"

# ---------- 5. Zip final ----------
SALIDA_DIR="$BUILD/CeluFacil"
rm -rf "$SALIDA_DIR" && mkdir -p "$SALIDA_DIR"
cp "$BUILD/CeluFacil.exe" "$SALIDA_DIR/CeluFacil.exe"
cp "$BUILD/dist/celufacil/resources.neu" "$SALIDA_DIR/resources.neu"
cat > "$SALIDA_DIR/LEEME.txt" <<EOF
CELU FÁCIL $VERSION PARA WINDOWS

1. Descomprimí esta carpeta donde quieras (Escritorio o Documentos; no en Archivos de programa).
2. Abrí CeluFacil.exe. Si Windows pregunta ("Windows protegió su PC"), tocá "Más información" → "Ejecutar de todas formas":
   el programa no está firmado con un certificado pago, por eso avisa.
3. Los dos archivos tienen que estar juntos: CeluFacil.exe y resources.neu.

Los datos (órdenes, precios, fotos) se guardan en esta PC, en la carpeta "datos" que se crea al lado del .exe.
Para pasarlos al celular o a otra PC: Mi taller → Exportar / compartir, y en el otro equipo Importar.

Necesita Windows 10 u 11 de 64 bits con Microsoft Edge WebView2 (viene con Windows; si faltara, se instala desde
https://developer.microsoft.com/microsoft-edge/webview2/ → "Evergreen Bootstrapper").
EOF
ZIP="$DIST/CeluFacil-$VERSION-windows.zip"
rm -f "$ZIP"
(cd "$BUILD" && zip -qr "$ZIP" CeluFacil)
echo
echo "Listo: $ZIP ($(du -h "$ZIP" | cut -f1))"

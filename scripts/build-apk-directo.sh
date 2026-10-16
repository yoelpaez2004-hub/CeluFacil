#!/usr/bin/env bash
# Compila el APK de Celu Fácil SIN Android Studio, Gradle ni el SDK de Google: solo Java 17+, Node, Python 3 con
# Pillow y herramientas publicadas en GitHub (aapt2 y d8 desde bundletool, firmador uber-apk-signer, android.jar).
# Resultado: dist/CeluFacil-<versión>.apk, firmado con clave/release.keystore (se genera si no existe).
#
#   bash scripts/build-apk-directo.sh                 # versionCode 1
#   VERSION_CODE=5 bash scripts/build-apk-directo.sh  # elegir versionCode (tiene que subir para actualizar)
#   CLAVE_DIR=/ruta/a/la/clave bash scripts/...        # carpeta con release.keystore y password.txt
#
# Es el mismo script que usa GitHub Actions (.github/workflows/compilar.yml).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS="$ROOT/.tools"
BUILD="$ROOT/build-directo"
DIST="$ROOT/dist"
CLAVE="${CLAVE_DIR:-$ROOT/clave}"
[ -s "$CLAVE/release.keystore" ] || [ ! -s "$ROOT/../CLAVE-DE-FIRMA/release.keystore" ] || CLAVE="$ROOT/../CLAVE-DE-FIRMA"
PKG="ar.com.celufacil.app"
VERSION="$(node -p "require('$ROOT/package.json').version")"
VERSION_CODE="${VERSION_CODE:-1}"
MIN_SDK=24
TARGET_SDK=34

echo "== Celu Fácil $VERSION (versionCode $VERSION_CODE) — compilación directa =="

# ---------- 1. Herramientas ----------
mkdir -p "$TOOLS"
bajar() { [ -s "$2" ] || { echo "Descargando $(basename "$2")…"; curl -sSL --fail --max-time 600 -o "$2" "$1"; }; }
bajar "https://raw.githubusercontent.com/Reginer/aosp-android-jar/main/android-$TARGET_SDK/android.jar" "$TOOLS/android.jar"
bajar "https://github.com/google/bundletool/releases/download/1.17.2/bundletool-all-1.17.2.jar" "$TOOLS/bundletool.jar"
bajar "https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar" "$TOOLS/uber-apk-signer.jar"
if [ ! -x "$TOOLS/aapt2" ]; then
  (cd "$TOOLS" && unzip -o -q bundletool.jar linux/aapt2 && mv linux/aapt2 aapt2 && rmdir linux && chmod +x aapt2)
fi
AAPT2="$TOOLS/aapt2"
D8="java -cp $TOOLS/bundletool.jar com.android.tools.r8.D8"
JAVAC_OPTS="--release 8 -Xlint:-options -encoding UTF-8"
export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:-} -Dfile.encoding=UTF-8"

# ---------- 2. Versión en la app y assets ----------
node "$ROOT/scripts/version-sync.mjs" >/dev/null
rm -rf "$BUILD" && mkdir -p "$BUILD"/{assets/www,res,classes,dex,src} "$DIST"
cp -r "$ROOT/www/." "$BUILD/assets/www/"
rm -f "$BUILD/assets/www/sw.js"
cp "$ROOT/native/bridge.js" "$BUILD/assets/www/native-bridge.js"
# El puente se carga antes de app.js para que la app encuentre window.Capacitor
python3 - "$BUILD/assets/www/index.html" <<'EOF'
import sys
p = sys.argv[1]; h = open(p, encoding="utf-8").read()
marca = '<script src="app.js"></script>'
assert marca in h, "no encontré app.js en index.html"
h = h.replace(marca, '<script src="native-bridge.js"></script>\n' + marca)
h = h.replace('<link rel="manifest" href="manifest.json">\n', '')
open(p, "w", encoding="utf-8").write(h)
EOF

# ---------- 3. Recursos: nombre e íconos (adaptativo en Android 8+) ----------
mkdir -p "$BUILD/res/values" "$BUILD/res/mipmap-anydpi-v26"
cat > "$BUILD/res/values/strings.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Celu Fácil</string>
</resources>
EOF
cat > "$BUILD/res/values/colors.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0F7D86</color>
</resources>
EOF
cat > "$BUILD/res/mipmap-anydpi-v26/ic_launcher.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
EOF
python3 - "$ROOT/www/icon-512.png" "$BUILD/res" <<'EOF'
import sys
from PIL import Image, ImageDraw
src, res = sys.argv[1], sys.argv[2]
icono = Image.open(src).convert("RGBA")
dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
CORAL = (255, 107, 74, 255); BLANCO = (255, 255, 255, 255)
for d, k in dens.items():
    import os; os.makedirs(f"{res}/mipmap-{d}", exist_ok=True)
    # Ícono clásico (Android 7): el PNG completo
    s = int(48 * k); icono.resize((s, s), Image.LANCZOS).save(f"{res}/mipmap-{d}/ic_launcher.png")
    # Capa frontal del ícono adaptativo (108dp, el dibujo dentro de la zona segura de 72dp)
    s = int(108 * k); im = Image.new("RGBA", (s, s), (0, 0, 0, 0)); dr = ImageDraw.Draw(im); w = max(2, int(s * 0.04))
    dr.rounded_rectangle([s * .38, s * .27, s * .62, s * .73], radius=s * .07, outline=BLANCO, width=w)
    dr.rounded_rectangle([s * .475, s * .665, s * .525, s * .685], radius=s * .01, fill=BLANCO)
    dr.line([s * .44, s * .50, s * .485, s * .55, s * .565, s * .44], fill=CORAL, width=int(s * .045), joint="curve")
    r = s * .0225
    for x, y in ((s * .44, s * .50), (s * .485, s * .55), (s * .565, s * .44)): dr.ellipse([x - r, y - r, x + r, y + r], fill=CORAL)
    im.save(f"{res}/mipmap-{d}/ic_launcher_foreground.png")
print("íconos generados")
EOF

# ---------- 4. Compilar Java → dex ----------
cp "$ROOT/native/MainActivity.java" "$BUILD/src/"
javac $JAVAC_OPTS -cp "$TOOLS/android.jar" -d "$BUILD/classes" "$BUILD/src/MainActivity.java"
$D8 --release --min-api "$MIN_SDK" --lib "$TOOLS/android.jar" --output "$BUILD/dex" "$BUILD"/classes/ar/com/celufacil/app/*.class
[ -s "$BUILD/dex/classes.dex" ] || { echo "No se generó classes.dex"; exit 1; }

# ---------- 5. Recursos y manifiesto → APK sin firmar ----------
"$AAPT2" compile --dir "$BUILD/res" -o "$BUILD/res.zip"
"$AAPT2" link -o "$BUILD/base.apk" -I "$TOOLS/android.jar" --manifest "$ROOT/native/AndroidManifest.xml" \
  -A "$BUILD/assets" --min-sdk-version "$MIN_SDK" --target-sdk-version "$TARGET_SDK" \
  --version-code "$VERSION_CODE" --version-name "$VERSION" --auto-add-overlay "$BUILD/res.zip"
cp "$BUILD/base.apk" "$BUILD/unsigned.apk"
(cd "$BUILD/dex" && zip -q "$BUILD/unsigned.apk" classes.dex)

# ---------- 6. Clave de firma (la misma que debe usar GitHub Actions) ----------
mkdir -p "$CLAVE"
if [ ! -s "$CLAVE/release.keystore" ]; then
  PASS="$(openssl rand -hex 12)"
  keytool -genkeypair -v -keystore "$CLAVE/release.keystore" -alias celufacil -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$PASS" -keypass "$PASS" -dname "CN=Celu Facil, O=Celu Facil, L=La Matanza, ST=Buenos Aires, C=AR" >/dev/null 2>&1
  printf '%s' "$PASS" > "$CLAVE/password.txt"
  printf '%s:%s' "$PASS" "$(base64 -w0 "$CLAVE/release.keystore")" > "$CLAVE/secret.txt"
  cat > "$CLAVE/LEEME.txt" <<EOF
CLAVE DE FIRMA DE CELU FÁCIL — guardá esta carpeta en un lugar seguro (Drive, pendrive) y NO la subas al repo.

Con esta clave se firma el APK. Mientras todas las versiones se firmen con ella, se instalan una sobre otra sin
desinstalar ni perder datos.

Para que GitHub compile con esta clave: Settings → Secrets and variables → Actions → New repository secret
  Nombre: CELUFACIL_CLAVE
  Valor:  el contenido completo de secret.txt (una sola línea)

Para compilar en tu PC: la carpeta puede estar en CeluFacil/clave o al lado del proyecto como CLAVE-DE-FIRMA.
EOF
  echo "Clave de firma nueva generada en clave/ (leé clave/LEEME.txt)"
fi
PASS="$(cat "$CLAVE/password.txt")"
[ -s "$CLAVE/secret.txt" ] || printf '%s:%s' "$PASS" "$(base64 -w0 "$CLAVE/release.keystore")" > "$CLAVE/secret.txt"

# ---------- 7. Alinear, firmar (v1+v2+v3) y verificar ----------
rm -rf "$BUILD/firmado" && mkdir -p "$BUILD/firmado"
java -jar "$TOOLS/uber-apk-signer.jar" --apks "$BUILD/unsigned.apk" --out "$BUILD/firmado" \
  --ks "$CLAVE/release.keystore" --ksAlias celufacil --ksPass "$PASS" --ksKeyPass "$PASS" --allowResign >/dev/null
SALIDA="$DIST/CeluFacil-$VERSION.apk"
cp "$BUILD"/firmado/*-aligned-*signed*.apk "$SALIDA"
java -jar "$TOOLS/uber-apk-signer.jar" --onlyVerify --apks "$SALIDA" | grep -E "VERIFIED|v1|v2|v3|ERROR|WARNING" || true
echo
"$AAPT2" dump badging "$SALIDA" | grep -E "^package|application-label:|launchable-activity|sdkVersion|targetSdkVersion" || true
echo
echo "APK listo: $SALIDA ($(du -h "$SALIDA" | cut -f1))"

# Celu Fácil

App Android para talleres de reparación de celulares: diagnóstico por síntoma, repuestos en tres niveles de calidad con precios exactos de Mercado Libre, mano de obra por tipo de trabajo, presupuesto con tu ganancia, órdenes con fotos y avisos por WhatsApp. Funciona sin conexión y respalda los datos sola.

## Cómo tener el APK (3 pasos, una sola vez)

1. **Subí esta carpeta a GitHub** como repo público `CeluFacil` (rama `main`). Si tu usuario no es `yoelpaez2004-hub`, cambiá `REPO` al final de `www/data.js`.
2. **Guardá la clave de firma.** Si ya tenés la carpeta `CLAVE-DE-FIRMA`: en el repo, *Settings → Secrets and variables → Actions → New repository secret*, nombre `CELUFACIL_CLAVE`, valor = el contenido de `secret.txt`. Si no la tenés, saltá este paso: la primera compilación la genera y te la deja en el artefacto **CLAVE-DE-FIRMA-GUARDAR** para que cargues ese mismo secret después.
3. **Actions → "Compilar APK" → Run workflow.** En un par de minutos el APK queda en **Releases** (y como artefacto). Instalalo en el celular.

Desde ahí, cada cambio que subas a `main` compila solo, y cuando cambiás `"version"` en `package.json` se publica un Release nuevo: la app avisa en Inicio y descarga la actualización, que se instala encima sin perder datos. Los precios de Mercado Libre se actualizan solos todos los días; las imágenes de marcas se bajan solas de Wikimedia Commons en la primera compilación.

Sin GitHub: `npm run apk` en una PC con Java 17+, Node y Python 3 con Pillow (Java es lo único pesado; no hace falta Android Studio).

## Versión para Windows (CeluFacil.exe)

La misma app para la PC del taller: `npm run exe` genera `dist/CeluFacil-<versión>-windows.zip` (también lo arma el workflow y lo publica en cada Release). Se descomprime en cualquier carpeta (Escritorio o Documentos, no en Archivos de programa), se abre `CeluFacil.exe` y listo: ventana propia, los datos en la carpeta `datos` al lado del .exe, los links de WhatsApp y Mercado Libre se abren en el navegador. Es un ejecutable de ~3 MB hecho con [Neutralinojs](https://neutralino.js.org) que usa el WebView2 que ya trae Windows 10/11. Como no está firmado con un certificado pago, la primera vez Windows muestra "Windows protegió su PC" → *Más información* → *Ejecutar de todas formas*. El APK y el .exe comparten todo el código (`www/`); el puente de escritorio está en `native/desktop-bridge.js`.

## Web para clientes (GitHub Pages)

La carpeta `web/` es el sitio público del taller: el cliente elige marca, modelo y falla y ve el precio estimado (mano de obra + repuesto con tu recargo, con los mismos precios de Mercado Libre que la app) y lo pide por WhatsApp con un mensaje ya armado. No muestra costos, ganancia, órdenes ni nada interno.

1. Editá `web/config.js`: nombre, **WhatsApp** (con 549 adelante, sin espacios), dirección, horario, garantía y recargo.
2. En el repo: *Settings → Pages → Source: **GitHub Actions*** (una sola vez).
3. Cada cambio en `web/` o en `www/data.js` vuelve a publicar la web sola (workflow "Publicar web"). Queda en `https://<usuario>.github.io/CeluFacil/`.

**Precios siempre al día**: el robot de Mercado Libre corre todos los días a las 6:17 y, si hubo cambios, relanza "Publicar web". Además, si por cualquier motivo la web publicada tuviera precios de más de un día, al abrirse pide los últimos directo al repo. GitHub pausa los workflows programados cuando el repo pasa 60 días sin actividad: si pasa, se reactivan con un clic en la pestaña Actions.

**Fotos de los modelos**: *Actions → "Descargar fotos de modelos" → Run workflow* baja de Wikimedia Commons una foto libre de cada modelo a `www/modelos/` (con créditos en `index.json`); la web las muestra en la lista de modelos y deja una silueta en los que no tienen foto. Tarda unos 10 minutos y se puede volver a correr para completar los que falten.

Para verla en la PC: `npm run web` arma `dist/web/` y se abre `index.html` desde un servidor local (por ejemplo `npx serve dist/web`).

## Qué hace

| Pantalla | Qué resuelve |
|---|---|
| **Inicio** | Categorías de falla, fallas más consultadas, las 8 marcas principales (el resto y las tuyas detrás de "Otras marcas"), y tu tablero: avisos de equipos demorados (listo sin retirar, sin diagnóstico, presupuesto sin respuesta, repuesto que no llega), repuestos para comprar, órdenes activas, listas para entregar, ganancia del mes y plata por cobrar. Avisa cuando hay una versión nueva y cuando conviene compartir un respaldo. |
| **Falla** | Diagnóstico probable, tipo de trabajo, tiempo, dificultad, tip de taller. Repuesto en tres niveles: económico (compatible), calidad original (AAA/OLED) y premium (original/service pack), con precio, envío gratis y link a la publicación cuando el robot tiene datos del modelo. Total = mano de obra (según gama) + nivel elegido con tu recargo. Podés guardar lo que pagás por modelo. |
| **Presupuesto** | Comprobante numerado: ítems con costo y precio de venta, mano de obra, seña, resta y tu ganancia estimada. Se envía por WhatsApp como texto o como imagen (tarjeta PNG con el nombre del taller) y se convierte en orden; los repuestos viajan a la orden. |
| **Órdenes** | Estados Recibido → Diagnóstico → Esperando repuesto → En reparación → Listo → Entregado. Checklist del estado del equipo al recibirlo, hasta 4 fotos (cámara o galería), patrón/PIN, costo y seña. Botón **Avisar**: manda al cliente el WhatsApp de cada estado, con dirección y mapa. Al entregar queda la fecha y la garantía con vencimiento (vigente/vencida en la tarjeta y en el WhatsApp). |
| **Compras** | Lo que hay que comprar: los repuestos de las órdenes en "Esperando repuesto", con costo, link a Mercado Libre y tilde de comprado; cuando llegó todo, un toque la pasa a "En reparación". |
| **Clientes** | Se arman solos a partir de las órdenes (agrupadas por WhatsApp): historial, total gastado, órdenes en curso y garantías vigentes, con WhatsApp y nueva orden desde la ficha. Al cargar un teléfono conocido en una orden, la app completa el nombre y avisa si tiene garantía vigente. |
| **Mi taller** | Nombre, WhatsApp, dirección, garantía, horario, recargo sobre repuestos, 23 precios por tipo de trabajo, marcas y modelos propios, imágenes de marcas, respaldo, precios de Mercado Libre (con las publicaciones que ocultaste con "no sirve"), créditos y actualización. |

## Cómo está hecho

- `www/`: la app (HTML, CSS y JS sin frameworks; tipografía Nunito e íconos propios incluidos para funcionar offline).
- `native/`: envoltorio Android en Java puro (sin AndroidX ni Gradle): sirve la app desde `https://localhost`, y le da respaldo automático a archivos, compartir por WhatsApp, cámara/galería para las fotos y botón atrás. Está escrito sin clases anónimas ni genéricos porque el `d8` que usa el script no los acepta con javac moderno.
- `scripts/build-apk-directo.sh`: compila y firma el APK con `aapt2` y `d8` (de bundletool), `android.jar` y `uber-apk-signer`, todos bajados de GitHub.
- `scripts/build-exe.sh`: arma la versión de Windows con Neutralinojs (runtime bajado de GitHub) y le pone el ícono y los datos de versión al .exe con `scripts/exe-icono.mjs` (sin Windows ni wine).
- `scripts/actualizar-precios.mjs`: robot de precios. Lee la página pública de resultados de Mercado Libre (o la API oficial si cargás `ML_CLIENT_ID` y `ML_CLIENT_SECRET` como secrets), descarta lo que no es el repuesto o es otra variante del modelo, clasifica en tres niveles por las palabras del título y guarda la publicación más barata creíble de cada nivel más dos alternativas (por si ocultás una desde la app). Corre a diario (`precios.yml`): módulo, batería y pin todos los días; cámara, tapa y flex los domingos. Si ponés `www/exclusiones.json` (la lista que copiás desde Mi taller), esas publicaciones se saltean. Si Mercado Libre bloquea la página pública (pide iniciar sesión), el robot lo dice en el log: en ese caso hay que crear una aplicación en developers.mercadolibre.com.ar y cargar esos dos secrets. El APK sale con `www/precios-ml.json` ya cargado con los precios recolectados en el taller, así que la app muestra precios reales desde el primer día.
- `scripts/descargar-logos.mjs`: baja de Wikimedia Commons el logo de cada marca aceptando solo licencias libres, como PNG transparente, y escribe `creditos.json` (la app lo muestra en Acerca de). También se pueden cargar imágenes desde la app o poner archivos en `www/marcas/`. Los íconos de las categorías de falla (`www/iconos/`) son de Font Awesome Free 5 (CC BY 4.0) vía Wikimedia Commons, coloreados para la app; su crédito está en el mismo `creditos.json` y en Acerca de. Si falta un PNG, la app usa su ícono SVG propio.
- `tests/app.test.mjs`: 73 pruebas (app en navegador simulado, clientes y garantía, compras y avisos, puente Android, puente de escritorio, robot de precios, descarga de logos). El workflow no compila si fallan.

## Respaldo de datos

Cada cambio se guarda en el teléfono (almacenamiento de la app y `Android/data/ar.com.celufacil.app/files/CeluFacil/`); al reinstalar, la app ofrece restaurar. Lo que no sobrevive a una desinstalación es ese respaldo local: por eso *Mi taller → Exportar / compartir* lo manda a Drive o WhatsApp, y la app lo recuerda cada 14 días.

## Personalizar

- Marcas y modelos: `MARCAS` en `www/data.js` (y desde la app, Mi taller → Marcas y modelos propios). Fallas y diagnósticos: `FALLAS`. Tipos de trabajo y mano de obra base: `TRABAJOS`. Repuestos y precios de referencia: `REPUESTOS`.
- Datos del taller por defecto: `CFG_DEFECTO` en `www/app.js`.

```bash
npm install && npm test   # pruebas
npm run bundle:demo       # dist/celufacil-demo.html, la app en un solo archivo con precios de ejemplo
npm run bundle:real       # dist/celufacil-real.html, lo mismo con los precios reales y las imágenes de marcas incrustadas
npm run precios -- --solo "Galaxy A05"   # probar el robot con un modelo
npm run logos             # imágenes de marcas desde Wikimedia Commons
```

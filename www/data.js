// ===== Celu Fácil — Base de datos =====
// Marcas, gamas de modelos, fallas, tipos de trabajo y precios (ARS). La mano de obra se edita desde Ajustes.

const MARCAS = {
  Samsung: {
    alta: ["Galaxy S24 Ultra","Galaxy S24","Galaxy S23 Ultra","Galaxy S23","Galaxy S22","Galaxy Z Flip 5","Galaxy Z Fold 5"],
    media: ["Galaxy A55","Galaxy A54","Galaxy A35","Galaxy A34","Galaxy A25","Galaxy A24","Galaxy A15"],
    baja: ["Galaxy A05","Galaxy A05s","Galaxy A04","Galaxy A04e","Galaxy A03","Galaxy A03 Core","Galaxy A14","Galaxy A13","Galaxy A12"]
  },
  Motorola: {
    alta: ["Edge 50 Pro","Edge 40","Edge 40 Neo","Razr 40"],
    media: ["Moto G84","Moto G73","Moto G54","Moto G53","Moto G34","Moto G24 Power"],
    baja: ["Moto G23","Moto G22","Moto G14","Moto G13","Moto G04","Moto E13","Moto E22","Moto E40"]
  },
  Xiaomi: {
    alta: ["Xiaomi 14","Xiaomi 13T","Xiaomi 13 Lite","POCO F6","POCO F5"],
    media: ["Redmi Note 13 Pro","Redmi Note 13","Redmi Note 12 Pro","Redmi Note 12","Redmi Note 11","POCO X6","POCO X5","POCO M6 Pro"],
    baja: ["Redmi 13C","Redmi 12C","Redmi 12","Redmi A3","Redmi A2","Redmi 10C","Redmi 9A","POCO C65","POCO C55"]
  },
  iPhone: {
    alta: ["iPhone 15 Pro Max","iPhone 15 Pro","iPhone 15","iPhone 14 Pro Max","iPhone 14 Pro","iPhone 14"],
    media: ["iPhone 13","iPhone 13 mini","iPhone 12","iPhone 12 mini","iPhone SE 2022"],
    baja: ["iPhone 11","iPhone XR","iPhone X","iPhone 8","iPhone 7","iPhone SE 2020"]
  },
  TCL: {
    alta: [],
    media: ["TCL 40 SE","TCL 30 SE","TCL 40 NxtPaper"],
    baja: ["TCL 305","TCL 306","TCL 403","TCL 405","TCL 408","TCL 30E","TCL L7"]
  },
  ZTE: {
    alta: [],
    media: ["Blade V50 Design","Blade A73","Blade V40 Vita"],
    baja: ["Blade A53","Blade A54","Blade A34","Blade A52","Blade A31","Blade V30","Blade A5"]
  },
  Realme: {
    alta: ["Realme GT 5","Realme 11 Pro+"],
    media: ["Realme 11","Realme 10","Realme 9","Realme C67","Realme C55"],
    baja: ["Realme C53","Realme C51","Realme C35","Realme C33","Realme C30","Realme C25Y","Realme Narzo 50i"]
  },
  Huawei: {
    alta: ["P40 Pro","Mate 40 Pro","P30 Pro"],
    media: ["Nova 10","Nova 9","P30 Lite","P smart 2021"],
    baja: ["Y9 2019","Y7 2019","Y6 2019","Y5p","Y6p","Y7a"]
  },
  Nokia: {
    alta: [],
    media: ["Nokia G42","Nokia G21","Nokia X20"],
    baja: ["Nokia C32","Nokia C22","Nokia C21","Nokia C12","Nokia G11","Nokia 2.4","Nokia 1.4"]
  },
  Alcatel: {
    alta: [],
    media: ["Alcatel 3L","Alcatel 3X"],
    baja: ["Alcatel 1","Alcatel 1B","Alcatel 1L","Alcatel 1S","Alcatel 1V","Alcatel 3"]
  },
  Noblex: {
    alta: [],
    media: [],
    baja: ["Noblex A50 Plus","Noblex A60 Plus","Noblex A70","Noblex A80"]
  },
  LG: {
    alta: ["Velvet","G8s ThinQ","G7 ThinQ","V40 ThinQ"],
    media: ["K61","K52","K51S","K50S","Q60","Q70"],
    baja: ["K42","K41S","K40S","K22","K20","K11","K9"]
  },
  Sony: {
    alta: ["Xperia 1 III","Xperia 5 II","Xperia 1 II"],
    media: ["Xperia 10 III","Xperia 10 II","Xperia XZ2"],
    baja: ["Xperia L4","Xperia L3","Xperia XA2","Xperia XA1"]
  },
  BGH: {
    alta: [],
    media: [],
    baja: ["Joy X2","Joy Smart","Joy Dual","Joy Max","X5"]
  },
  BLU: {
    alta: [],
    media: ["G91 Pro","G71 Plus","F91"],
    baja: ["G50","G51","G61","Studio X10","Vivo X6","C5L"]
  },
  Otro: { alta: ["Otro gama alta"], media: ["Otro gama media"], baja: ["Otro gama baja"] }
};

// Multiplicador de mano de obra por gama (iPhone tiene recargo adicional)
const MULT_GAMA = { baja: 1, media: 1.3, alta: 1.7 };
const RECARGO_IPHONE = 1.25;

// Categorías de síntomas para el diagnóstico
const CATEGORIAS = [
  { id: "pantalla", nombre: "Pantalla / Táctil", icono: "📱" },
  { id: "bateria", nombre: "Batería / Energía", icono: "🔋" },
  { id: "carga", nombre: "Carga / Conector", icono: "🔌" },
  { id: "audio", nombre: "Sonido / Micrófono", icono: "🔊" },
  { id: "camara", nombre: "Cámara", icono: "📷" },
  { id: "red", nombre: "Señal / WiFi / Bluetooth", icono: "📶" },
  { id: "software", nombre: "Software / Bloqueos", icono: "⚙️" },
  { id: "fisico", nombre: "Golpes / Agua / Botones", icono: "💧" }
];

// Fallas: síntoma → diagnóstico probable, repuesto, tipo de trabajo (parte, define la mano de obra), tiempo, dificultad
const FALLAS = [
  // PANTALLA
  { cat:"pantalla", sintoma:"Vidrio roto pero la imagen y el táctil funcionan", diag:"Vidrio templado/cristal del módulo fisurado. Si el táctil responde bien se puede cambiar solo el glass (requiere máquina) o cambiar el módulo completo.", repuesto:"Módulo completo (recomendado) o glass", parte:"modulo", tiempo:"45–90 min", dif:2, tips:"Revisar si hay manchas en el LCD antes de presupuestar. En gama baja casi siempre conviene módulo completo." },
  { cat:"pantalla", sintoma:"Pantalla negra, el celular prende (vibra, suena)", diag:"Módulo de pantalla dañado (LCD/OLED sin imagen) o flex de display desconectado por golpe.", repuesto:"Módulo de pantalla", parte:"modulo", tiempo:"45–90 min", dif:2, tips:"Probar primero con un módulo de prueba antes de cerrar presupuesto: puede ser falla de placa (IC display)." },
  { cat:"pantalla", sintoma:"Manchas, líneas o rayas de colores en la pantalla", diag:"LCD/OLED dañado internamente (presión o golpe). Reemplazo del módulo.", repuesto:"Módulo de pantalla", parte:"modulo", tiempo:"45–90 min", dif:2, tips:"En OLED con manchas verdes/violetas el daño avanza con los días: avisar al cliente." },
  { cat:"pantalla", sintoma:"El táctil no responde o responde solo en algunas zonas", diag:"Digitalizador dañado o flex del táctil con falso contacto. Si el teléfono tiene glass roto, es el módulo.", repuesto:"Módulo de pantalla", parte:"modulo", tiempo:"45–90 min", dif:2, tips:"Descartar vidrio templado de mala calidad o humedad en el flex antes de cambiar nada." },
  { cat:"pantalla", sintoma:"Toques fantasma (se mueve solo)", diag:"Digitalizador defectuoso, cargador no original o humedad. Si persiste con cargador original, módulo.", repuesto:"Módulo de pantalla (posible)", parte:"modulo", tiempo:"30–60 min", dif:2, tips:"Probar sin cargar y sin funda. Muchas veces es el cargador genérico." },
  { cat:"pantalla", sintoma:"Pantalla parpadea o se ve muy oscura", diag:"Falla en la retroiluminación (LCD) o flex de display dañado. En OLED puede ser IC de pantalla.", repuesto:"Módulo o reparación de placa", parte:"modulo", tiempo:"1–2 h", dif:3, tips:"Si cambiando el módulo sigue igual, es placa (backlight/IC)." },
  // BATERÍA
  { cat:"bateria", sintoma:"La batería dura muy poco", diag:"Batería degradada por ciclos de carga. Reemplazo de batería.", repuesto:"Batería", parte:"bateria", tiempo:"30–60 min", dif:1, tips:"En Samsung/Motorola la tapa va pegada: usar calor y espátula. Pedir batería con flex compatible." },
  { cat:"bateria", sintoma:"Se apaga solo con porcentaje alto (ej. 30%)", diag:"Batería con celdas dañadas: el % no es real. Reemplazo de batería.", repuesto:"Batería", parte:"bateria", tiempo:"30–60 min", dif:1, tips:"Calibrar después del cambio: carga completa al 100% y descarga." },
  { cat:"bateria", sintoma:"Tapa trasera o pantalla hinchada / levantada", diag:"Batería inflada. URGENTE: riesgo de incendio. Reemplazo inmediato.", repuesto:"Batería (+ tapa si se rompió)", parte:"bateria", tiempo:"30–60 min", dif:2, tips:"No perforar ni apoyar herramientas sobre la batería. Guardarla en arena o recipiente metálico." },
  { cat:"bateria", sintoma:"No prende ni con cargador", diag:"Batería totalmente descargada/muerta, conector de carga roto o cortocircuito en placa.", repuesto:"Batería o pin de carga (diagnóstico previo)", parte:"bateria", tiempo:"1–2 h", dif:3, tips:"Medir con fuente de laboratorio: consumo 0 = IC/línea; consumo alto fijo = corto; consumo normal = batería." },
  { cat:"bateria", sintoma:"Se reinicia solo", diag:"Batería con bajo voltaje bajo carga, software corrupto o falso contacto en placa.", repuesto:"Batería (o reparación de software)", parte:"bateria", tiempo:"30–90 min", dif:2, tips:"Probar con batería de prueba. Si sigue, formatear/flashear." },
  // CARGA
  { cat:"carga", sintoma:"Carga solo si acomodo el cable", diag:"Pin/conector de carga flojo o sucio. Limpieza o cambio del pin.", repuesto:"Pin de carga (flex o soldado)", parte:"pin", tiempo:"30–90 min", dif:2, tips:"Primero limpiar con pincel y alcohol isopropílico: muchas veces es pelusa." },
  { cat:"carga", sintoma:"No carga nada con ningún cable", diag:"Pin de carga roto, IC de carga dañado o flex de carga cortado.", repuesto:"Pin de carga / flex / IC de carga", parte:"pin", tiempo:"1–2 h", dif:3, tips:"Si el pin está bien y no carga, es IC de carga: reparación de placa con estación." },
  { cat:"carga", sintoma:"Carga muy lento", diag:"Pin desgastado, cable/cargador de mala calidad o batería degradada.", repuesto:"Pin de carga o batería", parte:"pin", tiempo:"30–60 min", dif:2, tips:"Probar con cargador original primero." },
  { cat:"carga", sintoma:"La PC no lo reconoce pero carga", diag:"Líneas de datos del pin dañadas. Cambio del pin de carga.", repuesto:"Pin de carga", parte:"pin", tiempo:"30–90 min", dif:2, tips:"Verificar también el cable: muchos cables son solo de carga." },
  { cat:"carga", sintoma:"Se calienta mucho al cargar", diag:"Batería dañada, IC de carga en falla o entrada de humedad.", repuesto:"Batería / IC de carga", parte:"bateria", tiempo:"1–2 h", dif:3, tips:"Revisar el sensor de humedad del conector." },
  // AUDIO
  { cat:"audio", sintoma:"No se escucha nada en llamadas (auricular)", diag:"Auricular interno dañado o malla tapada de suciedad.", repuesto:"Auricular (speaker superior)", parte:"auricular", tiempo:"30–60 min", dif:2, tips:"Limpiar la malla con cepillo primero." },
  { cat:"audio", sintoma:"No suena el altavoz (timbre, música)", diag:"Buzzer/altavoz inferior quemado o húmedo.", repuesto:"Buzzer", parte:"buzzer", tiempo:"30–60 min", dif:2, tips:"Probar el modo seguro para descartar software." },
  { cat:"audio", sintoma:"No me escuchan cuando hablo", diag:"Micrófono dañado o tapado. En varios modelos va en el flex de carga.", repuesto:"Micrófono / flex de carga", parte:"mic", tiempo:"30–90 min", dif:2, tips:"Probar con grabadora de voz y con manos libres para aislar el micrófono fallado." },
  { cat:"audio", sintoma:"Sonido distorsionado o bajo", diag:"Altavoz con membrana rota o entrada de líquido.", repuesto:"Buzzer / auricular", parte:"buzzer", tiempo:"30–60 min", dif:2, tips:"" },
  { cat:"audio", sintoma:"No detecta los auriculares con cable", diag:"Jack 3.5 sucio o dañado (suele venir en el flex de carga).", repuesto:"Flex de carga/jack", parte:"pin", tiempo:"30–90 min", dif:2, tips:"" },
  // CÁMARA
  { cat:"camara", sintoma:"Cámara trasera no abre o pantalla negra", diag:"Módulo de cámara dañado o flex desconectado. Puede ser software.", repuesto:"Cámara trasera", parte:"camara", tiempo:"30–60 min", dif:2, tips:"Probar con otra app de cámara antes de abrir." },
  { cat:"camara", sintoma:"Fotos borrosas o no enfoca", diag:"Lente rayado/roto o motor de enfoque dañado.", repuesto:"Vidrio de cámara o módulo de cámara", parte:"vidriocam", tiempo:"20–60 min", dif:1, tips:"Si solo está roto el vidrito externo, es un cambio barato." },
  { cat:"camara", sintoma:"Cámara frontal no funciona", diag:"Cámara frontal dañada o flex suelto.", repuesto:"Cámara frontal", parte:"camaraf", tiempo:"30–60 min", dif:2, tips:"" },
  { cat:"camara", sintoma:"El flash no funciona", diag:"LED de flash quemado o IC de flash. Verificar que no sea por batería baja.", repuesto:"Flash / reparación de placa", parte:"placa", tiempo:"30–90 min", dif:2, tips:"" },
  // RED
  { cat:"red", sintoma:"Sin señal / sin servicio", diag:"Antena desconectada, IMEI nulo o IC de red (PA). Verificar IMEI con *#06#.", repuesto:"Antena / reparación de placa", parte:"placa", tiempo:"1–3 h", dif:3, tips:"IMEI nulo o 000 = problema de software/placa. Chequear también que no esté bloqueado por robo." },
  { cat:"red", sintoma:"No lee la SIM", diag:"Lector de SIM dañado o pines doblados. En algunos modelos, flex del lector.", repuesto:"Lector SIM", parte:"sim", tiempo:"1–2 h", dif:3, tips:"Probar con otra SIM primero." },
  { cat:"red", sintoma:"WiFi no enciende o se apaga solo", diag:"IC WiFi en falla o antena. Común después de golpes.", repuesto:"Reparación de placa", parte:"placa", tiempo:"1–3 h", dif:4, tips:"Resoldado/reballing del IC WiFi." },
  { cat:"red", sintoma:"Bluetooth no funciona", diag:"IC WiFi/BT (comparten chip) o software.", repuesto:"Reparación de placa", parte:"placa", tiempo:"1–3 h", dif:4, tips:"Probar reset de red primero." },
  { cat:"red", sintoma:"GPS no toma ubicación", diag:"Antena GPS suelta o IC. Verificar también los permisos de ubicación.", repuesto:"Antena / placa", parte:"placa", tiempo:"1–2 h", dif:3, tips:"" },
  // SOFTWARE
  { cat:"software", sintoma:"Se queda en el logo / no arranca el sistema", diag:"Sistema corrupto (bootloop). Flasheo de firmware oficial.", repuesto:"Ninguno (software)", parte:"software", tiempo:"1–2 h", dif:2, tips:"Si tiene cuenta Google, avisar que después pedirá la cuenta (FRP). Hacer backup si es posible." },
  { cat:"software", sintoma:"Olvidó el patrón / PIN", diag:"Formateo de fábrica desde recovery. Se pierden los datos.", repuesto:"Ninguno (software)", parte:"software", tiempo:"30–60 min", dif:1, tips:"Pedir DNI y factura/comprobante: no desbloquear equipos de dudosa procedencia." },
  { cat:"software", sintoma:"Pide cuenta Google después de formatear (FRP)", diag:"Bloqueo FRP. Se quita con herramientas según marca/chipset.", repuesto:"Ninguno (software)", parte:"frp", tiempo:"30–90 min", dif:3, tips:"Exigir comprobante de propiedad. Guardar foto del DNI y del IMEI." },
  { cat:"software", sintoma:"Muy lento, se tilda, apps se cierran", diag:"Almacenamiento lleno, apps basura o sistema degradado. Limpieza o formateo.", repuesto:"Ninguno (software)", parte:"software", tiempo:"30–60 min", dif:1, tips:"Ofrecer backup de fotos y contactos." },
  { cat:"software", sintoma:"Bloqueado por operador / quiere liberar", diag:"Desbloqueo de operador (unlock por código o servidor).", repuesto:"Ninguno (software)", parte:"liberacion", tiempo:"variable", dif:2, tips:"Verificar que el equipo no esté reportado." },
  { cat:"software", sintoma:"Problema con el IMEI", diag:"IMEI nulo/corrupto por mal flasheo. Reparación de IMEI original (solo con el IMEI de la caja).", repuesto:"Ninguno (software)", parte:"imei", tiempo:"1–2 h", dif:4, tips:"Solo restaurar el IMEI original del equipo. Cambiar IMEI es ilegal." },
  // FÍSICO
  { cat:"fisico", sintoma:"Se mojó / cayó al agua", diag:"Daño por líquido. Limpieza con ultrasonido y alcohol isopropílico, revisión de corrosión. Sin garantía.", repuesto:"Limpieza + posibles repuestos", parte:"limpieza", tiempo:"24–48 h", dif:3, tips:"Decirle al cliente que NO lo cargue ni lo encienda. El arroz no sirve. Presupuesto final después de abrir." },
  { cat:"fisico", sintoma:"Botón de encendido no funciona", diag:"Flex de botón power dañado o botón físico roto.", repuesto:"Flex power", parte:"flexpower", tiempo:"45–90 min", dif:2, tips:"Mientras tanto se puede encender conectando el cargador en varios modelos." },
  { cat:"fisico", sintoma:"Botones de volumen no responden", diag:"Flex de volumen dañado o suciedad.", repuesto:"Flex volumen", parte:"flexvol", tiempo:"45–90 min", dif:2, tips:"" },
  { cat:"fisico", sintoma:"Tapa trasera rota", diag:"Reemplazo de tapa trasera (vidrio o plástico).", repuesto:"Tapa trasera", parte:"tapa", tiempo:"30–60 min", dif:1, tips:"En tapas de vidrio usar calor y mucha paciencia; cuidar el lente de cámara." },
  { cat:"fisico", sintoma:"Marco doblado / carcasa deformada", diag:"Cambio de marco o chasis. Trabajo largo (se pasan todos los componentes).", repuesto:"Marco/chasis", parte:"marco", tiempo:"2–4 h", dif:4, tips:"Verificar que la pantalla no haya sufrido también." },
  { cat:"fisico", sintoma:"Huella digital no funciona", diag:"Sensor de huella dañado o flex. En huella bajo pantalla, suele ser el módulo.", repuesto:"Sensor de huella / flex", parte:"huella", tiempo:"45–90 min", dif:3, tips:"En Samsung/Xiaomi con huella óptica: calibrar después del cambio." },
  { cat:"fisico", sintoma:"Vibrador no funciona", diag:"Motor de vibración dañado.", repuesto:"Vibrador", parte:"vibrador", tiempo:"30–60 min", dif:1, tips:"" },
  { cat:"fisico", sintoma:"Sensor de proximidad falla (pantalla se apaga en llamadas)", diag:"Sensor de proximidad dañado, vidrio templado mal puesto o módulo genérico.", repuesto:"Sensor / flex / calibración", parte:"proximidad", tiempo:"30–60 min", dif:2, tips:"Probar sin vidrio templado y sin funda primero." }
];

const ESTADOS_ORDEN = ["Recibido","Diagnóstico","Esperando repuesto","En reparación","Listo","Entregado","Sin reparación"];

// Repuestos: tres niveles de calidad con precio de referencia (ARS, oct 2026, publicaciones de Mercado Libre y
// proveedores como Novocell / TécnicoCerca), por gama del equipo. El robot de precios (scripts/actualizar-precios.mjs)
// reemplaza estos valores por los reales del modelo exacto, con envío gratis y link a la publicación.
//   economico = compatible / calidad china (incell, TFT, genérico)   original = "calidad original" (AAA, OLED compatible)
//   premium   = original de fábrica / service pack
const NIVELES = {
  economico: { nombre: "Económico", sub: "compatible · calidad china", desc: "Incell, TFT o genérico. Es lo más barato: dura menos y el brillo y los colores son inferiores. Para equipos de poco valor o clientes que piden lo mínimo." },
  original:  { nombre: "Calidad original", sub: "AAA · OLED compatible", desc: "La opción más usada en talleres: buena calidad a precio razonable. Recomendala por defecto." },
  premium:   { nombre: "Premium", sub: "original · service pack", desc: "Repuesto original de fábrica o equivalente. Máxima calidad y garantía; conviene en gama alta e iPhone." }
};
const NIVEL_DEFECTO = "original";
const REPUESTOS = {
  modulo:     { nombre:"Módulo de pantalla", ml:"modulo pantalla", baja:[18000,26000,38000], media:[35000,65000,110000], alta:[90000,160000,280000], iphone:[45000,95000,170000] },
  bateria:    { nombre:"Batería", ml:"bateria", baja:[12000,16000,22000], media:[15000,22000,32000], alta:[22000,35000,55000], iphone:[18000,28000,45000] },
  pin:        { nombre:"Pin / flex de carga", ml:"flex pin de carga", baja:[5000,8500,13000], media:[8000,13000,20000], alta:[15000,25000,42000], iphone:[14000,24000,40000] },
  auricular:  { nombre:"Auricular", ml:"auricular", baja:[3000,5000,8000], media:[4500,7500,12000], alta:[8000,13000,22000], iphone:[7000,12000,20000] },
  buzzer:     { nombre:"Buzzer / altavoz", ml:"buzzer parlante", baja:[4000,6500,10000], media:[6000,9500,15000], alta:[10000,16000,26000], iphone:[9000,15000,25000] },
  mic:        { nombre:"Micrófono", ml:"microfono flex", baja:[3500,6000,9000], media:[5000,9000,14000], alta:[9000,15000,25000], iphone:[9000,15000,26000] },
  camara:     { nombre:"Cámara trasera", ml:"camara trasera", baja:[9000,14000,22000], media:[16000,28000,45000], alta:[40000,75000,130000], iphone:[35000,70000,140000] },
  camaraf:    { nombre:"Cámara frontal", ml:"camara frontal", baja:[5000,8500,13000], media:[8000,14000,22000], alta:[18000,32000,55000], iphone:[16000,30000,55000] },
  vidriocam:  { nombre:"Vidrio de cámara", ml:"vidrio camara", baja:[2000,3500,6000], media:[3000,5000,8500], alta:[5000,8000,14000], iphone:[5000,9000,16000] },
  sim:        { nombre:"Lector SIM", ml:"lector sim", baja:[2500,4000,6500], media:[3500,6000,9000], alta:[6000,9500,15000], iphone:[6000,10000,16000] },
  flexpower:  { nombre:"Flex de encendido", ml:"flex power encendido", baja:[3500,5500,8500], media:[5000,8000,12000], alta:[9000,14000,22000], iphone:[10000,16000,26000] },
  flexvol:    { nombre:"Flex de volumen", ml:"flex volumen", baja:[3500,5500,8500], media:[5000,8000,12000], alta:[9000,14000,22000], iphone:[10000,16000,26000] },
  tapa:       { nombre:"Tapa trasera", ml:"tapa trasera", baja:[6000,10000,15000], media:[10000,18000,28000], alta:[25000,45000,75000], iphone:[20000,40000,80000] },
  marco:      { nombre:"Marco / chasis", ml:"marco chasis", baja:[10000,16000,25000], media:[20000,32000,50000], alta:[45000,75000,120000], iphone:[40000,70000,130000] },
  huella:     { nombre:"Sensor de huella", ml:"sensor huella flex", baja:[4500,7500,11000], media:[7000,12000,18000], alta:[15000,25000,40000], iphone:[15000,25000,40000] },
  vibrador:   { nombre:"Motor vibrador", ml:"vibrador motor", baja:[2500,4000,6000], media:[3500,5500,8500], alta:[6000,10000,16000], iphone:[7000,12000,20000] },
  proximidad: { nombre:"Sensor de proximidad", ml:"sensor proximidad flex", baja:[3500,5500,8500], media:[5000,8000,12000], alta:[9000,14000,22000], iphone:[10000,16000,26000] },
  placa:      { nombre:"Componente de placa (IC)", ml:"ic", baja:[4000,8000,14000], media:[6000,12000,22000], alta:[12000,25000,45000], iphone:[12000,25000,50000] },
  limpieza:   { nombre:"Insumos de limpieza", ml:"alcohol isopropilico", unico:true, baja:[3000,3000,3000], media:[3000,3000,3000], alta:[3000,3000,3000], iphone:[3000,3000,3000] },
  software:   { nombre:"Sin repuesto", ml:"", baja:[0,0,0], media:[0,0,0], alta:[0,0,0], iphone:[0,0,0] }
};

// Tipos de trabajo: definen la mano de obra base (gama baja, ARS, mercado oct 2026) y qué repuesto llevan.
// Media ×1.3 · Alta ×1.7 · iPhone +25%. Son ~20 números en vez de uno por falla: se editan desde Ajustes.
const TRABAJOS = {
  modulo:     { nombre:"Cambio de módulo / pantalla", mo:25000, repuesto:"modulo" },
  bateria:    { nombre:"Cambio de batería", mo:17500, repuesto:"bateria" },
  pin:        { nombre:"Pin / flex de carga", mo:28000, repuesto:"pin" },
  auricular:  { nombre:"Auricular", mo:17500, repuesto:"auricular" },
  buzzer:     { nombre:"Buzzer / altavoz", mo:17500, repuesto:"buzzer" },
  mic:        { nombre:"Micrófono", mo:20000, repuesto:"mic" },
  camara:     { nombre:"Cámara trasera", mo:17500, repuesto:"camara" },
  camaraf:    { nombre:"Cámara frontal", mo:17500, repuesto:"camaraf" },
  vidriocam:  { nombre:"Vidrio de cámara", mo:12000, repuesto:"vidriocam" },
  sim:        { nombre:"Lector SIM", mo:30000, repuesto:"sim" },
  placa:      { nombre:"Reparación de placa (IC)", mo:40000, repuesto:"placa" },
  limpieza:   { nombre:"Limpieza por líquido", mo:30000, repuesto:"limpieza" },
  flexpower:  { nombre:"Flex de encendido", mo:22000, repuesto:"flexpower" },
  flexvol:    { nombre:"Flex de volumen", mo:20000, repuesto:"flexvol" },
  tapa:       { nombre:"Tapa trasera", mo:15000, repuesto:"tapa" },
  marco:      { nombre:"Marco / chasis", mo:55000, repuesto:"marco" },
  huella:     { nombre:"Sensor de huella", mo:22000, repuesto:"huella" },
  vibrador:   { nombre:"Vibrador", mo:15000, repuesto:"vibrador" },
  proximidad: { nombre:"Sensor de proximidad", mo:17500, repuesto:"proximidad" },
  software:   { nombre:"Software (flasheo / formateo)", mo:10500, repuesto:null },
  frp:        { nombre:"Quitar cuenta Google (FRP)", mo:17500, repuesto:null },
  imei:       { nombre:"Reparación de IMEI", mo:25000, repuesto:null },
  liberacion: { nombre:"Liberar de operador", mo:12000, repuesto:null }
};

// Versión de la app y repo de GitHub. El workflow de build copia la versión de package.json acá.
const APP_VERSION = "2.1.1";
const REPO = "yoelpaez2004-hub/CeluFacil";
const PRECIOS_URL = `https://raw.githubusercontent.com/${REPO}/main/www/precios-ml.json`;

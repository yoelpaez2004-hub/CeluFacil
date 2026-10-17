// ===== Celu Fácil — Base de datos =====
// Marcas, gamas de modelos, fallas, tipos de trabajo y precios (ARS). La mano de obra se edita desde Ajustes.

const MARCAS = {
  Samsung: {
    alta: ["Galaxy S25 Ultra","Galaxy S25+","Galaxy S25","Galaxy S25 FE","Galaxy S24 Ultra","Galaxy S24+","Galaxy S24","Galaxy S24 FE","Galaxy S23 Ultra","Galaxy S23+","Galaxy S23","Galaxy S23 FE","Galaxy S22 Ultra","Galaxy S22+","Galaxy S22","Galaxy S21 Ultra","Galaxy S21+","Galaxy S21","Galaxy S21 FE","Galaxy S20 Ultra","Galaxy S20+","Galaxy S20","Galaxy S20 FE","Galaxy S10+","Galaxy S10","Galaxy S10e","Galaxy Note 20 Ultra","Galaxy Note 20","Galaxy Note 10+","Galaxy Note 10","Galaxy Z Flip 6","Galaxy Z Flip 5","Galaxy Z Flip 4","Galaxy Z Flip 3","Galaxy Z Fold 6","Galaxy Z Fold 5","Galaxy Z Fold 4"],
    media: ["Galaxy A56","Galaxy A55","Galaxy A54","Galaxy A53","Galaxy A52s","Galaxy A52","Galaxy A51","Galaxy A50","Galaxy A36","Galaxy A35","Galaxy A34","Galaxy A33","Galaxy A32","Galaxy A31","Galaxy A30s","Galaxy A30","Galaxy A26","Galaxy A25","Galaxy A24","Galaxy A23","Galaxy A22","Galaxy A21s","Galaxy A20s","Galaxy A20","Galaxy A17","Galaxy A16","Galaxy A15","Galaxy A73","Galaxy A72","Galaxy A71","Galaxy A70","Galaxy M55","Galaxy M54","Galaxy M53","Galaxy M35","Galaxy M34","Galaxy M33","Galaxy M32","Galaxy M23","Galaxy M22","Galaxy S9+","Galaxy S9","Galaxy S8+","Galaxy S8","Galaxy Note 9","Galaxy Note 8","Galaxy A9 2018","Galaxy A8 2018","Galaxy A7 2018","Galaxy A80","Galaxy A60"],
    baja: ["Galaxy A14","Galaxy A13","Galaxy A12","Galaxy A11","Galaxy A10s","Galaxy A10","Galaxy A07","Galaxy A06","Galaxy A05s","Galaxy A05","Galaxy A04s","Galaxy A04e","Galaxy A04","Galaxy A03s","Galaxy A03 Core","Galaxy A03","Galaxy A02s","Galaxy A02","Galaxy A01 Core","Galaxy A01","Galaxy M15","Galaxy M14","Galaxy M13","Galaxy M12","Galaxy M11","Galaxy M10","Galaxy J8","Galaxy J7 Prime","Galaxy J7 Pro","Galaxy J7 Neo","Galaxy J7","Galaxy J6+","Galaxy J6","Galaxy J5 Prime","Galaxy J5","Galaxy J4+","Galaxy J4 Core","Galaxy J4","Galaxy J2 Core","Galaxy J2 Prime","Galaxy A6+","Galaxy A6","Galaxy A5 2017","Galaxy A3 2017"]
  },
  Motorola: {
    alta: ["Edge 60 Pro","Edge 60 Fusion","Edge 60","Edge 50 Ultra","Edge 50 Pro","Edge 50 Fusion","Edge 50 Neo","Edge 50","Edge 40 Pro","Edge 40","Edge 40 Neo","Edge 30 Ultra","Edge 30 Pro","Edge 30 Fusion","Edge 30 Neo","Edge 30","Edge 20 Pro","Edge 20","Edge 20 Lite","Edge+","Edge","Razr 60 Ultra","Razr 60","Razr 50 Ultra","Razr 50","Razr 40 Ultra","Razr 40","Moto G200","Moto G100"],
    media: ["Moto G86","Moto G85","Moto G84","Moto G82","Moto G75","Moto G73","Moto G72","Moto G71","Moto G62","Moto G60s","Moto G60","Moto G56","Moto G55","Moto G54","Moto G53","Moto G52","Moto G51","Moto G50","Moto G45","Moto G42","Moto G41","Moto G40 Fusion","Moto G35","Moto G34","Moto G32","Moto G31","Moto G30","Moto G Stylus","Moto G 5G","Moto G9 Plus","Moto G8 Plus","Moto G7 Plus","Moto G6 Plus","Moto One Fusion+","Moto One Hyper","Moto One Zoom","Moto One Vision","Moto One Action"],
    baja: ["Moto G24 Power","Moto G24","Moto G23","Moto G22","Moto G20","Moto G15","Moto G14","Moto G13","Moto G10","Moto G05","Moto G04","Moto G9 Play","Moto G9 Power","Moto G8 Play","Moto G8 Power","Moto G8 Power Lite","Moto G8","Moto G7 Play","Moto G7 Power","Moto G7","Moto G6 Play","Moto G6","Moto G5S Plus","Moto G5S","Moto G5 Plus","Moto G5","Moto E40","Moto E32","Moto E30","Moto E22","Moto E20","Moto E14","Moto E13","Moto E7 Power","Moto E7i Power","Moto E7 Plus","Moto E7","Moto E6s","Moto E6 Play","Moto E6 Plus","Moto E6i","Moto E6","Moto E5 Play","Moto E5 Plus","Moto E5","Moto E4 Plus","Moto E4","Moto One Fusion","Moto One Macro","Moto One","Moto C Plus","Moto C"]
  },
  Xiaomi: {
    alta: ["Xiaomi 15","Xiaomi 14T Pro","Xiaomi 14T","Xiaomi 14","Xiaomi 13T Pro","Xiaomi 13T","Xiaomi 13 Pro","Xiaomi 13","Xiaomi 13 Lite","Xiaomi 12T Pro","Xiaomi 12T","Xiaomi 12 Pro","Xiaomi 12","Xiaomi 12 Lite","Xiaomi 11T Pro","Xiaomi 11T","Xiaomi 11 Lite 5G NE","Mi 11","Mi 11 Lite","Mi 10T Pro","Mi 10T","Mi 10T Lite","Mi 10","Mi 9T Pro","Mi 9T","Mi 9","POCO F7 Pro","POCO F7","POCO F6 Pro","POCO F6","POCO F5 Pro","POCO F5","POCO F4","POCO F3","POCO X7 Pro","POCO X6 Pro"],
    media: ["Redmi Note 14 Pro+","Redmi Note 14 Pro","Redmi Note 14","Redmi Note 13 Pro+","Redmi Note 13 Pro","Redmi Note 13","Redmi Note 12 Pro+","Redmi Note 12 Pro","Redmi Note 12S","Redmi Note 12","Redmi Note 11 Pro+","Redmi Note 11 Pro","Redmi Note 11S","Redmi Note 11","Redmi Note 10 Pro","Redmi Note 10S","Redmi Note 10","Redmi Note 9 Pro","Redmi Note 9S","Redmi Note 9","Redmi Note 8 Pro","Redmi Note 8","Redmi Note 7","POCO X7","POCO X6","POCO X5 Pro","POCO X5","POCO X4 Pro","POCO X3 Pro","POCO X3 NFC","POCO X3","POCO M6 Pro","POCO M5s","POCO M4 Pro","POCO M3 Pro","Mi A3","Mi A2","Mi A2 Lite","Mi A1"],
    baja: ["Redmi 15C","Redmi 14C","Redmi 13","Redmi 13C","Redmi 12","Redmi 12C","Redmi 10","Redmi 10C","Redmi 10A","Redmi 9","Redmi 9T","Redmi 9C","Redmi 9A","Redmi 8","Redmi 8A","Redmi 7","Redmi 7A","Redmi 6","Redmi 6A","Redmi A5","Redmi A3","Redmi A2","Redmi A1","POCO C75","POCO C65","POCO C61","POCO C55","POCO C51","POCO C40","POCO M6","POCO M5","POCO M3"]
  },
  iPhone: {
    alta: ["iPhone 17 Pro Max","iPhone 17 Pro","iPhone 17","iPhone Air","iPhone 16 Pro Max","iPhone 16 Pro","iPhone 16 Plus","iPhone 16","iPhone 15 Pro Max","iPhone 15 Pro","iPhone 15 Plus","iPhone 15","iPhone 14 Pro Max","iPhone 14 Pro","iPhone 14 Plus","iPhone 14","iPhone 13 Pro Max","iPhone 13 Pro","iPhone 12 Pro Max","iPhone 12 Pro"],
    media: ["iPhone 16e","iPhone 13","iPhone 13 mini","iPhone 12","iPhone 12 mini","iPhone 11 Pro Max","iPhone 11 Pro","iPhone XS Max","iPhone XS","iPhone SE 2022"],
    baja: ["iPhone 11","iPhone XR","iPhone X","iPhone 8 Plus","iPhone 8","iPhone 7 Plus","iPhone 7","iPhone 6s Plus","iPhone 6s","iPhone 6 Plus","iPhone 6","iPhone SE 2020","iPhone SE 2016"]
  },
  TCL: {
    alta: ["TCL 50 Pro NxtPaper","TCL 40 NxtPaper","TCL 20 Pro 5G","TCL 10 Pro"],
    media: ["TCL 50 SE","TCL 50 5G","TCL 40 SE","TCL 40 R","TCL 30 SE","TCL 30+","TCL 30","TCL 20 SE","TCL 20L+","TCL 20L","TCL 20 R","TCL 10 SE","TCL 10L","TCL 10 Plus"],
    baja: ["TCL 505","TCL 501","TCL 408","TCL 406","TCL 405","TCL 403","TCL 306","TCL 305","TCL 30E","TCL 20E","TCL 20Y","TCL L10","TCL L7","TCL L5","TCL L3","TCL 1","TCL 1B"]
  },
  ZTE: {
    alta: ["Axon 40 Ultra","Axon 30","Axon 20","nubia Z60 Ultra","nubia Neo 2","nubia Neo"],
    media: ["Blade V60 Design","Blade V60","Blade V50 Design","Blade V50 Smart","Blade V40 Vita","Blade V40 Design","Blade V40","Blade V30","Blade V30 Vita","Blade V2020","Blade A75","Blade A73","Blade A72","Blade A71","Blade V10","Blade V9"],
    baja: ["Blade A55","Blade A54","Blade A53","Blade A52","Blade A51","Blade A35","Blade A34","Blade A33","Blade A31","Blade A31 Lite","Blade A7s","Blade A7","Blade A5","Blade A3","Blade A3 Lite","Blade L9","Blade L8","Blade A0620"]
  },
  Realme: {
    alta: ["Realme GT 7 Pro","Realme GT 6","Realme GT 5","Realme GT 2 Pro","Realme GT Neo 3","Realme 14 Pro+","Realme 13 Pro+","Realme 12 Pro+","Realme 11 Pro+","Realme 11 Pro","Realme 9 Pro+"],
    media: ["Realme 14","Realme 13","Realme 12+","Realme 12","Realme 11","Realme 10","Realme 9 Pro","Realme 9","Realme 9i","Realme 8 Pro","Realme 8","Realme 8i","Realme 7 Pro","Realme 7","Realme 7i","Realme 6 Pro","Realme 6","Realme 6i","Realme 5 Pro","Realme C75","Realme C67","Realme C65","Realme C63","Realme C55","Realme Note 60","Realme Note 50"],
    baja: ["Realme C61","Realme C53","Realme C51","Realme C35","Realme C33","Realme C31","Realme C30","Realme C25Y","Realme C25s","Realme C25","Realme C21Y","Realme C21","Realme C20","Realme C15","Realme C12","Realme C11","Realme C3","Realme C2","Realme 5","Realme 5i","Realme Narzo 50","Realme Narzo 50i","Realme Narzo 50A"]
  },
  Huawei: {
    alta: ["P60 Pro","P50 Pro","P50","P40 Pro","P40","P30 Pro","P30","P20 Pro","Mate 50 Pro","Mate 40 Pro","Mate 30 Pro","Mate 20 Pro","Mate 20","Nova 12","Nova 11","Nova 10 Pro"],
    media: ["Nova 10","Nova 9","Nova 8i","Nova 8","Nova 7i","Nova 5T","Nova 3","Nova 3i","P40 Lite","P30 Lite","P20 Lite","P20","P10 Lite","P10","Mate 20 Lite","Mate 10 Lite","P smart 2021","P smart 2020","P smart 2019","P smart Z","P smart","Y9s","Y9 Prime 2019","Y9 2019","Y8p","Y7p","Y7a","Y7 2019","Y7 2018"],
    baja: ["Y6p","Y6s","Y6 2019","Y6 2018","Y6 Prime 2018","Y5p","Y5 2019","Y5 2018","Y5 Lite","Y3 2018","Honor 8X","Honor 9X","Honor 10 Lite","Honor 8A","Honor 7A"]
  },
  Nokia: {
    alta: ["Nokia X30","Nokia XR21","Nokia XR20","Nokia 8.3","Nokia 9 PureView"],
    media: ["Nokia G60","Nokia G50","Nokia G42","Nokia G22","Nokia G21","Nokia G20","Nokia G11 Plus","Nokia G11","Nokia G10","Nokia X20","Nokia X10","Nokia 5.4","Nokia 5.3","Nokia 7.2","Nokia 7.1","Nokia 6.2","Nokia 6.1 Plus","Nokia 6.1","Nokia 7 Plus","Nokia 5.1 Plus","Nokia 8"],
    baja: ["Nokia C32","Nokia C31","Nokia C30","Nokia C22","Nokia C21 Plus","Nokia C21","Nokia C20","Nokia C12","Nokia C10","Nokia C02","Nokia C01 Plus","Nokia C3","Nokia C2 2nd Edition","Nokia C2","Nokia C1 Plus","Nokia C1","Nokia 3.4","Nokia 2.4","Nokia 2.3","Nokia 2.2","Nokia 2.1","Nokia 1.4","Nokia 1.3","Nokia 1 Plus","Nokia 1","Nokia 3.2","Nokia 3.1","Nokia 4.2","Nokia 5.1","Nokia 5","Nokia 6","Nokia 3"]
  },
  Alcatel: {
    alta: [],
    media: ["Alcatel 5V","Alcatel 5","Alcatel 3X 2020","Alcatel 3X 2019","Alcatel 3X","Alcatel 3V","Alcatel 3L 2021","Alcatel 3L 2020","Alcatel 3L","Alcatel 3 2019","Alcatel 3","Alcatel 1S 2021","Alcatel 1S 2020","Alcatel 1S","Alcatel A7","Alcatel Idol 5","Alcatel Idol 4"],
    baja: ["Alcatel 1 2021","Alcatel 1 2019","Alcatel 1","Alcatel 1B 2022","Alcatel 1B 2020","Alcatel 1B","Alcatel 1L 2021","Alcatel 1L","Alcatel 1V 2020","Alcatel 1V","Alcatel 1V Plus","Alcatel 1SE","Alcatel 1X","Alcatel 1C","Alcatel 3C","Alcatel A3","Alcatel A3 XL","Alcatel A5","Alcatel A30","Alcatel U5","Alcatel U50","Alcatel Pixi 4","Alcatel Pixi 4 Plus","Alcatel Pop 4","Alcatel Pop 4+","Alcatel Shine Lite"]
  },
  Noblex: {
    alta: [],
    media: ["Noblex A90","Noblex N553"],
    baja: ["Noblex A80","Noblex A70","Noblex A60 Plus","Noblex A60","Noblex A50 Plus","Noblex A50","Noblex N552","Noblex N551","Noblex N451","Noblex Go 2","Noblex Go+","Noblex Go"]
  },
  LG: {
    alta: ["Wing","Velvet","V60 ThinQ","V50 ThinQ","V40 ThinQ","V35 ThinQ","V30","G8X ThinQ","G8s ThinQ","G8 ThinQ","G7 ThinQ","G6"],
    media: ["K92","K71","K62","K61","K52","K51S","K51","K50S","K50","Q70","Q60","Q6","Stylo 6","Stylo 5","Stylo 4","K12+","K12 Max","X Power 3","X Power 2","G5","G4"],
    baja: ["K42","K41S","K40S","K40","K22","K22+","K20","K11+","K11","K10 2018","K10 2017","K10","K9","K8 2018","K8 2017","K8","K4 2017","K4","W41","W31","W30","X Power","Q Stylus","X4","X2","K3"]
  },
  Sony: {
    alta: ["Xperia 1 V","Xperia 1 IV","Xperia 1 III","Xperia 1 II","Xperia 1","Xperia 5 IV","Xperia 5 III","Xperia 5 II","Xperia 5","Xperia XZ3","Xperia XZ2 Premium","Xperia XZ Premium"],
    media: ["Xperia 10 V","Xperia 10 IV","Xperia 10 III","Xperia 10 II","Xperia 10 Plus","Xperia 10","Xperia XZ2","Xperia XZ2 Compact","Xperia XZ1","Xperia XZ1 Compact","Xperia XZ","Xperia XA2 Ultra","Xperia XA2 Plus","Xperia XA1 Ultra","Xperia XA1 Plus"],
    baja: ["Xperia L4","Xperia L3","Xperia L2","Xperia L1","Xperia XA2","Xperia XA1","Xperia XA","Xperia E5","Xperia Z5","Xperia Z3"]
  },
  BGH: {
    alta: [],
    media: ["Joy X2 Pro","X5"],
    baja: ["Joy X2","Joy Smart","Joy Dual","Joy Max","Joy A6","Joy A5","Joy X","X2","X6"]
  },
  BLU: {
    alta: [],
    media: ["G91 Pro","G91 Max","G91","G71 Plus","G71","F91","G90 Pro","G90","Vivo XL6"],
    baja: ["G50","G50 Plus","G51","G51 Plus","G61","G40","G33","G30","C5L","C6L","C5","Studio X10","Studio X10 Plus","Studio X12","Vivo X6","Vivo XL5","Vivo XI+","Advance L5","Advance A5","J2"]
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
const APP_VERSION = "2.1.2";
const REPO = "yoelpaez2004-hub/CeluFacil";
const PRECIOS_URL = `https://raw.githubusercontent.com/${REPO}/main/www/precios-ml.json`;

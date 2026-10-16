#!/usr/bin/env node
// Copia la versión de package.json a www/data.js (APP_VERSION). Lo corre el workflow antes de compilar.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;
const ruta = join(ROOT, "www", "data.js");
const antes = readFileSync(ruta, "utf8");
const despues = antes.replace(/const APP_VERSION = "[^"]*";/, `const APP_VERSION = "${version}";`);
if (antes === despues && !antes.includes(`const APP_VERSION = "${version}";`)) { console.error("No encontré APP_VERSION en www/data.js"); process.exit(1); }
writeFileSync(ruta, despues);
console.log("APP_VERSION =", version);

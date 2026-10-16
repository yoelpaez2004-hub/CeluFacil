#!/usr/bin/env node
// Pone el ícono de Celu Fácil y los datos de versión dentro del .exe de Neutralino, sin Windows ni wine
// (edita los recursos del ejecutable con la librería resedit, en JavaScript puro).
//   node scripts/exe-icono.mjs <entrada.exe> <icono.ico> <versión> <salida.exe>
import { readFileSync, writeFileSync } from "node:fs";
import * as ResEdit from "resedit";

const [entrada, icono, version, salida] = process.argv.slice(2);
if (!entrada || !icono || !version || !salida) { console.error("uso: exe-icono.mjs <entrada.exe> <icono.ico> <versión> <salida.exe>"); process.exit(1); }

const exe = ResEdit.NtExecutable.from(readFileSync(entrada));
const res = ResEdit.NtExecutableResource.from(exe);

// Ícono: se reemplazan los grupos que ya traiga el .exe (el Explorador muestra el primero) y se asegura el grupo 1
const ico = ResEdit.Data.IconFile.from(readFileSync(icono));
const grupos = new Set(ResEdit.Resource.IconGroupEntry.fromEntries(res.entries).map(g => g.id)); grupos.add(1);
for (const id of grupos) ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, id, 1033, ico.icons.map(i => i.data));

// Datos de versión que muestra Windows en Propiedades → Detalles
const [a = 0, b = 0, c = 0] = String(version).split(".").map(n => Number(n) || 0);
const vi = ResEdit.Resource.VersionInfo.createEmpty();
vi.setFileVersion(a, b, c, 0, 1033);
vi.setProductVersion(a, b, c, 0, 1033);
vi.setStringValues({ lang: 1033, codepage: 1200 }, {
  ProductName: "Celu Fácil", FileDescription: "Celu Fácil — diagnóstico, presupuesto y órdenes para talleres de celulares",
  CompanyName: "Celu Fácil", LegalCopyright: "Logos de marcas: Wikimedia Commons (ver Acerca de)", OriginalFilename: "CeluFacil.exe", InternalName: "CeluFacil",
  FileVersion: `${a}.${b}.${c}.0`, ProductVersion: version
});
vi.outputToResourceEntries(res.entries);

res.outputResource(exe);
writeFileSync(salida, Buffer.from(exe.generate()));
console.log(`Ícono y versión ${version} puestos en ${salida}`);

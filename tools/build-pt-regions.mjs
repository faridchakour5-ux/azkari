#!/usr/bin/env node
/* يولّد netlify/functions/_lib/pt-regions.mts من pt-regions.js (مصدرٌ واحد للتطبيق والخادم).
 *   node tools/build-pt-regions.mjs */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { POLYS, BOXES } = createRequire(import.meta.url)(path.join(ROOT, "pt-regions.js"));
const out = `/* مولَّدٌ من pt-regions.js بـ tools/build-pt-regions.mjs — لا يُعدَّل يدويًّا */
type Pt = [number, number];
const POLYS: Record<string, Pt[]> = ${JSON.stringify(POLYS)};
const BOXES: Record<string, number[][]> = ${JSON.stringify(BOXES)};

function inPoly(lat: number, lng: number, P: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const yi = P[i][0], xi = P[i][1], yj = P[j][0], xj = P[j][1];
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) c = !c;
  }
  return c;
}
export function ptRegion(lat: number, lng: number): "us" | "de" | null {
  if (!(isFinite(lat) && isFinite(lng))) return null;
  if (lat >= 47.2 && lat <= 55.1 && lng >= 5.8 && lng <= 15.1 && inPoly(lat, lng, POLYS.de)) return "de";
  if (lat >= 24.4 && lat <= 49.5 && lng >= -125 && lng <= -66.9 && inPoly(lat, lng, POLYS.us)) return "us";
  for (const b of BOXES.us) if (lat >= b[0] && lat <= b[1] && lng >= b[2] && lng <= b[3]) return "us";
  return null;
}
`;
fs.writeFileSync(path.join(ROOT, "netlify/functions/_lib/pt-regions.mts"), out);
console.log("✓ netlify/functions/_lib/pt-regions.mts");

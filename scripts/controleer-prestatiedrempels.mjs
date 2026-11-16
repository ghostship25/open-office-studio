/**
 * Controleert de #74-meetresultaten van de vaste referenties tegen vaste
 * bovengrenzen. Draait na scripts/meet-rekenbladkern.mjs; zonder drempel,
 * ontbrekende meting of overschrijding faalt de controle.
 */
import { readFile } from "node:fs/promises";

const rapportPad =
  process.argv[2] ??
  process.env.OOS_PRESTATIE_RAPPORT ??
  ".local/prestatie/rekenbladen/kern-rapport.json";
const drempelPad =
  process.env.OOS_PRESTATIE_DREMPELS ?? "scripts/prestatiedrempels.json";

async function lees(pad, wat) {
  try {
    return JSON.parse(await readFile(pad, "utf8"));
  } catch (e) {
    throw new Error(`${wat} onleesbaar (${pad}): ${e.message}`);
  }
}

const drempels = await lees(drempelPad, "Drempelbestand");
const rapport = await lees(rapportPad, "Meetrapport");
if (!Array.isArray(rapport) || !rapport.length)
  throw new Error(`Meetrapport bevat geen gevallen (${rapportPad})`);
if (!drempels?.gevallen || typeof drempels.gevallen !== "object")
  throw new Error(`Drempelbestand heeft geen "gevallen" (${drempelPad})`);

const fouten = [];
const gemeten = new Set();

for (const geval of rapport) {
  gemeten.add(geval.naam);
  const drempel = drempels.gevallen[geval.naam];
  if (!drempel) {
    fouten.push(`${geval.naam}: geen drempel in ${drempelPad}`);
    continue;
  }
  if (geval.fout) {
    fouten.push(
      `${geval.naam}: meting mislukt in fase ${geval.fase ?? "?"} na ${geval.verstrekenMs ?? "?"} ms — ${geval.fout}`,
    );
    continue;
  }
  console.log(
    `${geval.naam} (${geval.platform ?? "?"}/${geval.architectuur ?? "?"}, node ${geval.node ?? "?"})`,
  );
  for (const [veld, max] of Object.entries(drempel)) {
    const waarde = geval[veld];
    if (typeof waarde !== "number" || !Number.isFinite(waarde)) {
      fouten.push(`${geval.naam}: ${veld} ontbreekt of is geen getal`);
      continue;
    }
    const ok = waarde <= max;
    console.log(`  ${veld}: ${waarde} ≤ ${max} ${ok ? "ok" : "TE HOOG"}`);
    if (!ok) fouten.push(`${geval.naam}: ${veld} is ${waarde}, bovengrens ${max}`);
  }
}

for (const naam of Object.keys(drempels.gevallen))
  if (!gemeten.has(naam))
    fouten.push(`${naam}: drempel zonder meting in ${rapportPad}`);

if (fouten.length) {
  console.error(`\nPrestatiedrempels niet gehaald (${fouten.length}):`);
  for (const fout of fouten) console.error(`- ${fout}`);
  process.exitCode = 1;
} else console.log(`\nAlle ${rapport.length} referenties binnen de drempels.`);

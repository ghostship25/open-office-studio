/**
 * Gedeelde onderdelen van haal-lettertypen.mjs en haal-woordenboeken.mjs:
 * bestanden van GitHub halen, ze met sha256 controleren en uit de cache lezen.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

/** Netwerk alleen naar GitHub (repositories en releases). */
const TOEGESTANE_HOSTS = new Set(["raw.githubusercontent.com", "github.com"]);
/** Langer dan dit hoeft geen enkele downloadpoging te duren. */
const TIJD_LIMIET_MS = 10000;

export const sha256 = (data) => createHash("sha256").update(data).digest("hex");

/** Leest een bestand uit de cache, maar alleen als de sha256 klopt. */
export async function uitCache(pad, hash) {
  try {
    const data = await readFile(pad);
    return sha256(data) === hash ? data : null;
  } catch {
    return null;
  }
}

/** Haalt één bestand op: drie pogingen, elk met een time-out. */
async function download(url) {
  if (!TOEGESTANE_HOSTS.has(new URL(url).hostname))
    throw new Error(`Bron buiten GitHub geweigerd: ${url}`);
  let laatste;
  for (let poging = 0; poging < 3; poging++) {
    try {
      const antwoord = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(TIJD_LIMIET_MS),
      });
      if (antwoord.ok) return new Uint8Array(await antwoord.arrayBuffer());
      laatste = new Error(`HTTP ${antwoord.status} voor ${url}`);
      if (antwoord.status === 404) break;
    } catch (e) {
      laatste = e;
    }
  }
  throw laatste;
}

/**
 * Bron voor de bestanden. `haal` geeft null zodra één download door netwerkpech
 * mislukt; de rest komt dan uit de cache of blijft ontbreken, zodat een build
 * zonder netwerk niet per bestand opnieuw hoeft te wachten. `fout` onthoudt de
 * reden voor de melding.
 */
export function netwerkbron(netwerk = true) {
  let actief = netwerk;
  const bron = {
    fout: null,
    async haal(url) {
      if (!actief) return null;
      try {
        return await download(url);
      } catch (e) {
        actief = false;
        bron.fout = e;
        return null;
      }
    },
  };
  return bron;
}

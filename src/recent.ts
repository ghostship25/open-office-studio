import { useCallback, useEffect, useState } from "react";
import { leesInstellingen } from "./instellingen";

/**
 * Recente bestanden.
 *
 * - **Desktop:** Rust bewaart hooguit 100 paden in de app-gegevensmap
 *   (`src-tauri/src/recent.rs`). De webview krijgt per bestand een id, naam,
 *   map, extensie, datum, vastgezet en of het nog bestaat. Openen gaat met het
 *   id via de route van de systeembestanden (dus ook met een pad-token voor
 *   Ctrl+S).
 * - **Browser:** de browser geeft geen paden. We onthouden alleen namen en
 *   datums in sessionStorage; klikken opent de bestandskiezer.
 */
export interface RecentBestand {
  id: string;
  naam: string;
  /** Map op schijf (desktop); leeg in de browser. */
  map: string;
  ext: string;
  /** Milliseconden sinds 1970. */
  datum: number;
  vast: boolean;
  /** Desktop: bestaat het bestand nog? Browser: altijd onwaar (alleen een naam). */
  bestaat: boolean;
}

export const MAX_RECENT = 100;
export const STANDAARD_RECENT = 25;
const SLEUTEL = "openaec-office-recent-session";
const desktop =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

type Opgeslagen = { naam: string; datum: number; vast?: boolean };

/** Vastgezet eerst, daarna nieuwste eerst. */
export function sorteer<T extends { vast?: boolean; datum: number }>(
  lijst: T[],
) {
  return [...lijst].sort(
    (a, b) => Number(!!b.vast) - Number(!!a.vast) || b.datum - a.datum,
  );
}

/** Zelfde regels als in Rust: geen dubbelen, vastgezette blijven, binnen de limiet. */
export function voegToe(
  lijst: Opgeslagen[],
  naam: string,
  datum: number,
  limiet = STANDAARD_RECENT,
): Opgeslagen[] {
  const sleutel = naam.toLowerCase();
  const vast = lijst.some((i) => i.naam.toLowerCase() === sleutel && i.vast);
  const nieuw = sorteer([
    ...lijst.filter((i) => i.naam.toLowerCase() !== sleutel),
    { naam, datum, vast },
  ]);
  const ruimte = Math.max(
    0,
    Math.min(MAX_RECENT, Math.round(limiet)) -
      nieuw.filter((i) => i.vast).length,
  );
  let los = 0;
  return nieuw.filter((i) => i.vast || ++los <= ruimte);
}

function beperk<T extends { vast?: boolean; datum: number }>(
  lijst: T[],
  limiet: number,
): T[] {
  const nieuw = sorteer(lijst);
  const ruimte = Math.max(
    0,
    Math.min(MAX_RECENT, Math.round(limiet)) -
      nieuw.filter((i) => i.vast).length,
  );
  let los = 0;
  return nieuw.filter((i) => i.vast || ++los <= ruimte);
}

function leesBrowser(): Opgeslagen[] {
  try {
    const lijst = JSON.parse(sessionStorage.getItem(SLEUTEL) ?? "[]");
    return Array.isArray(lijst)
      ? lijst.filter(
          (i): i is Opgeslagen =>
            typeof i?.naam === "string" && typeof i?.datum === "number",
        )
      : [];
  } catch {
    return [];
  }
}

const luisteraars = new Set<() => void>();
function schrijfBrowser(lijst: Opgeslagen[]) {
  try {
    sessionStorage.setItem(SLEUTEL, JSON.stringify(lijst));
  } catch {
    // Zonder opslag blijft de lijst leeg; dat is geen fout.
  }
  luisteraars.forEach((f) => f());
}

function alsBestand(i: Opgeslagen): RecentBestand {
  return {
    id: i.naam,
    naam: i.naam,
    map: "",
    ext: /\.([^.]+)$/.exec(i.naam)?.[1]?.toLowerCase() ?? "",
    datum: i.datum,
    vast: !!i.vast,
    bestaat: false,
  };
}

/** Browser: een geopend of gedownload bestand onthouden (alleen de naam). */
export function noteerBrowser(naam: string) {
  if (desktop || !naam) return;
  schrijfBrowser(
    voegToe(leesBrowser(), naam, Date.now(), leesInstellingen().recent.aantal),
  );
}

async function invoke<T>(opdracht: string, args?: Record<string, unknown>) {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(opdracht, args);
}

export function useRecent(limiet = STANDAARD_RECENT) {
  const [lijst, setLijst] = useState<RecentBestand[]>([]);
  const ververs = useCallback(() => {
    if (!desktop) {
      setLijst(beperk(leesBrowser(), limiet).map(alsBestand));
      return;
    }
    invoke<RecentBestand[]>("recente_bestanden")
      .then((bestanden) => setLijst(beperk(bestanden, limiet)))
      .catch(() => setLijst([]));
  }, [limiet]);

  useEffect(() => {
    ververs();
    if (!desktop) {
      const opgeslagen = leesBrowser();
      const beperkt = beperk(opgeslagen, limiet);
      if (JSON.stringify(opgeslagen) !== JSON.stringify(beperkt))
        schrijfBrowser(beperkt);
      luisteraars.add(ververs);
      const opslag = (e: StorageEvent) => e.key === SLEUTEL && ververs();
      window.addEventListener("storage", opslag);
      return () => {
        luisteraars.delete(ververs);
        window.removeEventListener("storage", opslag);
      };
    }
    let stop: (() => void) | undefined;
    let actief = true;
    void import("@tauri-apps/api/event")
      .then(({ listen }) => listen("office-recent", ververs))
      .then((s) => (actief ? (stop = s) : s()))
      .catch(() => undefined);
    // Bestaan kan veranderen terwijl de app open is; bij terugkeer opnieuw kijken.
    window.addEventListener("focus", ververs);
    return () => {
      actief = false;
      stop?.();
      window.removeEventListener("focus", ververs);
    };
  }, [limiet, ververs]);

  return {
    lijst,
    desktop,
    /** Desktop: opent het bestand; onwaar als het niet meer bestaat. */
    open: (id: string) => invoke<boolean>("open_recent", { id }),
    vastzetten(id: string, vast: boolean) {
      if (desktop)
        void invoke("zet_recent_vast", { id, vast }).catch(() => undefined);
      else
        schrijfBrowser(
          sorteer(
            leesBrowser().map((i) => (i.naam === id ? { ...i, vast } : i)),
          ),
        );
    },
    verwijder(id: string) {
      if (desktop)
        void invoke("verwijder_recent", { id }).catch(() => undefined);
      else schrijfBrowser(leesBrowser().filter((i) => i.naam !== id));
    },
    wis() {
      if (desktop) void invoke("wis_recente").catch(() => undefined);
      else schrijfBrowser(leesBrowser().filter((i) => i.vast));
    },
  };
}

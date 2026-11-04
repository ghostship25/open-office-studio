/**
 * Tabel splitsen laadt het document opnieuw (pakketroute), waardoor de
 * geschiedenis van de editor vervalt (#139). Daarom onthouden we hier de
 * bytes vóór en na de splitsing, zodat Ongedaan/Opnieuw (sneltoets en
 * lintknop) die ene stap kunnen terugdraaien zodra de editor zelf niets meer
 * ongedaan of opnieuw kan maken.
 */
interface Splitsing {
  eigenaar: object;
  voor: Uint8Array;
  na: Uint8Array;
  gesplitst: boolean;
}

export interface EditorGeschiedenis {
  kanOngedaan: boolean;
  kanOpnieuw: boolean;
}

let laatste: Splitsing | null = null;
const luisteraars = new Set<() => void>();
let versie = 0;

function meld() {
  versie++;
  luisteraars.forEach((l) => l());
}

export function onthoudSplitsing(eigenaar: object, voor: Uint8Array, na: Uint8Array) {
  laatste = { eigenaar, voor, na, gesplitst: true };
  meld();
}

export function volgSplitsing(luisteraar: () => void) {
  luisteraars.add(luisteraar);
  return () => void luisteraars.delete(luisteraar);
}

export const splitsingVersie = () => versie;

/** De bytes om naar toe te gaan, of null als de editor zelf aan de beurt is. */
export function splitsStap(eigenaar: object, opnieuw: boolean, editor: EditorGeschiedenis) {
  if (!laatste || laatste.eigenaar !== eigenaar) return null;
  // Ongedaan: de editor eerst zijn eigen (latere) stappen laten terugdraaien.
  // Opnieuw: alleen op een onaangeroerde editor, anders gaat nieuw werk verloren.
  if (!opnieuw) return laatste.gesplitst && !editor.kanOngedaan ? laatste.voor : null;
  return !laatste.gesplitst && !editor.kanOpnieuw && !editor.kanOngedaan ? laatste.na : null;
}

/** Legt vast dat de stap is uitgevoerd. */
export function splitsStapGedaan(opnieuw: boolean) {
  if (!laatste) return;
  laatste.gesplitst = opnieuw;
  meld();
}

/** Leest de geschiedenisstatus van de editor (canUndo/canRedo zijn experimenteel). */
export function editorGeschiedenis(weergave: unknown): EditorGeschiedenis {
  const w = weergave as { canUndo?: () => boolean; canRedo?: () => boolean } | null | undefined;
  return { kanOngedaan: w?.canUndo?.() ?? true, kanOpnieuw: w?.canRedo?.() ?? true };
}

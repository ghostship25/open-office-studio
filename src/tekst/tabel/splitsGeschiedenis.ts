/**
 * Tabel splitsen laadt het document opnieuw (pakketroute), waardoor de
 * geschiedenis van de editor vervalt (#139). Daarom onthouden we hier de
 * bytes vóór en na de splitsing, zodat Ctrl+Z / Ctrl+Y die ene stap
 * kunnen terugdraaien zodra de editor zelf niets meer ongedaan kan maken.
 */
interface Splitsing {
  eigenaar: object;
  voor: Uint8Array;
  na: Uint8Array;
  gesplitst: boolean;
}

let laatste: Splitsing | null = null;

export function onthoudSplitsing(eigenaar: object, voor: Uint8Array, na: Uint8Array) {
  laatste = { eigenaar, voor, na, gesplitst: true };
}

export function wisSplitsing() {
  laatste = null;
}

/** De bytes om naar terug te gaan, of null als er niets te draaien valt. */
export function splitsingOngedaan(eigenaar: object, editorKanOngedaan: boolean) {
  if (!laatste || laatste.eigenaar !== eigenaar || !laatste.gesplitst || editorKanOngedaan) return null;
  laatste.gesplitst = false;
  return laatste.voor;
}

export function splitsingOpnieuw(eigenaar: object, editorKanOpnieuw: boolean) {
  if (!laatste || laatste.eigenaar !== eigenaar || laatste.gesplitst || editorKanOpnieuw) return null;
  laatste.gesplitst = true;
  return laatste.na;
}

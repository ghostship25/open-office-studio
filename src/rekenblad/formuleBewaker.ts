/**
 * Weigert invoer waarvan de rekenkern (@betteroffice/xlsx 0.3.0) onbruikbaar
 * wordt (#120): een lege `ISOWEEKNUM()`-aanroep laat de WASM-handle panieken,
 * waarna bewerken en opslaan niet meer lukken. De weigering gebeurt vóór de
 * engine, zodat eerdere wijzigingen intact blijven.
 */
import type { WorkbookHandle } from "@betteroffice/xlsx";

const LEGE_AANROEP = /(?:^|[^\w.])ISOWEEKNUM\s*\(\s*\)/i;

export class OnveiligeFormule extends Error {
  constructor(functie: string) {
    super(`${functie}() heeft een argument nodig; de invoer is niet toegepast.`);
    this.name = "OnveiligeFormule";
  }
}

/** Haalt tekst tussen dubbele aanhalingstekens weg, zodat "ISOWEEKNUM()" als tekst mag. */
function zonderTekst(formule: string) {
  return formule.replace(/"(?:[^"]|"")*"/g, '""');
}

export function isOnveilig(invoer: string) {
  const t = invoer.trimStart();
  if (!t.startsWith("=") && !t.startsWith("+") && !t.startsWith("-")) return false;
  return LEGE_AANROEP.test(zonderTekst(t));
}

function controleer(invoer: unknown) {
  if (typeof invoer === "string" && isOnveilig(invoer)) throw new OnveiligeFormule("ISOWEEKNUM");
}

function controleerOperaties(ops: unknown) {
  if (!Array.isArray(ops)) return;
  for (const op of ops as { inputs?: unknown; formulas?: unknown }[]) {
    for (const matrix of [op?.inputs, op?.formulas]) {
      if (!Array.isArray(matrix)) continue;
      for (const rij of matrix as unknown[]) {
        if (!Array.isArray(rij)) continue;
        // Formules in `setFormulas` staan zonder voorlopig "=".
        for (const cel of rij) controleer(op.formulas === matrix && typeof cel === "string" ? `=${cel}` : cel);
      }
    }
  }
}

/** Zet de bewaking op de invoermethoden van de handle; geeft een functie om haar te verwijderen. */
export function bewaakInvoer(handle: WorkbookHandle): () => void {
  const h = handle as unknown as Record<string, (...args: unknown[]) => unknown>;
  const origineel = {
    editCell: h.editCell,
    editCells: h.editCells,
    applyOps: h.applyOps,
  };
  if (!origineel.editCell || !origineel.editCells || !origineel.applyOps) return () => {};
  h.editCell = function (this: unknown, ...a: unknown[]) {
    controleer(a[3]);
    return origineel.editCell.apply(handle, a);
  };
  h.editCells = function (this: unknown, ...a: unknown[]) {
    if (Array.isArray(a[1])) for (const e of a[1] as { input?: unknown }[]) controleer(e?.input);
    return origineel.editCells.apply(handle, a);
  };
  h.applyOps = function (this: unknown, ...a: unknown[]) {
    controleerOperaties(a[0]);
    return origineel.applyOps.apply(handle, a);
  };
  return () => {
    h.editCell = origineel.editCell;
    h.editCells = origineel.editCells;
    h.applyOps = origineel.applyOps;
  };
}

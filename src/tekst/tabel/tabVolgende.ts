/**
 * Navigatie met Tab in Writer-tabellen (#128, #137). De engine kan bestaande
 * cellen overslaan en verlaat de tabel na de laatste cel.
 */
import type { DocxEditorRef } from "@betteroffice/docx-react";
import { tabelEmbed, tabelPlek, type TabelLoc } from "./opdrachten.ts";
import { engine } from "../gedeeld/engine.ts";
import type { TabelPayload } from "./logica.ts";

export interface TabelCelPositie {
  row: number;
  column: number;
}

/** Volgende fysieke cel in leesvolgorde, of null bij de laatste cel. */
export function volgendeCel(
  payload: Pick<TabelPayload, "rows">,
  huidige: TabelCelPositie,
): TabelCelPositie | null {
  for (let row = huidige.row; row < payload.rows.length; row++) {
    const begin = row === huidige.row ? huidige.column + 1 : 0;
    for (let column = begin; column < (payload.rows[row]?.cells.length ?? 0); column++)
      return { row, column };
  }
  return null;
}

/** Tabel en huidige cel, alleen wanneer de cursor geen bereik selecteert. */
export function tabelCursor(ref: DocxEditorRef | null) {
  try {
    const e = engine(ref);
    const plek = tabelPlek(e.sessie);
    if (!plek) return null;
    const { anchor, head } = plek.bereik;
    if (anchor.row !== head.row || anchor.column !== head.column) return null;
    const { payload } = tabelEmbed(e.sessie, plek.tabel);
    if (!payload.rows[head.row]?.cells[head.column]) return null;
    return { e, tabel: plek.tabel, payload, cel: { row: head.row, column: head.column } };
  } catch {
    return null;
  }
}

/** Zet de cursor in de opgegeven cel. */
export function zetCelCursor(
  ref: DocxEditorRef,
  tabel: TabelLoc,
  positie: TabelCelPositie,
) {
  const e = engine(ref);
  const { payload } = tabelEmbed(e.sessie, tabel);
  const verhaal = payload.rows[positie.row]?.cells[positie.column]?.story;
  const alinea = verhaal ? e.sessie.paragraphs(verhaal)[0] : null;
  if (!verhaal || !alinea) throw new Error("De volgende tabelcel is niet beschikbaar.");
  e.sessie.setSelection({ story: verhaal, paraId: alinea.paraId, offset: 0 });
  e.sessie.setCellSelection({
    anchor: { ...tabel, ...positie },
    head: { ...tabel, ...positie },
  });
  e.ref.focus();
}

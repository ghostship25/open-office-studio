import {
  useDocxCommand,
  type DocxCommandArgs,
  type DocxCommandId,
  type DocxSelectCommandId,
} from "@betteroffice/docx-react";
import {
  useXlsxCommand,
  type XlsxCommandArgs,
  type XlsxCommandId,
  type XlsxSelectCommandId,
} from "@betteroffice/xlsx-react";
import {
  usePptxCommand,
  type PptxCommandArgs,
  type PptxCommandId,
  type PptxSelectCommandId,
} from "@betteroffice/pptx-react";
import { useSyncExternalStore } from "react";
import { Undo2, Redo2, ZoomIn, type LucideIcon } from "lucide-react";
import { useEditorTik } from "../tekst/gedeeld/ui";
import {
  editorGeschiedenis,
  splitsStap,
  splitsStapGedaan,
  splitsingVersie,
  volgSplitsing,
} from "../tekst/tabel/splitsGeschiedenis";
import { useTranslation } from "react-i18next";
import { formatProcent } from "../i18n/opmaak";
import { LettertypeKeuze } from "../lettertypen/LettertypeKeuze";
import {
  presentatieVoorbeeld,
  rekenbladVoorbeeld,
  tekstVoorbeeld,
  voorbereidPresentatie,
  voorbereidRekenblad,
} from "../lettertypen/koppeling";
import { useEditorApi } from "./editorApi";
import { useHerhaalbaar } from "../tekst/bewerken/herhaalmelding";
import {
  Groep,
  OpdrachtKnop,
  OpdrachtKeuze,
  type GebondenOpdracht,
} from "../Ribbon";

export type Knop = { naam: string; icoon: LucideIcon; groot?: boolean };
export function W<K extends DocxCommandId>({
  id,
  args,
  ...props
}: Knop & { id: K; args?: DocxCommandArgs[K] }) {
  const opdracht = useHerhaalbaar(id, useDocxCommand(id, args), args);
  return <OpdrachtKnop {...props} opdracht={opdracht} />;
}
export function C<K extends XlsxCommandId>({
  id,
  args,
  ...props
}: Knop & { id: K; args?: XlsxCommandArgs[K] }) {
  return <OpdrachtKnop {...props} opdracht={useXlsxCommand(id, args)} />;
}
export function P<K extends PptxCommandId>({
  id,
  args,
  ...props
}: Knop & { id: K; args?: PptxCommandArgs[K] }) {
  return <OpdrachtKnop {...props} opdracht={usePptxCommand(id, args)} />;
}
export function WK({
  id,
  naam,
  breed,
  vertaal,
}: {
  id: DocxSelectCommandId;
  naam: string;
  breed?: boolean;
  vertaal?: (naam: string) => string;
}) {
  return (
    <OpdrachtKeuze
      opdracht={useHerhaalbaar(id, useDocxCommand(id))}
      naam={naam}
      breed={breed}
      vertaal={vertaal}
    />
  );
}
export function CK({
  id,
  naam,
  breed,
}: {
  id: XlsxSelectCommandId;
  naam: string;
  breed?: boolean;
}) {
  return (
    <OpdrachtKeuze opdracht={useXlsxCommand(id)} naam={naam} breed={breed} />
  );
}
export function PK({
  id,
  naam,
  breed,
}: {
  id: PptxSelectCommandId;
  naam: string;
  breed?: boolean;
}) {
  return (
    <OpdrachtKeuze opdracht={usePptxCommand(id)} naam={naam} breed={breed} />
  );
}
/** Ongedaan/Opnieuw voor Tekst; kent ook de stap Tabel splitsen (#139). */
function TekstGeschiedenisKnop({ opnieuw, naam, icoon }: Knop & { opnieuw: boolean }) {
  const basis = useDocxCommand(opnieuw ? "redo" : "undo");
  const api = useEditorApi();
  useSyncExternalStore(volgSplitsing, splitsingVersie);
  useEditorTik();
  const herlaad = api.herlaad;
  const bytes = herlaad
    ? splitsStap(herlaad, opnieuw, editorGeschiedenis(api.tekst()?.getEditorRef()))
    : null;
  const opdracht: GebondenOpdracht = bytes
    ? {
        ...basis,
        state: { ...basis.state, enabled: true },
        execute: async () => {
          splitsStapGedaan(opnieuw);
          herlaad!.vervang(bytes);
          return { ok: true };
        },
      }
    : basis;
  return <OpdrachtKnop naam={naam} icoon={icoon} opdracht={opdracht} />;
}
export function Geschiedenis({
  soort,
}: {
  soort: "tekst" | "rekenblad" | "dia";
}) {
  const { t } = useTranslation("ribbon");
  const ongedaan = t("common.undo"),
    opnieuw = t("common.redo");
  return (
    <Groep naam={t("common.edit")}>
      <div className="ribbon-stapel">
        {soort === "tekst" ? (
          <>
            <TekstGeschiedenisKnop opnieuw={false} naam={ongedaan} icoon={Undo2} />
            <TekstGeschiedenisKnop opnieuw naam={opnieuw} icoon={Redo2} />
          </>
        ) : soort === "rekenblad" ? (
          <>
            <C id="undo" naam={ongedaan} icoon={Undo2} />
            <C id="redo" naam={opnieuw} icoon={Redo2} />
          </>
        ) : (
          <>
            <P id="undo" naam={ongedaan} icoon={Undo2} />
            <P id="redo" naam={opnieuw} icoon={Redo2} />
          </>
        )}
      </div>
    </Groep>
  );
}
/** Zoomwaarde buiten de vaste stappen (Ctrl+wiel, schuif): als percentage in de notatie van de taal. */
export function zoomTekst(waarde: unknown) {
  if (typeof waarde !== "number" || !Number.isFinite(waarde) || waarde <= 0) return undefined;
  return formatProcent(Math.round(waarde <= 10 ? waarde * 100 : waarde) / 100);
}
export function Zoom({ opdracht }: { opdracht: GebondenOpdracht }) {
  const { t } = useTranslation("ribbon");
  return (
    <Groep naam={t("common.zoom")}>
      <div className="ribbon-stapel">
        <ZoomIn size={24} strokeWidth={1.5} />
        <OpdrachtKeuze opdracht={opdracht} naam={t("common.zoomLevel")} waardeTekst={zoomTekst} />
      </div>
    </Groep>
  );
}
export function scrollvlakVan(element: Element | null) {
  for (let vlak = element?.parentElement; vlak; vlak = vlak.parentElement)
    if (/(auto|scroll)/.test(getComputedStyle(vlak).overflow)) return vlak;
  return null;
}

/** Lettertypekeuze met voorbeeld en recente lettertypen, per module. */
export function WL() {
  const api = useEditorApi();
  return (
    <LettertypeKeuze
      opdracht={useDocxCommand("fontFamily")}
      voorbeeld={() => tekstVoorbeeld(api.tekst())}
      naKeuze={() => api.tekst()?.focus()}
    />
  );
}
export function CL() {
  return (
    <LettertypeKeuze
      opdracht={useXlsxCommand("fontFamily")}
      voorbeeld={rekenbladVoorbeeld}
      voorbereiden={voorbereidRekenblad}
    />
  );
}
export function PL() {
  const api = useEditorApi();
  return (
    <LettertypeKeuze
      opdracht={usePptxCommand("fontFamily")}
      voorbeeld={() => presentatieVoorbeeld(api.presentatie)}
      voorbereiden={(familie) => voorbereidPresentatie(api.presentatie, familie)}
    />
  );
}

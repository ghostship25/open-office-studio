import type { DocxEditorRef } from "@betteroffice/docx-react";
import i18next from "../../i18n/config";
import { beeldmaat, ONDERSTEUNDE_BEELDEN } from "./logica";

export const AFBEELDING_DROP_EVENT = "office-studio:drop-images";

export interface AfbeeldingDrop {
  bestanden: File[];
  x: number;
  y: number;
}

const MIME_PER_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
};

function mimeType(file: File) {
  if (ONDERSTEUNDE_BEELDEN.includes(file.type)) return file.type;
  const ext = /\.([^.]+)$/.exec(file.name)?.[1]?.toLowerCase() ?? "";
  return MIME_PER_EXT[ext] ?? null;
}

export function isOndersteundBeeldbestand(file: File) {
  return mimeType(file) !== null;
}

/** Leest een ondersteund beeld als data-URL met zijn pixelmaat. */
export async function leesBeeld(file: File) {
  if (!mimeType(file))
    throw new Error(i18next.t("writer:picture.errors.unsupported"));
  if (file.size > 25 * 1024 * 1024)
    throw new Error(i18next.t("writer:picture.errors.tooLarge", { size: "25 MB" }));
  const bytes = new Uint8Array(await file.arrayBuffer());
  const natuurlijk = beeldmaat(bytes);
  if (!natuurlijk)
    throw new Error(i18next.t("writer:picture.errors.unreadable"));
  const src = await new Promise<string>((klaar, fout) => {
    const lezer = new FileReader();
    lezer.onload = () => klaar(String(lezer.result));
    lezer.onerror = () =>
      fout(new Error(i18next.t("writer:picture.errors.readFailed")));
    lezer.readAsDataURL(file);
  });
  return { src, natuurlijk };
}

/** Inserts dropped images at the text position beneath the drop point. */
export async function voegAfbeeldingenIn(
  ref: DocxEditorRef | null,
  bestanden: File[],
  x: number,
  y: number,
) {
  const editor = ref?.getEditorRef();
  const punt = ref?.getPositionAtPoint(x, y);
  if (!editor || !punt || punt.region !== "body")
    throw new Error(i18next.t("writer:picture.errors.selectPicture"));

  editor.setSelection(punt.position);
  editor.focus();
  for (const bestand of bestanden) {
    const beeld = await leesBeeld(bestand);
    if (
      !editor.applyYrsCommand({
        type: "insertImage",
        image: {
          src: beeld.src,
          alt: bestand.name,
          width: beeld.natuurlijk.breedte,
          height: beeld.natuurlijk.hoogte,
          wrapType: "inline",
          displayMode: "inline",
          distTop: 0,
          distBottom: 0,
          distLeft: 0,
          distRight: 0,
        },
      })
    )
      throw new Error(i18next.t("writer:picture.errors.unreadable"));
  }
}

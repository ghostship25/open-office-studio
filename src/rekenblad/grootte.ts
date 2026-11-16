import i18next from "../i18n/config";

/**
 * Bovengrens voor een rekenblad dat de app opent (#74). Boven deze grens
 * weigert de app het bestand met een concrete melding in plaats van het in de
 * editor te laden; de formulecontrole hanteert dezelfde orde van grootte.
 */
export const MAX_REKENBLAD_BYTES = 100 * 1024 * 1024;

export interface RekenbladGrootte {
  bytes: number;
  limiet: number;
  teGroot: boolean;
}

/** Beoordeelt of de bytes nog in de editor passen. */
export function beoordeelRekenbladGrootte(
  bytes: Uint8Array,
  limiet: number = MAX_REKENBLAD_BYTES,
): RekenbladGrootte {
  const lengte = bytes.byteLength;
  return { bytes: lengte, limiet, teGroot: lengte > limiet };
}

/** Grootte in de interfacetaal, bijvoorbeeld "112,4 MB". */
export function formateerBytes(bytes: number): string {
  const stappen: [number, string][] = [
    [1024 ** 3, "GB"],
    [1024 ** 2, "MB"],
    [1024, "KB"],
  ];
  const getal = new Intl.NumberFormat(i18next.language, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
  for (const [maat, eenheid] of stappen)
    if (bytes >= maat) return `${getal.format(bytes / maat)} ${eenheid}`;
  return `${bytes} B`;
}

/** Melding waarmee de app een te groot rekenblad weigert. */
export function meldingTeGroot(grootte: RekenbladGrootte): string {
  return i18next.t("spreadsheet:sizeLimit.tooLarge", {
    size: formateerBytes(grootte.bytes),
    limit: formateerBytes(grootte.limiet),
  }) as string;
}

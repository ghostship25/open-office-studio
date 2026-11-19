/**
 * De kantoorengines halen sommige WASM-bestanden pas op bij opslaan, en bij
 * elke keer opnieuw. Na een nieuwe uitrol van de webversie bestaan die
 * bestanden niet meer, en dan mislukt opslaan terwijl er werk openstaat.
 * Daarom bewaren we eenmaal opgehaalde WASM van de eigen oorsprong in het
 * geheugen. De desktopapp heeft dit niet nodig: daar zijn alle bestanden
 * ingebouwd.
 */
const MAX_BYTES = 96 * 1024 * 1024;

export function isEigenWasm(url: string, oorsprong: string) {
  try {
    const u = new URL(url, oorsprong);
    return u.origin === oorsprong && /\.wasm$/i.test(u.pathname);
  } catch {
    return false;
  }
}

let geinstalleerd = false;

export function bewaarWasmInGeheugen() {
  if (geinstalleerd || "__TAURI_INTERNALS__" in window) return;
  geinstalleerd = true;
  const origineel = window.fetch.bind(window);
  // Een Blob, geen ArrayBuffer: de Response leest hem zonder kopie op de
  // hoofdthread. Met een ArrayBuffer kostte elk gebruik een extra kopie van
  // het hele bestand (tot 24 MB per WASM), en stond al die bytes ook nog in
  // de JS-heap. Bij openen op een krappe renderer liep dat op tot honderden
  // milliseconden lange taken en veel geheugendruk.
  const geheugen = new Map<string, Promise<Blob>>();
  let totaal = 0;
  window.fetch = async (invoer, init) => {
    const url =
      typeof invoer === "string"
        ? invoer
        : invoer instanceof URL
          ? invoer.href
          : invoer.url;
    if (
      (init?.method ?? "GET").toUpperCase() !== "GET" ||
      !isEigenWasm(url, location.origin)
    )
      return origineel(invoer, init);
    const sleutel = new URL(url, location.origin).href;
    let bytes = geheugen.get(sleutel);
    if (!bytes) {
      const antwoord = await origineel(invoer, init);
      if (!antwoord.ok) return antwoord;
      bytes = antwoord.blob();
      geheugen.set(sleutel, bytes);
      bytes
        .then((b) => {
          totaal += b.size;
          // Grens aan het geheugengebruik: daarboven niet langer bewaren.
          if (totaal > MAX_BYTES) geheugen.delete(sleutel);
        })
        .catch(() => geheugen.delete(sleutel));
    }
    return new Response(await bytes, {
      status: 200,
      headers: { "Content-Type": "application/wasm" },
    });
  };
}

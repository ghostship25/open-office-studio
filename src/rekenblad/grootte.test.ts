import { describe, expect, it } from "vitest";
import {
  MAX_REKENBLAD_BYTES,
  beoordeelRekenbladGrootte,
  formateerBytes,
  meldingTeGroot,
} from "./grootte";

describe("rekenbladgrootte", () => {
  it("keurt bytes binnen de standaardgrens goed", () => {
    const oordeel = beoordeelRekenbladGrootte(new Uint8Array(4096));
    expect(oordeel.teGroot).toBe(false);
    expect(oordeel.limiet).toBe(MAX_REKENBLAD_BYTES);
    expect(oordeel.bytes).toBe(4096);
  });

  it("weigert pas boven de grens, niet erop", () => {
    expect(beoordeelRekenbladGrootte(new Uint8Array(101), 100).teGroot).toBe(
      true,
    );
    expect(beoordeelRekenbladGrootte(new Uint8Array(100), 100).teGroot).toBe(
      false,
    );
  });

  it("noemt de werkelijke grootte en de grens in de melding", () => {
    const grootte = beoordeelRekenbladGrootte(new Uint8Array(1), 1);
    const melding = meldingTeGroot({
      ...grootte,
      bytes: 210 * 1024 * 1024,
      teGroot: true,
    });
    expect(melding).toContain(formateerBytes(210 * 1024 * 1024));
    expect(melding).toContain(formateerBytes(1));
  });

  it("toont kilobytes en megabytes met een eenheid", () => {
    expect(formateerBytes(2048)).toMatch(/2[,.]0 KB/);
    expect(formateerBytes(5 * 1024 * 1024)).toMatch(/5[,.]0 MB/);
    expect(formateerBytes(512)).toBe("512 B");
  });
});

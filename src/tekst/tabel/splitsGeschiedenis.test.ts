import { beforeEach, describe, expect, it } from "vitest";
import { onthoudSplitsing, splitsStap, splitsStapGedaan } from "./splitsGeschiedenis";

const voor = new Uint8Array([1]);
const na = new Uint8Array([2]);
const leeg = { kanOngedaan: false, kanOpnieuw: false };

describe("splitsGeschiedenis (#139)", () => {
  const eigenaar = {};
  beforeEach(() => onthoudSplitsing(eigenaar, voor, na));

  it("draait de splitsing terug zodra de editor niets meer kan terugdraaien", () => {
    expect(splitsStap(eigenaar, false, leeg)).toBe(voor);
  });
  it("laat de editor eerst zijn eigen stappen terugdraaien", () => {
    expect(splitsStap(eigenaar, false, { kanOngedaan: true, kanOpnieuw: false })).toBeNull();
  });
  it("kent een andere editor niets toe", () => {
    expect(splitsStap({}, false, leeg)).toBeNull();
  });
  it("voert opnieuw uit na ongedaan, maar niet over nieuw werk heen", () => {
    expect(splitsStap(eigenaar, true, leeg)).toBeNull();
    splitsStapGedaan(false);
    expect(splitsStap(eigenaar, true, leeg)).toBe(na);
    expect(splitsStap(eigenaar, true, { kanOngedaan: true, kanOpnieuw: false })).toBeNull();
    expect(splitsStap(eigenaar, false, leeg)).toBeNull();
  });
});

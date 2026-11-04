import { describe, expect, it } from "vitest";
import { volgendeCel } from "./tabVolgende";

const payload = {
  rows: [
    { cells: [{ story: "r0c0" }, { story: "r0c1" }, { story: "r0c2" }] },
    { cells: [{ story: "r1c0" }, { story: "r1c1" }, { story: "r1c2" }] },
  ],
};

describe("Tab door tabelcellen", () => {
  it("gaat naar de volgende cel in dezelfde rij", () => {
    expect(volgendeCel(payload, { row: 0, column: 0 })).toEqual({ row: 0, column: 1 });
    expect(volgendeCel(payload, { row: 0, column: 1 })).toEqual({ row: 0, column: 2 });
  });

  it("gaat vanaf de laatste cel van een rij naar de eerste cel van de volgende rij", () => {
    expect(volgendeCel(payload, { row: 0, column: 2 })).toEqual({ row: 1, column: 0 });
  });

  it("geeft null terug voor de laatste cel van de tabel", () => {
    expect(volgendeCel(payload, { row: 1, column: 2 })).toBeNull();
  });

  it("gaat verder bij rijen met een verschillend aantal cellen", () => {
    expect(
      volgendeCel(
        { rows: [{ cells: [{ story: "a" }] }, { cells: [{ story: "b" }, { story: "c" }] }] },
        { row: 0, column: 0 },
      ),
    ).toEqual({ row: 1, column: 0 });
  });
});

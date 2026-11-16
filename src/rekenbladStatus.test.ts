import { describe, expect, it } from "vitest";
import {
  rekenbladMelding,
  type RekenbladControle,
  type Rekenstatus,
} from "./rekenbladcontrole";

const leeg: RekenbladControle = {
  formules: 0,
  onbekendeFuncties: {},
  foutcellen: {},
  zonderUitkomst: [],
  volledigHerberekenen: false,
  handmatigRekenen: false,
  iteratiefRekenen: false,
  rekenketen: false,
  externeKoppelingen: 0,
  cellen: [],
};

const status = (deel: Partial<Rekenstatus>): Rekenstatus => ({
  beperkt: 0,
  kring: 0,
  afgekapt: false,
  ...deel,
});

describe("rekenstatus in de formulemelding", () => {
  it("meldt formules die het budget niet haalde als waarschuwing", () => {
    const melding = rekenbladMelding(leeg, [], status({ beperkt: 1200 }));
    expect(melding?.ernst).toBe("waarschuwing");
    expect(melding?.regels.join(" ")).toContain("1200");
  });

  it("meldt een afgekapte lijst als informatie", () => {
    const melding = rekenbladMelding(leeg, [], status({ afgekapt: true }));
    expect(melding?.ernst).toBe("info");
    expect(melding?.regels).toHaveLength(1);
  });

  it("zwijgt zonder beperkingen en zonder status", () => {
    expect(rekenbladMelding(leeg, [], status({}))).toBeNull();
    expect(rekenbladMelding(leeg)).toBeNull();
  });
});

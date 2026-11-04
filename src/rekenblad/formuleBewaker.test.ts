// @vitest-environment node
import { readFileSync } from "node:fs";
import * as xlsx from "@betteroffice/xlsx";
import { beforeAll, describe, expect, it } from "vitest";
import { bewaakInvoer, isOnveilig, OnveiligeFormule } from "./formuleBewaker";

beforeAll(async () => {
  await xlsx.initWasm(
    readFileSync("node_modules/@betteroffice/xlsx/dist/generated/xlsx_wasm_bg.wasm"),
  );
});

describe("isOnveilig (#120)", () => {
  it("herkent een lege ISOWEEKNUM-aanroep", () => {
    expect(isOnveilig("=ISOWEEKNUM()")).toBe(true);
    expect(isOnveilig("=isoweeknum( )")).toBe(true);
    expect(isOnveilig("=1+ISOWEEKNUM()")).toBe(true);
  });
  it("laat geldige invoer en tekst door", () => {
    expect(isOnveilig("=ISOWEEKNUM(A1)")).toBe(false);
    expect(isOnveilig('="ISOWEEKNUM()"')).toBe(false);
    expect(isOnveilig("ISOWEEKNUM()")).toBe(false);
    expect(isOnveilig("=MYISOWEEKNUM()")).toBe(false);
  });
});

describe("bewaakInvoer (#120)", () => {
  it("houdt de sessie bruikbaar na een lege ISOWEEKNUM-aanroep", () => {
    const h = xlsx.openWorkbook(readFileSync("public/templates/nieuw.xlsx"));
    bewaakInvoer(h);
    h.editCell(0, 0, 0, "7");
    expect(() => h.editCell(0, 1, 0, "=ISOWEEKNUM()")).toThrow(OnveiligeFormule);
    expect(() =>
      h.applyOps([
        { op: "setCellInputs", target: { sheet: 0, top: 1, left: 0, bottom: 1, right: 0 }, inputs: [["=ISOWEEKNUM()"]] },
      ]),
    ).toThrow(OnveiligeFormule);
    expect(() => h.editCells(0, [{ row: 1, col: 0, input: "=ISOWEEKNUM()" }])).toThrow(OnveiligeFormule);
    h.editCell(0, 2, 0, "=A1*2");
    expect(h.save().length).toBeGreaterThan(0);
    const terug = xlsx.openWorkbook(h.save());
    expect(terug.cell(0, 2, 0).isFormula).toBe(true);
  });
});

import { describe, expect, it, vi } from "vitest";
import type { DocxEditorRef } from "@betteroffice/docx-react";
import {
  isOndersteundBeeldbestand,
  voegAfbeeldingenIn,
} from "./neerzetten";

describe("afbeeldingen neerzetten in een document", () => {
  it("herkent ondersteunde formaten en negeert overige afbeeldingen", () => {
    expect(
      isOndersteundBeeldbestand(
        { name: "foto.JPG", type: "" } as File,
      ),
    ).toBe(true);
    expect(
      isOndersteundBeeldbestand(
        { name: "vector.svg", type: "image/svg+xml" } as File,
      ),
    ).toBe(false);
  });

  it("selecteert de drop-positie en voegt de afbeelding inline in", async () => {
    const bytes = new Uint8Array(25);
    bytes.set([0x89, 0x50, 0x4e, 0x47], 0);
    bytes.set([0, 0, 0, 12], 16);
    bytes.set([0, 0, 0, 8], 20);
    const bestand = {
      name: "foto.png",
      type: "image/png",
      size: bytes.length,
      arrayBuffer: async () => bytes.buffer,
    } as File;
    class Lezer {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.result = "data:image/png;base64,";
        this.onload?.();
      }
    }
    vi.stubGlobal("FileReader", Lezer);

    const editor = {
      setSelection: vi.fn(),
      focus: vi.fn(),
      applyYrsCommand: vi.fn(() => true),
    };
    const getPositionAtPoint = vi.fn(() => ({
      region: "body" as const,
      position: 17,
    }));
    const ref = {
      getEditorRef: () => editor,
      getPositionAtPoint,
    } as unknown as DocxEditorRef;

    try {
      await voegAfbeeldingenIn(ref, [bestand], 120, 240);
      expect(getPositionAtPoint).toHaveBeenCalledWith(120, 240);
      expect(editor.setSelection).toHaveBeenCalledWith(17);
      expect(editor.applyYrsCommand).toHaveBeenCalledWith({
        type: "insertImage",
        image: expect.objectContaining({
          alt: "foto.png",
          width: 12,
          height: 8,
          wrapType: "inline",
        }),
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

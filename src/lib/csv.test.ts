import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("csv import parsing", () => {
  it("keeps commas and quotes inside quoted fields", () => {
    const rows = parseCsv('Part No.,Description\n0743276,"COVER, ZAM, 4"" FLUSH"');
    expect(rows[1]).toEqual(["0743276", 'COVER, ZAM, 4" FLUSH']);
  });

  it("ignores blank lines and handles Windows line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

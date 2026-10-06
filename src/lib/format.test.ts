import { describe, it, expect } from "vitest";
import { formatDateID, formatPercentID, formatRupiah } from "./format";

describe("format - formatRupiah", () => {
  it("formats whole rupiah with Indonesian thousands separators", () => {
    expect(formatRupiah(1234567)).toBe("Rp 1.234.567");
  });

  it("rounds and handles non-numeric input", () => {
    expect(formatRupiah(1234.6)).toBe("Rp 1.235");
    expect(formatRupiah("nonsense")).toBe("Rp 0");
  });
});

describe("format - formatDateID", () => {
  it("converts ISO dates to dd/mm/yyyy", () => {
    expect(formatDateID("2026-01-05")).toBe("05/01/2026");
    expect(formatDateID("2026-12-31")).toBe("31/12/2026");
  });

  it("keeps every component padded to two digits", () => {
    expect(formatDateID("2026-03-07")).toHaveLength(10);
    expect(formatDateID("2026-03-07")).toBe("07/03/2026");
  });

  it("passes through values that are not ISO dates", () => {
    expect(formatDateID("")).toBe("-");
    expect(formatDateID("05/01/2026")).toBe("05/01/2026");
  });
});

describe("format - formatPercentID", () => {
  it("uses a comma as the decimal separator", () => {
    expect(formatPercentID(41.666)).toBe("41,7%");
    expect(formatPercentID(0)).toBe("0,0%");
    expect(formatPercentID(100)).toBe("100,0%");
  });

  it("treats non-finite input as zero", () => {
    expect(formatPercentID(NaN)).toBe("0,0%");
    expect(formatPercentID(Infinity)).toBe("0,0%");
  });
});

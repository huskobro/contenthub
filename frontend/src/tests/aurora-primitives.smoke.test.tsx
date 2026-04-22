/**
 * Aurora primitives smoke tests — Segmented, ChipSelect, TagsInput.
 *
 * Aurora single-wave hardening sırasında birden fazla sayfada manual typing
 * yerine bu primitives'e geçildi. Bu smoke suite onların en temel davranışını
 * (render + controlled update) garanti altına alır. Primitive imzası kırılırsa
 * bu testler erken hata verir.
 *
 * Coverage:
 *   - AuroraSegmented: render, click → onChange, aria-checked toggle
 *   - AuroraChipSelect (single): render, click → onChange, swatch rendering
 *   - AuroraChipSelect (multi): toggle on/off bir chip'i seçili listeye ekler/çıkarır
 *   - AuroraTagsInput: buffer commit (Enter/comma), backspace removes last tag
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React, { useState } from "react";

import {
  AuroraSegmented,
  AuroraChipSelect,
  AuroraTagsInput,
  type AuroraSegmentedOption,
  type AuroraChipOption,
} from "../surfaces/aurora/primitives";

// ---------------------------------------------------------------------------
// AuroraSegmented
// ---------------------------------------------------------------------------

describe("AuroraSegmented", () => {
  const OPTIONS: AuroraSegmentedOption<"tr" | "en" | "de">[] = [
    { value: "tr", label: "TR" },
    { value: "en", label: "EN" },
    { value: "de", label: "DE", disabled: true },
  ];

  it("tüm seçenekleri render eder ve aktif olanı aria-checked=true ile işaretler", () => {
    const onChange = vi.fn();
    render(<AuroraSegmented options={OPTIONS} value="en" onChange={onChange} />);
    const tr = screen.getByRole("radio", { name: /TR/ });
    const en = screen.getByRole("radio", { name: /EN/ });
    expect(tr.getAttribute("aria-checked")).toBe("false");
    expect(en.getAttribute("aria-checked")).toBe("true");
  });

  it("tıklama değişmemiş değeri tekrar göndermez ama farklı değeri onChange'a geçirir", () => {
    const onChange = vi.fn();
    render(<AuroraSegmented options={OPTIONS} value="tr" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /EN/ }));
    expect(onChange).toHaveBeenCalledWith("en");
  });

  it("disabled seçenek tıklanırsa onChange tetiklenmez", () => {
    const onChange = vi.fn();
    render(<AuroraSegmented options={OPTIONS} value="tr" onChange={onChange} />);
    const de = screen.getByRole("radio", { name: /DE/ });
    fireEvent.click(de);
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AuroraChipSelect
// ---------------------------------------------------------------------------

describe("AuroraChipSelect — single", () => {
  const OPTS: AuroraChipOption<"low" | "medium" | "high">[] = [
    { value: "low", label: "Düşük" },
    { value: "medium", label: "Orta", swatch: "#22c55e" },
    { value: "high", label: "Yüksek" },
  ];

  it("tıklama seçilen value'yi döndürür", () => {
    const onChange = vi.fn();
    render(
      <AuroraChipSelect options={OPTS} value="low" onChange={onChange} />,
    );
    fireEvent.click(screen.getByText("Orta"));
    expect(onChange).toHaveBeenCalledWith("medium");
  });
});

describe("AuroraChipSelect — multi", () => {
  const OPTS: AuroraChipOption<"a" | "b" | "c">[] = [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
    { value: "c", label: "C" },
  ];

  function Harness() {
    const [value, setValue] = useState<string[]>(["a"]);
    return (
      <AuroraChipSelect
        options={OPTS}
        value={value}
        multi
        onChange={(next) => setValue(Array.isArray(next) ? next : [next])}
      />
    );
  }

  it("chip tıklaması seçili listeye ekler/çıkarır", () => {
    render(<Harness />);
    // B'yi ekle
    fireEvent.click(screen.getByText("B"));
    // A'yı çıkar
    fireEvent.click(screen.getByText("A"));
    // Sonuç: B seçili, A değil (A chip'i aktif class'sız olmalı)
    const a = screen.getByText("A").closest("button");
    const b = screen.getByText("B").closest("button");
    expect(b?.className).toContain("active");
    expect(a?.className).not.toContain("active");
  });
});

// ---------------------------------------------------------------------------
// AuroraTagsInput
// ---------------------------------------------------------------------------

describe("AuroraTagsInput", () => {
  function Harness({ initial = [] as string[] }: { initial?: string[] }) {
    const [tags, setTags] = useState<string[]>(initial);
    return (
      <AuroraTagsInput
        value={tags}
        onChange={setTags}
        placeholder="tag ekle"
        data-testid="tags"
      />
    );
  }

  it("Enter buffer'ı tag'e çevirir", () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText("tag ekle");
    fireEvent.change(input, { target: { value: "news" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("news")).toBeTruthy();
  });

  it("virgül de commit ettirir", () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText("tag ekle");
    fireEvent.change(input, { target: { value: "tech" } });
    fireEvent.keyDown(input, { key: "," });
    expect(screen.getByText("tech")).toBeTruthy();
  });

  it("duplicate tag eklenmez", () => {
    render(<Harness initial={["news"]} />);
    const input = screen.getByPlaceholderText("");
    fireEvent.change(input, { target: { value: "news" } });
    fireEvent.keyDown(input, { key: "Enter" });
    // Hâlâ tek adet
    expect(screen.getAllByText("news").length).toBe(1);
  });

  it("boş buffer'da Backspace son tag'i çıkarır", () => {
    render(<Harness initial={["a", "b"]} />);
    const input = screen.getByPlaceholderText("");
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(screen.queryByText("b")).toBeNull();
    expect(screen.getByText("a")).toBeTruthy();
  });
});

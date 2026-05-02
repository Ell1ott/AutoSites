"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { CmsTextStyle } from "../types";

export const FONT_SIZE_MIN = 0.5;
export const FONT_SIZE_MAX = 6;
export const FONT_SIZE_STEP = 0.05;
export const LINE_HEIGHT_MIN = 0.8;
export const LINE_HEIGHT_MAX = 3;
export const LINE_HEIGHT_STEP = 0.05;
export const FONT_SIZE_DEFAULT = 1;
export const LINE_HEIGHT_DEFAULT = 1.4;

export function styleToCss(s: CmsTextStyle | undefined): CSSProperties {
  if (!s) return {};
  const out: CSSProperties = {};
  if (typeof s.fontSize === "number") out.fontSize = `${s.fontSize}rem`;
  if (typeof s.lineHeight === "number") out.lineHeight = s.lineHeight;
  return out;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function sameStyle(
  a: CmsTextStyle | undefined,
  b: CmsTextStyle | undefined,
): boolean {
  return a?.fontSize === b?.fontSize && a?.lineHeight === b?.lineHeight;
}

export type StyleField = "fontSize" | "lineHeight";
export type StyleChange = (
  field: StyleField,
  value: number | undefined,
  commit?: boolean,
) => void;

type ExpandedRowsProps = {
  style: CmsTextStyle | undefined;
  onChange: StyleChange;
  onReset: () => void;
};

export function ExpandedRows({ style, onChange, onReset }: ExpandedRowsProps) {
  const fontSet = style?.fontSize !== undefined;
  const lhSet = style?.lineHeight !== undefined;

  return (
    <>
      <StyleNumberRow
        label="size"
        field="fontSize"
        value={style?.fontSize ?? FONT_SIZE_DEFAULT}
        isSet={fontSet}
        min={FONT_SIZE_MIN}
        max={FONT_SIZE_MAX}
        step={FONT_SIZE_STEP}
        bumpStep={FONT_SIZE_STEP * 2}
        onChange={onChange}
      />
      <span className="cms-rich-toolbar__row cms-rich-toolbar__row--style">
        <StyleNumberInline
          label="line"
          field="lineHeight"
          value={style?.lineHeight ?? LINE_HEIGHT_DEFAULT}
          isSet={lhSet}
          min={LINE_HEIGHT_MIN}
          max={LINE_HEIGHT_MAX}
          step={LINE_HEIGHT_STEP}
          bumpStep={LINE_HEIGHT_STEP * 2}
          onChange={onChange}
        />
        <button
          type="button"
          title="Reset to default"
          className="cms-rich-toolbar__reset"
          onClick={onReset}
          disabled={!fontSet && !lhSet}
        >
          ↺
        </button>
      </span>
    </>
  );
}

type StyleRowProps = {
  label: string;
  field: StyleField;
  value: number;
  isSet: boolean;
  min: number;
  max: number;
  step: number;
  bumpStep: number;
  onChange: StyleChange;
};

function StyleNumberRow(props: StyleRowProps) {
  return (
    <span className="cms-rich-toolbar__row cms-rich-toolbar__row--style">
      <StyleNumberInline {...props} />
    </span>
  );
}

function StyleNumberInline({
  label,
  field,
  value,
  isSet,
  min,
  max,
  step,
  bumpStep,
  onChange,
}: StyleRowProps) {
  const [draft, setDraft] = useState<string>(value.toFixed(2));

  useEffect(() => {
    setDraft(value.toFixed(2));
  }, [value]);

  function commit(raw: string) {
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) {
      setDraft(value.toFixed(2));
      return;
    }
    const v = round2(clamp(parsed, min, max));
    setDraft(v.toFixed(2));
    onChange(field, v, true);
  }

  function bump(delta: number) {
    const v = round2(clamp(value + delta, min, max));
    setDraft(v.toFixed(2));
    onChange(field, v, true);
  }

  function previewSlider(raw: string) {
    const v = round2(clamp(parseFloat(raw), min, max));
    onChange(field, v, false);
  }

  function commitSlider(raw: string) {
    const v = round2(clamp(parseFloat(raw), min, max));
    onChange(field, v, true);
  }

  return (
    <>
      <span className="cms-rich-toolbar__label">{label}</span>
      <button
        type="button"
        title={`Decrease ${label}`}
        onClick={() => bump(-bumpStep)}
      >
        −
      </button>
      <input
        type="number"
        className={`cms-rich-toolbar__num${isSet ? "" : " is-default"}`}
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setDraft(value.toFixed(2));
            (e.target as HTMLInputElement).blur();
          }
        }}
        aria-label={`${label} number`}
      />
      <button
        type="button"
        title={`Increase ${label}`}
        onClick={() => bump(bumpStep)}
      >
        +
      </button>
      <input
        type="range"
        className="cms-rich-toolbar__slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => previewSlider(e.target.value)}
        onMouseUp={(e) => commitSlider((e.target as HTMLInputElement).value)}
        onTouchEnd={(e) => commitSlider((e.target as HTMLInputElement).value)}
        onKeyUp={(e) => commitSlider((e.target as HTMLInputElement).value)}
        aria-label={`${label} slider`}
      />
    </>
  );
}

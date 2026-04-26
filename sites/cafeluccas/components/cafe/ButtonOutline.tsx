import type { ComponentPropsWithoutRef } from "react";

type ButtonOutlineProps = ComponentPropsWithoutRef<"a"> & {
  cream?: boolean;
};

export function ButtonOutline({
  className = "",
  cream,
  style,
  ...props
}: ButtonOutlineProps) {
  const mergedStyle =
    cream
      ? { ...style, borderColor: "var(--cream)", color: "var(--cream)" }
      : style;

  return (
    <a
      className={`btn-outline ${className}`.trim()}
      style={mergedStyle}
      {...props}
    />
  );
}

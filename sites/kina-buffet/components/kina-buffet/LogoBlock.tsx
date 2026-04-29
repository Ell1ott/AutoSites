import type { CSSProperties } from "react";

export type LogoBlockProps = {
  main: string;
  sub: string;
  mainStyle?: CSSProperties;
  subStyle?: CSSProperties;
};

export function LogoBlock({ main, sub, mainStyle, subStyle }: LogoBlockProps) {
  return (
    <div className="logo-block">
      <div className="logo-main" style={mainStyle}>
        {main}
      </div>
      <div className="logo-sub" style={subStyle}>
        {sub}
      </div>
    </div>
  );
}

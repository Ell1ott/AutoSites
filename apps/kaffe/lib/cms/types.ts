export type CmsKind = "text" | "image" | "link";

export type CmsTextStyle = {
  fontSize?: number;
  lineHeight?: number;
};

export type CmsText = {
  text: string;
  style?: CmsTextStyle;
};
export type CmsImage = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};
export type CmsLink = { href: string; label: string };

export type CmsValueByKind = {
  text: CmsText;
  image: CmsImage;
  link: CmsLink;
};

export type CmsRow<K extends CmsKind = CmsKind> = {
  kind: K;
  value: CmsValueByKind[K];
};

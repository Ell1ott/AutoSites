export type CmsKind = "text" | "image" | "link" | "list" | "richText";

export type CmsTextStyle = {
  fontSize?: number;
  lineHeight?: number;
};

export type CmsText = {
  text: string;
  style?: CmsTextStyle;
};
export type CmsRichText = {
  html: string;
  style?: CmsTextStyle;
};
export type CmsImage = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};
export type CmsLink = { href: string; label: string };
export type CmsList = { ids: string[] };

export type CmsValueByKind = {
  text: CmsText;
  image: CmsImage;
  link: CmsLink;
  list: CmsList;
  richText: CmsRichText;
};

export type CmsRow<K extends CmsKind = CmsKind> = {
  kind: K;
  value: CmsValueByKind[K];
};

import { EditableText } from "@autosites/cms/components";

type ProductContent = {
  category: string;
  title: string;
  description: string;
  note: string;
};

type ProductCardProps = {
  keyPrefix: string;
  product: ProductContent;
};

export function ProductCard({ keyPrefix, product }: ProductCardProps) {
  return (
    <article className="product-tag">
      <div className="tag-eyelet" aria-hidden />
      <EditableText
        cmsKey={`${keyPrefix}.category`}
        fallback={product.category}
        as="span"
        className="product-category"
      />
      <EditableText
        cmsKey={`${keyPrefix}.title`}
        fallback={product.title}
        as="h3"
        className="product-title"
      />
      <EditableText
        cmsKey={`${keyPrefix}.description`}
        fallback={product.description}
        as="p"
        className="product-desc"
      />
      <EditableText
        cmsKey={`${keyPrefix}.note`}
        fallback={product.note}
        as="div"
        className="product-note"
      />
    </article>
  );
}

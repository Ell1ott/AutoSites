import type { MenuProduct } from "./menu-data";

type ProductCardProps = {
  product: MenuProduct;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="product-tag">
      <div className="tag-eyelet" aria-hidden />
      <span className="product-category">{product.category}</span>
      <h3 className="product-title">{product.title}</h3>
      <p className="product-desc">{product.description}</p>
      <div className="product-price">{product.priceLabel}</div>
    </article>
  );
}

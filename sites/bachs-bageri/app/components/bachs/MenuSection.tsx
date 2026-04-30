import { menuProducts } from "./menu-data";
import { ProductCard } from "./ProductCard";
import { SectionTag } from "./SectionTag";

export function MenuSection() {
  return (
    <section className="section-menu" id="menu" aria-labelledby="menu-heading">
      <div className="container">
        <div className="menu-intro">
          <SectionTag>Fra Ovnen</SectionTag>
          <h2 className="section-title" id="menu-heading">
            Udvalgte Favoritter
          </h2>
        </div>

        <div className="menu-grid">
          {menuProducts.map((product) => (
            <ProductCard key={product.title} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

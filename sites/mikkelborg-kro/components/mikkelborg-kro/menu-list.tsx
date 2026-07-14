type MenuItem = {
  name: string;
  price: string;
  note?: string;
};

type MenuListProps = {
  title: string;
  items: readonly MenuItem[];
};

export function MenuList({ title, items }: MenuListProps) {
  return (
    <div className="space-y-6">
      <h2 className="font-headline-md text-headline-md border-l-4 border-primary pl-6 text-primary">
        {title}
      </h2>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.name} className="dot-leader font-body-md text-body-md text-on-background">
            <span>
              {item.name}
              {item.note ? ` (${item.note})` : ""}
            </span>
            <span className="price font-label-caps text-label-caps text-primary/80">
              Pris {item.price}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

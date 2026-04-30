export type MenuProduct = {
  category: string;
  title: string;
  description: string;
  priceLabel: string;
};

export const menuProducts: MenuProduct[] = [
  {
    category: "Signatur",
    title: "Rugbrød Nr. 4",
    description:
      "Klassisk mørkt rugbrød med solsikkekerner og ølandshvede.",
    priceLabel: "45.00 DKK",
  },
  {
    category: "Sødt",
    title: "Kardemommesnurre",
    description:
      "Smørbagt dej med friskkværnet kardemomme og perlesukker.",
    priceLabel: "28.00 DKK",
  },
  {
    category: "Surdej",
    title: "Bachs Levain",
    description: "Vores stolthed. Et lyst surdejsbrød med vilde gærceller.",
    priceLabel: "52.00 DKK",
  },
  {
    category: "Morgen",
    title: "Surdejscroissant",
    description: "Lamineret med dansk økosmør i 72 fine lag.",
    priceLabel: "32.00 DKK",
  },
];

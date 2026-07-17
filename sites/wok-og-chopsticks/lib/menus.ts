export type MenuItem = {
  code?: string;
  name: string;
  description?: string;
  price?: string;
  note?: string;
};

export type MenuCategory = {
  name: string;
  english?: string;
  note?: string;
  items: MenuItem[];
};

export type SetMenu = {
  name: string;
  price: string;
  minPersons?: number;
  courses: string[];
};

export const FROKOST_BUFFET = {
  title: "Frokostbuffet",
  hours: "Serveres fra kl. 11.30–15.00",
  columns: [
    {
      name: "Danske retter",
      items: [
        "Sild",
        "Gravad laks",
        "Frikadeller",
        "Fiskefilet",
        "Æg og rejer",
        "Ost",
        "Forskelligt tilbehør",
        "Rugbrød",
        "Franskbrød",
      ],
    },
    {
      name: "Kinesiske retter",
      items: [
        "Stegte nudler",
        "Stegte ris",
        "Forårsruller",
        "Dybstegt kylling i sursød",
        "Indbagte kinarejer",
        "Gongbaokylling m. nødder",
        "Hotwings",
        "Kylling i karry",
        "Oksekød m. løg og porrer",
        "Indbagt kylling",
        "Pommes frites",
        "Sursød sauce",
        "Champignonsauce",
        "Svinekød m. champignon",
        "Blandet sushi",
      ],
    },
  ],
  variationNote: "Udvalget i buffeten kan godt variere.",
  pricing: [
    { label: "Pr. person", price: "145" },
    { label: "Børn under 12 år", price: "68" },
  ],
  menuUpgrade: {
    title: "Frokostbuffet-menu",
    description: "Inkl. suppe, is og kaffe",
    price: "205",
    childPrice: "105",
    note: "Skal bestilles af hele selskabet.",
  },
} as const;

export const CHINA_BOX = {
  title: "China Box",
  hours: "Alle dage fra kl. 11.30 — kun ud af huset",
  items: [
    "2 stk. indbagte kinarejer",
    "2 stk. indbagt kylling",
    "1 stk. forårsrulle",
    "Stegte nudler",
  ],
  price: "89",
} as const;

export const FROKOST_RETTER = {
  title: "Frokostretter",
  hours: "Serveres fra kl. 11.30–15.30",
  choicePrice: "99",
  soupAddOn: {
    label: "Pekingsuppe eller hønsekødssuppe som tillæg",
    price: "38",
  },
  items: [
    {
      code: "F1",
      name: "Indbagte kinarejer med sur-sød sauce",
    },
    {
      code: "F2",
      name: "3 små forårsruller med champignonsauce",
    },
    {
      code: "F3",
      name: "Indbagt kylling med sur-sød sauce",
    },
    {
      code: "F4",
      name: "Svinekød med grøntsager",
    },
    {
      code: "F5",
      name: "Indbagte blæksprutteringe",
    },
    {
      code: "F6",
      name: "Kylling i karry & ris",
    },
    {
      code: "F7",
      name: "Stegte ris de luxe",
    },
    {
      code: "F8",
      name: "Oksekød i krydret chilisauce",
    },
    {
      code: "F9",
      name: "Stegte nudler de luxe",
    },
  ] satisfies MenuItem[],
  setMenu: {
    title: "Frokost-menu",
    price: "148",
    courses: [
      "Pekingsuppe eller hønsekødssuppe",
      "Hjemmelavet forårsrulle",
      "Valgfri frokostret (F1–F9)",
    ],
  },
} as const;

export const AFTENBUFFET = {
  title: "Luksus buffet & barbecue",
  hours: "Fra kl. 16.30",
  sections: [
    {
      name: "Forret",
      body: "Vælg mellem hønsekødssuppe og Pekingsuppe",
    },
    {
      name: "Buffet",
      body: "Mange forskellige varme retter — bl.a. kinarejer, forårsruller, kyllingesaté, Canton-and, wantan, stegte nudler, hotwings m.m.",
    },
    {
      name: "Barbecue",
      body: "Oksekød, svinekød, kylling, lam & rejer m.m.",
    },
    {
      name: "Salatbar",
      body: "Stor, frisk salatbar",
    },
    {
      name: "Sushi",
      body: "Maki, futomaki og nigiri",
    },
    {
      name: "Dessert",
      body: "Fri isbar og kaffe",
    },
  ],
  pricing: [
    { label: "Pr. person", price: "249" },
    { label: "Børn under 12 år", price: "129" },
  ],
} as const;

export const A_LA_CARTE: MenuCategory[] = [
  {
    name: "Forretter",
    english: "Starters",
    items: [
      {
        code: "1",
        name: "Friturestegt wan tan m. sur-sød sauce",
        description: "Deep fried wan tan w/ sweet-sour sauce",
        price: "55",
      },
      {
        code: "2",
        name: "Jiang Nan forårsrulle",
        description: "Jiang Nan spring roll",
        price: "75",
      },
      {
        code: "3",
        name: "Luksus forårsrulle m. rejer og skinke",
        description: "Spring roll de luxe w/ shrimps and ham",
        price: "82",
      },
      {
        code: "4",
        name: "Indbagte kinarejer (3 stk.) m. sur-sød sauce",
        description: "Deep fried prawns (3 pcs.) w/ sweet-sour sauce",
        price: "65",
      },
      {
        code: "5",
        name: "Ebirejer (3 stk.) med sød chili",
        description: "Shrimp cocktail with sweet chili",
        price: "66",
      },
      {
        code: "6",
        name: "Grillede kinarejer m. hvidløg",
        description: "Grilled prawns w/ garlic",
        price: "95",
      },
      {
        code: "7",
        name: "Hønsekødssuppe",
        description: "Chicken soup",
        price: "55",
      },
      {
        code: "8",
        name: "Små vegetar forårsruller (2 stk.)",
        description: "Small vegetarian spring rolls (2 pcs.)",
        price: "44",
      },
      {
        code: "9",
        name: "Pekingsuppe",
        description: "Hot and sour soup",
        price: "55",
      },
      {
        code: "10",
        name: "Wan tan-suppe",
        description: "Wan tan soup",
        price: "59",
      },
      {
        code: "11",
        name: "Nuddelsuppe",
        description: "Noodle soup",
        price: "55",
      },
      {
        code: "12",
        name: "Kyllingesaté m. jordnøddesauce",
        description: "Chicken satay w/ peanut sauce",
        price: "55",
      },
    ],
  },
  {
    name: "Fiskeretter",
    english: "Seafood",
    items: [
      {
        code: "13",
        name: "Kinarejer m. grøntsager (m. eller uden stærk sauce)",
        description: "Fried prawns w/ vegetables (with or without hot sauce)",
        price: "168",
      },
      {
        code: "14",
        name: "Kinarejer med rød karrysauce",
        description: "Fried prawns with red curry sauce",
        price: "168",
      },
      {
        code: "15",
        name: "Indbagte kinarejer med sur-sød sauce",
        description: "Deep fried prawns w/ sweet-sour sauce",
        price: "168",
      },
      {
        code: "16",
        name: "Kinarejer med kinesiske svampe",
        description: "Prawns with Chinese mushrooms",
        price: "178",
      },
      {
        code: "17",
        name: "Grillede kinarejer m. hvidløg (12 stk.)",
        description: "Grilled prawns w/ garlic",
        price: "188",
      },
      {
        code: "18",
        name: "Seafood (kinarejer, blæksprutte, surimi & garniture)",
        description: "Prawns, cuttlefish, surimi and vegetables",
        price: "198",
      },
      {
        code: "19",
        name: "Indbagte blæksprutteringe m. sur-sød eller karrysauce",
        description: "Deep fried calamari w/ sweet-sour or curry sauce",
        price: "148",
      },
      {
        code: "20",
        name: "Blæksprutter m. grøntsager (m. eller uden stærk sauce)",
        description: "Calamari w/ vegetables (with or without hot sauce)",
        price: "158",
      },
      {
        code: "21",
        name: "Indbagt fisk med karry- eller sur-sød sauce",
        description: "Deep fried fish with curry- or sweet-sour sauce",
        price: "158",
      },
      {
        code: "22",
        name: "Fisk med grøntsager (m. eller uden stærk sauce)",
        description: "Fish w/ vegetables (with or without hot sauce)",
        price: "158",
      },
      {
        code: "23",
        name: "Surimi m. grøntsager (m. eller uden stærk sauce)",
        description: "Surimi w/ vegetables (with or without hot sauce)",
        price: "148",
      },
    ],
  },
  {
    name: "Svinekød",
    english: "Pork",
    items: [
      {
        code: "24",
        name: "Svinemørbrad m. grøntsager (m. eller uden stærk sauce)",
        description: "Pork tenderloin w/ vegetables (with or without hot sauce)",
        price: "148",
      },
      {
        code: "25",
        name: "Indbagt svinekød med sur-sød sauce",
        description: "Deep fried pork with sweet-sour sauce",
        price: "148",
      },
      {
        code: "26",
        name: "Dybstegt svinekød med sur-sød sauce",
        description: "Deep fried pork w/ sweet-sour sauce",
        price: "158",
      },
      {
        code: "27",
        name: "Dybstegte spareribs m. hvidløg & chilisauce",
        description: "Deep fried spareribs w/ garlic and chili sauce",
        price: "199",
      },
      {
        code: "28",
        name: "Svinemørbrad med rød karrysauce",
        description: "Pork tenderloin w/ red curry sauce",
        price: "158",
      },
    ],
  },
  {
    name: "Oksekød",
    english: "Beef",
    items: [
      {
        code: "29",
        name: "Oksekød med grøntsager (m. eller uden stærk sauce)",
        description: "Beef w/ vegetables (with or without hot sauce)",
        price: "155",
      },
      {
        code: "30",
        name: "Oksekød i karry",
        description: "Beef in curry",
        price: "155",
      },
      {
        code: "31",
        name: "Oksekød med bambusskud og champignon",
        description: "Beef with bamboo shoots and mushrooms",
        price: "155",
      },
      {
        code: "32",
        name: "Oksekød i krydret chilisauce",
        description: "Beef in spicy chili sauce",
        price: "155",
      },
      {
        code: "33",
        name: "Oksekød med barbecue",
        description: "Beef with barbecue",
        price: "158",
      },
      {
        code: "34",
        name: "Oksekød med peberfrugter",
        description: "Beef with green peppers",
        price: "158",
      },
    ],
  },
  {
    name: "Kylling",
    english: "Chicken",
    items: [
      {
        code: "35",
        name: "Kylling med grøntsager (m. eller uden stærk sauce)",
        description: "Chicken with vegetables (with or without hot sauce)",
        price: "153",
      },
      {
        code: "36",
        name: "Kylling med citronsauce",
        description: "Chicken with lemon sauce",
        price: "168",
      },
      {
        code: "37",
        name: "Kylling med cashewnødder",
        description: "Chicken with cashew nuts",
        price: "168",
      },
      {
        code: "38",
        name: "Gongbao-kylling med nødder",
        description: "Gongbao chicken with nuts",
        price: "173",
        note: "Stærk!",
      },
      {
        code: "39",
        name: "Kylling med bambusskud og champignon",
        description: "Chicken with bamboo shoots and mushrooms",
        price: "158",
      },
      {
        code: "40",
        name: "Kylling i karry",
        description: "Chicken in curry",
        price: "158",
      },
      {
        code: "41",
        name: "Indbagt kylling med sur-sød sauce",
        description: "Deep fried chicken w/ sweet-sour sauce",
        price: "158",
      },
      {
        code: "42",
        name: "Kylling med kinesiske svampe",
        description: "Chicken with Chinese mushrooms",
        price: "178",
      },
      {
        code: "43",
        name: "Dybstegt kylling m. sur-sød sauce",
        description: "Chicken with sweet-sour sauce",
        price: "168",
      },
    ],
  },
  {
    name: "And",
    english: "Duck",
    items: [
      {
        code: "44",
        name: "Canton andesteg med hoisin sauce",
        description: "Canton duck with hoisin sauce",
        price: "183",
      },
      {
        code: "45",
        name: "Andesteg med sur-sød sauce og ananas",
        description: "Duck roast with sweet-sour sauce",
        price: "183",
      },
      {
        code: "46",
        name: "And med garniture, ingefær og cognac",
        description: "Duck with vegetables, ginger and cognac",
        price: "198",
      },
      {
        code: "47",
        name: "And med kinesiske svampe",
        description: "Duck with Chinese mushrooms",
        price: "203",
      },
    ],
  },
  {
    name: "Stegte ris / nudler",
    english: "Fried rice / noodles",
    items: [
      {
        code: "48",
        name: "Stegte nudler de luxe med rejer, skinke, kylling og garniture",
        description:
          "Fried noodles de luxe with shrimps, ham, chicken and vegetables",
        price: "145",
      },
      {
        code: "49",
        name: "Stegte ris de luxe med rejer, skinke og garniture",
        description: "Fried rice de luxe with shrimps, ham and vegetables",
        price: "145",
      },
      {
        code: "50",
        name: "Stegte ris eller nudler med and & karry",
        description: "Fried rice or noodles with duck & curry",
        price: "183",
      },
    ],
  },
  {
    name: "Børneretter",
    english: "Children’s dishes",
    note: "For børn under 12 år",
    items: [
      {
        code: "52",
        name: "Pølser med pommes frites",
        description: "Danish sausages with French fries",
        price: "85",
      },
      {
        code: "53",
        name: "Fiskefilet med pommes frites",
        description: "Fish fillet with French fries",
        price: "85",
      },
      {
        code: "54",
        name: "Kyllingenuggets med pommes frites",
        description: "Chicken nuggets with French fries",
        price: "85",
      },
      {
        code: "55",
        name: "Frikadeller med pommes frites",
        description: "Meatballs with French fries",
        price: "85",
      },
    ],
  },
  {
    name: "Kontinental ret",
    english: "Continental dish",
    items: [
      {
        code: "56",
        name: "Skinke-schnitzel med salat, dressing, pommes frites og béarnaisesauce",
        description:
          "Wienerschnitzel w/ salad, dressing, French fries and sauce",
        price: "189",
      },
    ],
  },
  {
    name: "Desserter",
    english: "Desserts",
    items: [
      { code: "100", name: "Banan-split", price: "59" },
      {
        code: "101",
        name: "Is m. flødeskum og chokoladesauce",
        description: "Ice cream w/ whipped cream and chocolate",
        price: "49",
      },
      {
        code: "102",
        name: "Dybstegt banan med is",
        description: "Deep fried banana with ice cream",
        price: "68",
      },
      {
        code: "103",
        name: "Fri isbar",
        description: "Kun ved bestilling af aftenbuffet",
        price: "49",
      },
    ],
  },
];

export const SET_MENUS: SetMenu[] = [
  {
    name: "Jiang Nan",
    price: "259",
    minPersons: 2,
    courses: [
      "Hønsekødssuppe eller Pekingsuppe",
      "Hjemmelavet forårsrulle",
      "Indbagt svinekød med sur-sød sauce",
      "Gongbao-kylling med nødder (stærk!)",
      "Oksekød med grøntsager",
      "Is eller kaffe",
    ],
  },
  {
    name: "Kinesisk ristaffel",
    price: "269",
    minPersons: 2,
    courses: [
      "Hønsekødssuppe eller Pekingsuppe",
      "Hjemmelavet forårsrulle",
      "Indbagte kinarejer med sur-sød sauce",
      "And m. bønnespirer og sukkerærter",
      "Kylling i karry",
      "Oksekød m. blandede grøntsager",
      "Is eller kaffe",
    ],
  },
  {
    name: "Wok Menu",
    price: "279",
    minPersons: 2,
    courses: [
      "Hønsekødssuppe eller Pekingsuppe",
      "Hjemmelavet forårsrulle",
      "And m. garniture og cognac",
      "Indbagte kinarejer med sur-sød sauce",
      "Oksekød med barbecue-sauce",
      "Kylling & cashewnødder m. stegte Jiang Nan-nudler",
      "Is eller kaffe",
    ],
  },
  {
    name: "Chopsticks Menu",
    price: "299",
    minPersons: 2,
    courses: [
      "Hønsekødssuppe eller Pekingsuppe",
      "Ebirejer med sød chili",
      "Dybstegt kylling m. sur-sød sauce",
      "Grillede kinarejer med hvidløg",
      "And m. garniture, ingefær og cognac",
      "Svinekød med peberfrugter",
      "Is eller Irish coffee",
    ],
  },
];

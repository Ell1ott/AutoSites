export const SITE = {
  name: "Mikkelborg Kro",
  tagline:
    "Nyd et dejligt ophold hos os, og oplev det naturskønne område ved Jels søerne tæt på Mikkelborg.",
  email: "info@mikkelborgkro.dk",
  phone: "22 27 74 65",
  phoneHref: "tel:+4522277465",
  address: {
    street: "Mikkelborg Bygade 5",
    postal: "6630 Rødding",
    country: "Danmark",
  },
} as const;

export const EXTERNAL_LINKS = {
  facebook: "https://www.facebook.com/mikkelborgkro",
  smiley:
    "https://www.findsmiley.dk/da-DK/Searching/DetailsView.htm?searchstring=6630&searchtype=all&display=table&filter=M&SearchExact=false&virk=503868",
  rapport:
    "https://www.findsmiley.dk/da-DK/Searching/DetailsView.htm?searchstring=mikkelborg%20kro&searchtype=all&vtype=detail&mode=simple&display=table&sort=0&SearchExact=false&virk=503868",
  youtubeVideoId: "L0FAN3eWHGQ",
} as const;

export const MAIN_NAV = [
  { href: "/om-os", label: "Om os" },
  { href: "/cafe-restaurant", label: "Restaurant" },
  { href: "/selskaber", label: "Selskaber" },
  { href: "/bed-breakfast", label: "Bed & Breakfast" },
  { href: "/krostue", label: "Krostue" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

export const FOOTER_NAV = [
  { href: "/kontakt", label: "Kontakt" },
  { href: "/om-os", label: "Om os" },
  { href: "/cafe-restaurant", label: "Restaurant" },
  { href: "/cafe-restaurant/menukort", label: "Menukort" },
  { href: "/selskaber", label: "Selskaber" },
  { href: "/bed-breakfast", label: "Bed & Breakfast" },
  { href: "/krostue", label: "Krostue" },
  { href: "/video", label: "Video" },
] as const;

export const HOME_CARDS = [
  {
    href: "/cafe-restaurant",
    title: "Dagens menu",
    subtitle: "Se mere her",
    imageKey: "diningInterior" as const,
  },
  {
    href: "/cafe-restaurant/menukort",
    title: "Menu",
    subtitle: "Se vores menukort",
    imageKey: "diningSeafood" as const,
  },
  {
    href: "/bed-breakfast",
    title: "Bed & Breakfast",
    subtitle: "Se vores priser",
    imageKey: "roomBed" as const,
  },
  {
    href: "/selskaber",
    title: "Konfirmation",
    subtitle: "Hold festen hos os",
    imageKey: "diningDessert" as const,
  },
] as const;

export const RESTAURANT_INFO = {
  status: "Restaurant er lukket",
  statusDetail: "pga. salg",
  bookingNote: "Book: fortsat bookes værelser og bestilles selskaber.",
  openingHours: "Mandag - søndag: Lukket",
  preorderNote:
    "Ønskes der en kortere ventetid, så kan du ringe og forudbestille menuen.",
  portionNote:
    "Dagens ret alm. størrelse 119 kr. (til og med 12 personer derefter betragtes det som selskab +30 kr.) Ekstra kød 149 kr. Ønskes der dobbelt op portion pris 188 kr.",
  portionPrices: [
    { label: "Børne størrelse (max. 12 år)", price: "79,-" },
    { label: "Mindre portion", price: "89,-" },
    { label: "Normal portion", price: "119,-" },
    { label: "Normal portion + kød", price: "149,-" },
    { label: "Mega portion", price: "188,-" },
    { label: "+ Blancheret garniturer", price: "19,-" },
    { label: "+ Skål blandet salat", price: "45,-" },
  ],
} as const;

export const DAGENS_RET = {
  schedule: [
    { days: "Mandag - onsdag", note: "Lukket" },
    { days: "Torsdag - søndag", note: "Bestil fra vores a la carte menu" },
  ],
  weeklyMenu: [
    {
      day: "Torsdag",
      dish: "Gammeldags flæskesteg m. brun sovs, kartofler, rødkål & tyttebær",
      price: "119,-",
    },
    {
      day: "Fredag",
      dish: "Stegt flæsk m. persillesovs, kartofler & rødbede råkost",
      price: "119,-",
    },
    {
      day: "Lørdag",
      dish: "Kokkens valg",
      note: "Marts-oktober 1. lørdag i mdr. helstegt pattegris m. flødekartofler, tzatziki, brød og salat.",
      price: "119,-",
    },
    {
      day: "Søndag",
      dish: "Gammeldags oksesteg m. brun sovs, kartofler, bønner, glaseret perleløg & tyttebær",
      price: "119,-",
    },
  ],
} as const;

export const RESTAURANT_MENU = {
  forretter: [
    { name: "Hvidløgsbrød", price: "36,-" },
    { name: "Hvidløgsbrød m. ost", price: "39,-" },
    { name: "Sprødstegt kyllingesalat m. brød", price: "89,-" },
  ],
  hovedretter: [
    {
      name: "Wienerschnitzel/kalvefilet m. smørsovs, ovnkartofler, friske ærter & gulerødder",
      price: "219,-",
    },
    { name: "Spareribs m. ovnkartofler, favoritsovs & frisk grønt", price: "239,-" },
    {
      name: "Hakkebøf m. bløde løg, brun sovs, kartofler, syltede rødbeder & asier",
      price: "169,-",
    },
    { name: "Spaghetti carbonára & frisk grønt", price: "149,-" },
    { name: "Sprødstegt kyllingesalat m. brød", price: "139,-" },
  ],
  burger: [
    {
      name: "Burger Menu/pulled beef m. 2 spejlæg, bacon, BBQ sovs, salat, dertil ovnkartofler, ketchup & remulade",
      price: "179,-",
    },
    {
      name: "Burger/pulled beef m. 2 spejlæg, bacon, BBQ sovs & salat",
      price: "129,-",
    },
  ],
  dessert: [
    { name: "Æblekage m. nøddekrokant & flødeskum", price: "64,-" },
    {
      name: "Bananasplit m. hjemmelavet vaniljeis, chokoladesovs, flødeskum & nødder",
      price: "76,-",
    },
    { name: "Blødende chokoladekage m. hjemmelavet vaniljeis & frugt", price: "79,-" },
    { name: "Belgisk vaffel m. hjemmelavet vaniljeis & chokolade", price: "79,-" },
    { name: "Hjemmelavet vaniljeis m. chokoladevaffel & chokolade", price: "69,-" },
  ],
  boernemenu: [
    { name: "Dinonuggets m. pomfritter, ketchup & remulade, agurk & gulerødder", price: "79,-" },
    { name: "Frikadeller m. spaghetti, ketchup, agurk & gulerødder", price: "89,-" },
    {
      name: "Børneburger/pulled beef m. ketchup, salat agurk & peberfrugt samt pomfritter, ketchup og remulade",
      price: "99,-",
    },
  ],
  selskaber: [
    { name: "Bestil din næste fest hos os, priser på 3 retters menu fra", price: "316,-" },
  ],
  drikkevare: [
    { name: "Hancock Sportcola", price: "38,-" },
    { name: "Pepsi", price: "30,-" },
    { name: "Pepsi max", price: "30,-" },
    { name: "Miranda lemon", price: "30,-" },
    { name: "Frem Appelsin", price: "30,-" },
    { name: "Frem Hindbær", price: "30,-" },
    { name: "Frem dansk vand m. citrus", price: "30,-" },
    { name: "Cocio", price: "30,-" },
    { name: "Æblejuice ufiltreret", price: "25,-" },
    { name: "Kakao m. flødeskum", price: "40,-" },
    { name: "Glas sødmælk", price: "20,-" },
    { name: "Kande sødmælk", price: "40,-" },
    { name: "Kaffe - americano eller espresso", price: "25,-" },
    { name: "Kaffe kande", price: "60,-" },
    { name: "Iskaffe m. chokoladesovs", price: "49,-" },
    { name: "Special kaffe, cappuccino, cafe latte", price: "40,-" },
    { name: "Glas vand-gratis pr. person ved køb af anden drikkevare", price: "19,-" },
    { name: "Kande vand-gratis ved køb af en flaske vin", price: "25,-" },
  ],
  alkohol: [
    { name: "Fadøl 250ml (Fuglsang Black Bird, Hancock Høkerbajer, Hancock Darklager)", price: "38,-" },
    { name: "Fadøl 400ml", price: "55,-" },
    { name: "Fadøl 500ml", price: "68,-" },
    { name: "Royal Pilsner 0,0", price: "35,-" },
    { name: "1 glas huset rød/hvid/rosé", price: "49,-" },
    { name: "1/2 flaske huset rød/hvid/rosé", price: "127,-" },
    { name: "1 flaske huset rød/hvid/rosé", price: "239,-" },
    { name: "Dessertvin", price: "35,-" },
    { name: "Baileys", price: "30,-" },
    { name: "Irisk coffe - kaffe, 3 cl Tullamore og flødeskum", price: "60,-" },
    { name: "Div. drinks - 2 cl alkohol og 1 alm. sodavand", price: "60,-" },
    { name: "Div. drinks - 2 stk.", price: "100,-" },
    { name: "Alm. genstand", price: "30,-" },
  ],
} as const;

export const BNB_PRICES = [
  {
    label: "2-personersværelse for max. to overnattende gæster",
    price: "650,-",
  },
  {
    label: "2-personersværelse for én overnattende gæst",
    price: "530,-",
  },
  {
    label: "3-personersværelse for max. tre overnattende gæster",
    price: "900,-",
  },
  {
    label: "Enkeltværelse",
    price: "440,-",
  },
] as const;

export const BNB_FACILITIES = [
  "Alle værelser er indrettede unikke med eget bad og toilet.",
  "Inkl. sengelinnede og håndklæder",
  "Fællesareal med spiseplads, fjernsyn og køleskab.",
  "Elkedel, brødrister og fri kaffe/te",
] as const;

export const BNB_ATTRACTIONS = [
  "Klokkemuseum/ skolemuseum",
  "Wellings Landsbymuseum",
] as const;

export const SELSKABER_MENU = {
  forretter: [
    { name: "Tarteletter med høns og asparges", price: "69,-" },
    { name: "Hjemmelavet hønsesalt på ananasbund, hjertesalat & hjemmelavet brød", price: "89,-" },
    { name: "Hjemmelavet tunmousse på hjertesalat & hjemmelavet brød", price: "84,-" },
    { name: "Hjemmelavet tærte med broccoli/skinke eller tomat/porre", price: "74,-" },
    { name: "Laksemousse på kiks m. grønt & babyspire", price: "99,-" },
    { name: "Halv jomfruhummer med grønt, friske asparges og hjemmelavet brød", price: "169,-" },
  ],
  hovedretter: [
    {
      name: "Svinekam stegt som vildt med brun sovs, kartofler, waldorfsalat, tyttebær, gulerødder & bønner",
      price: "188,-",
    },
    { name: "Gammeldags højreb med fløde kartofler og Salat buffet", price: "219,-" },
    {
      name: "Gammeldags kalvesteg som vildt med brun sovs, kartofler, waldorfsalat, tyttebær, gulerødder & bønner",
      price: "209,-",
    },
    {
      name: "Gammeldags oksesteg med brun sovs, kartofler, waldorfsalat, tyttebær, gulerødder & bønner",
      price: "219,-",
    },
    { name: "Glaseret Hamburgerryg med fløde kartofler og salat buffet", price: "188,-" },
    {
      name: "Helstegt pattegris med fløde kartofler og salat buffet, hjemmelavet brød & Tzatziki",
      price: "189,-",
      note: "min. 40 kuverter",
    },
  ],
  dessert: [
    { name: "Nøddebund med rabarberskum friske jordbær & chokolade", price: "69,-" },
    {
      name: "Hjemmelavet is, vælge mellem jordbær, chokolade eller vanilje, dertil frugt og vafler",
      price: "69,-",
    },
    { name: "Daim islagkage", price: "79,-" },
    { name: "Chokolade lagkage med hindbærskum", price: "48,-" },
    { name: "Citronfromage m. flødeskum", price: "59,-" },
  ],
  ekstra: [
    { name: "Kaffe med småkager", price: "49 kr." },
    { name: "Kaffe med Hjemmebag", price: "69 kr." },
  ],
  natmad: [{ name: "Div. Supper efter eget valg med flutes", price: "89 kr." }],
  notes: [
    "Alle priser er pr. person ved min. 30 kuverter",
    "Ønskes ad libitum vin og drikkelse 220 kr. pr. person i 4 timer",
    "Alle priser er inkl. bord opdækning og oprydning",
    "Kontant/kort betaling 7 dage inden festen.",
  ],
} as const;

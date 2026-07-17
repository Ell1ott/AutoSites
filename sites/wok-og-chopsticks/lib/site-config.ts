export const SITE = {
  name: "Wok og Chopsticks",
  shortName: "WOC",
  tagline: "Kinesisk restaurant i Næstved",
  email: "",
  phone: "+45 55 77 73 79",
  phoneHref: "tel:+4555777379",
  address: "Axeltorv 9E, 4700 Næstved",
  addressLine: "Axeltorv 9E",
  cityLine: "4700 Næstved",
  companyLabel: "Chinese Restaurant",
} as const;

export const LINKS = {
  wolt: "https://wolt.com/da/dnk/naestved/restaurant/wok-chopsticks",
  findsmiley:
    "http://www.findsmiley.dk/da-DK/Searching/DetailsView.htm?virk=90920955",
  rejseplanen:
    "http://www.rejseplanen.dk/bin/query.exe/mn?ZADR=1&timesel=arrive&Z=Axeltorv%209E+,+4700+Næstved",
  maps: "https://maps.google.dk/maps?q=Kinesisk+Rest.+Wok+%26+Chopsticks,+Axeltorv+9,+4700+N%C3%A6stved&hl=da",
} as const;

export const SOCIAL = {
  facebook: "https://www.facebook.com/",
  instagram: "#",
  linkedin: "#",
  x: "#",
} as const;

export const HOURS = [
  { day: "Mandag", time: "16:30 – 22:00" },
  { day: "Tirsdag", time: "LUKKET (*)" },
  { day: "Onsdag", time: "16:30 – 22:00" },
  { day: "Torsdag", time: "16:30 – 22:00" },
  { day: "Fredag", time: "11:30 – 23:00" },
  { day: "Lørdag", time: "11:30 – 23:00" },
  { day: "Søndag", time: "11:30 – 22:00" },
] as const;

export const HOURS_NOTES = [
  "OBS: Køkkenet lukker 1 time før lukketid.",
  "(*) Ekstraordinært åbent tirsdage bliver løbende lagt op på siden og Facebook.",
] as const;

export const SUMMER_NOTICE = {
  title: "Sommerferielukket 2026",
  body: "Kære gæster — i år holder vi sommerferielukket fra mandag d. 13. juli til og med tirsdag d. 4. august 2026. Vi åbner igen onsdag d. 5. august. Vi ønsker alle en rigtig dejlig sommer.",
} as const;

export const TUESDAY_NOTICE =
  "OBS. Vi har lukket hver tirsdag. De tirsdage vi planlægger at holde åbent, bliver løbende lagt op på hjemmesiden og Facebook — f.eks. specielle arrangementer, mærkedage, lillejuleaften, nytår osv.";

export const PARTY_INFO = {
  capacity: "Vi kan have selskaber op til 140 personer.",
  occasions:
    "Bryllup, konfirmation, fødselsdage, firmafest, julefrokost m.m.",
  amenities: ["Legerum", "Handicapvenligt"],
} as const;

export const MAIN_NAV = [
  { href: "/", label: "Forsiden" },
  { href: "/frokost", label: "Frokost" },
  { href: "/aftenbuffet", label: "Aftenbuffet" },
  { href: "/a-la-carte", label: "A La Carte" },
  { href: "/menuer", label: "Menuer" },
  { href: "/buffet-ud-af-huset", label: "Buffet ud af huset" },
  { href: "/billeder", label: "Billeder" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

export const FOOTER_NAV = [
  { href: "/", label: "Forsiden" },
  { href: "/menuer", label: "Menuer" },
  { href: "/reservation", label: "Reservation" },
  { href: "/kontakt", label: "Kontakt os" },
  { href: "/privatliv", label: "Privatlivspolitik" },
  { href: "/vilkaar", label: "Vilkår" },
] as const;

export const STATS = [
  { value: "140", label: "Gæster til selskab", icon: "guests" as const },
  { value: "1", label: "Restaurant i Næstved", icon: "dishes" as const },
  { value: "7", label: "Dage — lukket tirsdag", icon: "years" as const },
  { value: "20%", label: "Rabat ved afhentning", icon: "events" as const },
];

export const TAKEAWAY_DISCOUNT =
  "20% rabat på mad ud af huset (gælder kun ved selvafhentning, dog ikke China-Box, frokostretter, Wok Away menu og tilbudsmenuer). Der tages forbehold for evt. fejl og prisændringer.";

export const BUFFET_PACKAGES = [
  {
    title: "Buffet ud af huset",
    minGuests: 10,
    price: "178",
    pickupPrice: "143",
    items: [
      "Vælg mellem hønsekødsuppe eller Peking-suppe",
      "Hjemmelavet forårsrulle",
      "Indbagte kinarejer",
      "Svinemørbrad m. bambusskud & champignon",
      "Indbagt kylling",
      "Oksekød m. blandede grøntsager",
      "Kylling i karry",
      "Stegte nudler de luxe",
      "Blandet salat m. dressing",
      "Ris",
      "Sursød sauce, chili sauce & soya sauce",
    ],
  },
  {
    title: "Buffet ud af huset",
    minGuests: 15,
    price: "178",
    pickupPrice: "143",
    items: [
      "Vælg mellem hønsekødsuppe eller Peking-suppe",
      "Hjemmelavet forårsrulle",
      "Indbagte kinarejer",
      "Stegte nudler de luxe",
      "Canton-and m. garniture",
      "Oksekød m. blandede grøntsager",
      "Gongbao-kylling m. nødder",
      "Kylling i karry",
      "Indbagt svinemørbrad",
      "Ris",
      "Blandet salat m. dressing",
      "Sursød sauce, chili sauce & soya sauce",
    ],
  },
  {
    title: "Buffet ud af huset",
    minGuests: 20,
    price: "178",
    pickupPrice: "143",
    items: [
      "Vælg mellem hønsekødsuppe eller Peking-suppe",
      "Hjemmelavet forårsrulle",
      "Indbagte kinarejer",
      "Svinemørbrad m. bambusskud & champignon",
      "Canton-and m. garniture",
      "Indbagt kylling",
      "Oksekød m. blandede grøntsager",
      "Gongbao-kylling m. nødder (stærk)",
      "Kylling i karry",
      "Stegte nudler de luxe",
      "Indbagte blæksprutteringe",
      "Indbagt svinemørbrad",
      "Ris",
      "Blandet salat m. dressing",
      "Sursød sauce, chili sauce & soya sauce",
    ],
  },
] as const;

export const BUFFET_EXTRAS = [
  "Tillæg: rejebrød (20 flager) kr. 30,-",
  "Der er mulighed for at låne diverse service som: suppeskåle, suppeskeer, spisepinde, opøsere, stålbakker og varmeplader ved at lægge et depositum på kr. 1.000,-",
] as const;

export const TESTIMONIALS = [
  {
    name: "Gæst fra Næstved",
    quote:
      "Wok og Chopsticks er vores faste sted til både hverdag og fest. Buffeten er bred, maden er frisk, og de klarer selskaber med ro og overblik — også når vi er mange.",
  },
  {
    name: "Familiearrangement",
    quote:
      "Vi holdt konfirmation her og kunne være op til mange gæster. Legerummet var en gave for børnene, og det handicapvenlige lokale gjorde det nemt for alle.",
  },
  {
    name: "Takeaway-gæst",
    quote:
      "Buffet ud af huset er perfekt til firmaet. God pris, solidt udvalg, og 20% rabat ved afhentning gør det endnu bedre.",
  },
] as const;

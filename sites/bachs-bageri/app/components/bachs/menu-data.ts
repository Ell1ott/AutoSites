export type MenuProduct = {
  category: string;
  title: string;
  description: string;
  note: string;
};

export const menuProducts: MenuProduct[] = [
  {
    category: "Brød",
    title: "Friskbagt brød",
    description:
      "Håndværk fra ovnen — med ekstra kærlighed til det grove, især vores rugbrød.",
    note: "Dagligt udvalg i butikken",
  },
  {
    category: "Wienerbrød",
    title: "Wienerbrød & spandauer",
    description:
      "Smørede lag, sprøde kanter og klassisk konditorkærlighed til formiddagskaffen.",
    note: "Bages hos os",
  },
  {
    category: "Kager",
    title: "Kager til hverdag og fest",
    description:
      "Alt fra det søde i disken til sæsonens favoritter — spørg os, hvis du har ønsker.",
    note: "Ring eller kig forbi",
  },
  {
    category: "Smørrebrød",
    title: "Smørrebrød & sandwich",
    description:
      "Pålæg, salat og hjemmebagt brød — nem frokost eller mad til udvejen.",
    note: "Takeaway-frokost",
  },
  {
    category: "Sæson",
    title: "Pålægskagemænd & kagekoner",
    description:
      "Detaljer der fejrer højtiderne — bestil i god tid i særlige perioder.",
    note: "Efter sæson og efterspørgsel",
  },
  {
    category: "Is & koldt",
    title: "Is",
    description: "Noget koldt og sødt, når det smager bedst — spørg i disken.",
    note: "Udvalg varierer",
  },
  {
    category: "Drikke",
    title: "Drikkevarer",
    description:
      "Kaffe, kakao, kildevand og mere — perfekt til bagværket på farten.",
    note: "Tag med",
  },
  {
    category: "Morgen",
    title: "Morgenmad",
    description:
      "Start dagen med noget fra ovnen — croissanter, rundstykker og det, vi står med i dag.",
    note: "Fra kl. 06.00",
  },
];

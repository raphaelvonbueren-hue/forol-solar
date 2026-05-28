/**
 * Jakobspark.swiss — Inhalte vom CDN.
 *
 * Bilder + PDFs gehostet auf Webflow CDN (cdn.prod.website-files.com),
 * direkt referenziert — kein Re-Hosting nötig, da Webflow CDN stabil ist.
 *
 * Generiert via Browser-Scrape: 2026-05-28
 * Quelle: https://www.jakobspark.swiss/
 *
 * Hinweis: Bei .avif/.avif.avif-Doppelendungen handelt es sich um den
 * Original-Webflow-Filename. Die URLs funktionieren so wie sie sind.
 */

const CDN = 'https://cdn.prod.website-files.com';
const F23 = '69d953639d2ced1215c8ab23'; // Folder mit Brand/Hero
const F29 = '69d953639d2ced1215c8ab29'; // Folder mit Wohnungs-Renderings

/** Allgemeine Dokumente. */
export const JAKOBSPARK_DOCS = {
  Stockwerkplaene: `${CDN}/${F23}/69d953639d2ced1215c8abcc_69b3afd7423ca7a74b13f4d8_Stockwerkpla%CC%88ne%20-%20Jakobspark.pdf`,
  Ablauf: `${CDN}/${F23}/69d953639d2ced1215c8abcd_67921dc96d7a73e1be99c212_Ablauf%20Jakobspark%20Rorschach.pdf`,
  Gewerbe: `${CDN}/${F29}/69d953639d2ced1215c8ab93_67875fdef482f3735dcb5b82_00_grundriss_gewerbe.pdf`,
} as const;

/** Grundriss-PDF pro Wohnung (Apartment-Nummer als String-Key). */
export const JAKOBSPARK_FLOORPLANS: Record<string, string> = {
  '01': `${CDN}/${F29}/69d953639d2ced1215c8ab95_67875e011f7046226ac72cf6_01_grundriss_wohnung.pdf`,
  '02': `${CDN}/${F29}/69d953639d2ced1215c8ab97_67875e0c06225055b3b51da9_02_grundriss_wohnung.pdf`,
  '03': `${CDN}/${F29}/69d953639d2ced1215c8ab99_67875e211701aad79753a6d5_03_grundriss_wohnung.pdf`,
  '04': `${CDN}/${F29}/69d953639d2ced1215c8abac_67875e3c0a8a9777a0775406_04_grundriss_wohnung.pdf`,
  '05': `${CDN}/${F29}/69d953639d2ced1215c8abbe_67875e45333a8b0824a9acc2_05_grundriss_wohnung.pdf`,
  '06': `${CDN}/${F29}/69d953639d2ced1215c8abc0_67875e4f74fedf550c3f4348_06_grundriss_wohnung.pdf`,
  '07': `${CDN}/${F29}/69d953639d2ced1215c8abc1_67875e57de2529a750759cfa_07_grundriss_wohnung.pdf`,
  '08': `${CDN}/${F29}/69d953639d2ced1215c8abc3_67875e74454b53678e312452_08_grundriss_wohnung.pdf`,
  '09': `${CDN}/${F29}/69d953639d2ced1215c8abc5_67875e8b7ae0ada6daac78db_09_grundriss_wohnung.pdf`,
  '10': `${CDN}/${F29}/69d953639d2ced1215c8abcf_67875e93de2529a75075e05c_10_grundriss_wohnung.pdf`,
  '11': `${CDN}/${F29}/69d953639d2ced1215c8abd1_67875ea2e2137753fef59eaf_11_grundriss_wohnung.pdf`,
  '12': `${CDN}/${F29}/69d953639d2ced1215c8abd3_67875eb7de2529a7507624ed_12_grundriss_wohnung.pdf`,
  '13': `${CDN}/${F29}/69d953639d2ced1215c8abd5_67875ec2f482f3735dc9d34e_13_grundriss_wohnung.pdf`,
  '14': `${CDN}/${F29}/69d953639d2ced1215c8abd7_67875ec97afc255a0fbf9a48_14_grundriss_wohnung.pdf`,
  '15': `${CDN}/${F29}/69d953639d2ced1215c8abd9_67875ed24fc3c592ed97d7d1_15_grundriss_wohnung.pdf`,
  '16': `${CDN}/${F29}/69d953639d2ced1215c8abdb_67875ee51f7046226ac7e84d_16_grundriss_wohnung.pdf`,
  '17': `${CDN}/${F29}/69d953639d2ced1215c8abdd_67875eee6add79397fa0e5d7_17_grundriss_wohnung.pdf`,
  '18': `${CDN}/${F29}/69d953639d2ced1215c8abdf_67875efa9002a6723a64c85c_18_grundriss_wohnung.pdf`,
  '19': `${CDN}/${F29}/69d953639d2ced1215c8abe1_67875f2d8d671a23247a89ab_19_grundriss_wohnung_maisonette.pdf`,
  '20': `${CDN}/${F29}/69d953639d2ced1215c8abe3_67875f3a14306e085693d4c9_20_grundriss_wohnung.pdf`,
  '21': `${CDN}/${F29}/69d953639d2ced1215c8abe5_67875f4315ccfc909c4bc41d_21_grundriss_wohnung.pdf`,
  '23': `${CDN}/${F29}/69d953639d2ced1215c8abe8_6787a613f1eacc1d5ec00a29_23_grundriss_wohnung-maisonette.pdf`,
  '24': `${CDN}/${F29}/69d953639d2ced1215c8abe9_67875f8a1110d4af8de7d4fe_24_grundriss_wohnung.pdf`,
  '25': `${CDN}/${F29}/69d953639d2ced1215c8abec_67875f9374fedf550c40a14a_25_grundriss_wohnung.pdf`,
  '26': `${CDN}/${F29}/69d953639d2ced1215c8abee_6797737b426eb626d112e0a7_26%20-%20Grundriss%20Wohnung.pdf`,
  '27': `${CDN}/${F29}/69d953639d2ced1215c8abf0_67875fa7f37201dcc6828ff2_27_grundriss_wohnung.pdf`,
  '28': `${CDN}/${F29}/69d953639d2ced1215c8abf2_67875fb1e8244ffa813b46f0_28_grundriss_wohnung.pdf`,
  '29': `${CDN}/${F29}/69d953639d2ced1215c8abf3_67875fbbde2529a75076faf5_29_grundriss_wohnung.pdf`,
  '30': `${CDN}/${F29}/69d953639d2ced1215c8abf5_67875fc4e8244ffa813b52b1_30_grundriss_wohnung%20(1).pdf`,
};

/** Hero-Bild für Projekt-Tab. */
export const JAKOBSPARK_HERO = `${CDN}/${F23}/6a14794afb58a4b4c9b9d1ca_jakobspark_opengraph.jpg`;

/** Pro-Wohnung Innenraum-Rendering (Apartment-Nummer als Key). */
export const JAKOBSPARK_APARTMENT_IMAGES: Record<string, string> = {
  '01': `${CDN}/${F29}/69d953639d2ced1215c8ab98_67698022cad44a99733b90b8_Rorschach_2-Obergeschoss_Whg-01.avif`,
  '02': `${CDN}/${F29}/69d953639d2ced1215c8ab96_6769802282c1108af437a4d4_Rorschach_2-Obergeschoss_Whg-02.avif`,
  '03': `${CDN}/${F29}/69d953639d2ced1215c8ab94_67698022980da2c788b15d1e_Rorschach_2-Obergeschoss_Whg-03.avif`,
  '04': `${CDN}/${F29}/69d953639d2ced1215c8ab9a_67698022da43c07dd8e2eeba_Rorschach_2-Obergeschoss_Whg-04.avif`,
  '05': `${CDN}/${F29}/69d953639d2ced1215c8abbd_67698022c63014058d4d43a5_Rorschach_2-Obergeschoss_Whg-05.avif`,
  '06': `${CDN}/${F29}/69d953639d2ced1215c8abbf_67698022d4b1d776a650e995_Rorschach_2-Obergeschoss_Whg-06.avif`,
  '08': `${CDN}/${F29}/69d953639d2ced1215c8abc2_67698023fa479a560ccda6d5_Rorschach_2-Obergeschoss_Whg-08.avif`,
  '09': `${CDN}/${F29}/69d953639d2ced1215c8abc4_67698022153cb14e3da8a5e2_Rorschach_2-Obergeschoss_Whg-09.avif`,
  '10': `${CDN}/${F29}/69d953639d2ced1215c8abce_67698022153cb14e3da8a619_Rorschach_2-Obergeschoss_Whg-10.avif`,
  '11': `${CDN}/${F29}/69d953639d2ced1215c8abd0_67698022f1014ea382fdaf81_Rorschach_2-Obergeschoss_Whg-11.avif`,
  '12': `${CDN}/${F29}/69d953639d2ced1215c8abd2_676980226deba0cd6779dd69_Rorschach_2-Obergeschoss_Whg-12.avif`,
  '13': `${CDN}/${F29}/69d953639d2ced1215c8abd4_67698022fc21b76201ff8a72_Rorschach_2-Obergeschoss_Whg-13.avif`,
  '14': `${CDN}/${F29}/69d953639d2ced1215c8abd6_67698022ffcfd0b6b8c07bdb_Rorschach_2-Obergeschoss_Whg-14.avif`,
  '15': `${CDN}/${F29}/69d953639d2ced1215c8abd8_6769802294e12f884216bf04_Rorschach_2-Obergeschoss_Whg-15.avif`,
  '18': `${CDN}/${F29}/69d953639d2ced1215c8abde_6769802382c1108af437a5ee_Rorschach_2-Obergeschoss_Whg-18.avif`,
  '19': `${CDN}/${F29}/69d953639d2ced1215c8abe0_6769802302731beef59782f8_Rorschach_2-Obergeschoss_Whg-19.avif`,
  '20': `${CDN}/${F29}/69d953639d2ced1215c8abe2_6769802394e12f884216bf7f_Rorschach_2-Obergeschoss_Whg-20.avif`,
  '21': `${CDN}/${F29}/69d953639d2ced1215c8abe4_6769802371c59cde133cb9b3_Rorschach_2-Obergeschoss_Whg-21.avif`,
  '22': `${CDN}/${F29}/69d953639d2ced1215c8abe6_676980236e6049d63f75f1d1_Rorschach_2-Obergeschoss_Whg-22.avif`,
  '23': `${CDN}/${F29}/69d953639d2ced1215c8abe7_67698023d4b1d776a650eac6_Rorschach_2-Obergeschoss_Whg-23.avif`,
  '24': `${CDN}/${F29}/69d953639d2ced1215c8abea_676980232197a73f43851df1_Rorschach_2-Obergeschoss_Whg-24%20(1).avif`,
  '25': `${CDN}/${F29}/69d953639d2ced1215c8abeb_67698023e221034771729622_Rorschach_2-Obergeschoss_Whg-25.avif`,
  '26': `${CDN}/${F29}/69d953639d2ced1215c8abed_67698023a7f399ccfc0f8635_Rorschach_2-Obergeschoss_Whg-26.avif`,
  '27': `${CDN}/${F29}/69d953639d2ced1215c8abef_676980241dd275da152215e5_Rorschach_2-Obergeschoss_Whg-27.avif`,
  '28': `${CDN}/${F29}/69d953639d2ced1215c8abf1_67698024ecf082b10bce94a2_Rorschach_2-Obergeschoss_Whg-28.avif`,
  '30': `${CDN}/${F29}/69d953639d2ced1215c8abf4_676980241dd275da1522161a_Rorschach_2-Obergeschoss_Whg-30.avif`,
  // Erdgeschoss / Spezial
  'EG': `${CDN}/${F29}/69d953639d2ced1215c8ab6a_677bbe5366e5f191058332d8_Rorschach_0-EG.avif`,
  '07': `${CDN}/${F29}/6a1566eba9cd179e373ac158_wohnung7.avif`,
  '29': `${CDN}/${F29}/6a15673bc27920c7027d04bf_Wohnung29.avif`,
};

/** Hochwertige Marketing-/Galerie-Bilder. */
export const JAKOBSPARK_GALLERY: { url: string; alt: string; category: string }[] = [
  // Fassaden / Aussenansichten
  { url: `${CDN}/${F23}/69d953639d2ced1215c8ab9e_Jakobspark%20Rorschach%20Facade.avif`, alt: 'Jakobspark Fassade', category: 'aussen' },
  { url: `${CDN}/${F23}/69d953639d2ced1215c8abad_677bca6d58bee706e159c6a0_jakobspark_fassade.avif.avif`, alt: 'Jakobspark Fassade Detail', category: 'aussen' },
  { url: `${CDN}/${F23}/6a16bcd9d28d076e04d75e45_Jakobspark%20(2).jpg`, alt: 'Jakobspark Anlage', category: 'aussen' },
  { url: `${CDN}/${F23}/69d953639d2ced1215c8aba5_Jakobspark%20Rorschach%20002.avif`, alt: 'Jakobspark Aussenansicht', category: 'aussen' },
  { url: `${CDN}/${F23}/69d953639d2ced1215c8aba1_Jakobspark%20Rorschach%20004.avif`, alt: 'Jakobspark mit Sonneneinstrahlung', category: 'aussen' },
  { url: `${CDN}/${F23}/69d953639d2ced1215c8aba4_Jakobspark%20Rorschach%20Test%2001.avif`, alt: 'Jakobspark Tag-Ansicht', category: 'aussen' },

  // Innenräume Lifestyle
  { url: `${CDN}/${F23}/69d953639d2ced1215c8aba0_Jakobspark%20Rorschach%20Living%20Room.avif`, alt: 'Wohnzimmer mit Seeblick', category: 'interior' },
  { url: `${CDN}/${F23}/69d953639d2ced1215c8ab7a_6755444be2de6639fc70fc83_card-image-left.avif.avif`, alt: 'Modernes Wohnzimmer mit Glastisch und Essbereich, Blick auf Terrasse und Stadt', category: 'interior' },
  { url: `${CDN}/${F23}/69d953639d2ced1215c8abb8_67669819217b8393dc5fbe6b_kurzbau_visual_2.avif`, alt: 'Esszimmer mit gedecktem Tisch und Balkon mit Meerblick', category: 'interior' },
  { url: `${CDN}/${F23}/69d953639d2ced1215c8abc8_6766904e5d86a266fb378e17_kurzbau_visual.avif`, alt: 'Moderner Essbereich mit hellen Stühlen', category: 'interior' },
  { url: `${CDN}/${F23}/69d953639d2ced1215c8aba2_Jakobspark%20Rorschach%205.5Zi%20Mais%20Innen.avif`, alt: '5.5 Zimmer Maisonette Innen', category: 'interior' },
  { url: `${CDN}/${F23}/69d953639d2ced1215c8aba3_Jakospark%20Rorschach%203.5%20Zi%20Final.avif`, alt: '3.5 Zimmer Innenausstattung', category: 'interior' },
  { url: `${CDN}/${F23}/69d953639d2ced1215c8ab9f_Jakobspark%20Interior%203.avif`, alt: 'Jakobspark Innenausstattung', category: 'interior' },
  { url: `${CDN}/${F23}/69d953639d2ced1215c8ab9d_Region%20-%20carousel.avif`, alt: 'Terrasse mit Lounge-Sessel und Blick auf Meer bei Sonnenuntergang', category: 'interior' },

  // Lage Rorschach
  { url: `${CDN}/${F23}/69d953639d2ced1215c8abba_67729bcb0c3d71f4bffb4c08_Rorschach-15.avif`, alt: 'Historisches Gebäude mit Museum am Bodensee', category: 'umgebung' },
  { url: `${CDN}/${F23}/69d953639d2ced1215c8abb9_676eb971c0e03692ff1f6938_Rorschach-42_cropped.avif`, alt: 'Herbstbaum mit gelben Blättern am See', category: 'umgebung' },
  { url: `${CDN}/${F23}/69d953639d2ced1215c8aba6_Jakobspark%20Mapbox%20Screenshot.avif`, alt: 'Lageplan Jakobspark Rorschach', category: 'umgebung' },
  { url: `${CDN}/${F23}/69d953639d2ced1215c8aba8_24Header.avif`, alt: 'Rorschach Stadtansicht', category: 'umgebung' },
  { url: `${CDN}/${F23}/69d953639d2ced1215c8aba9_676935ad9f3c4a04df550c09_showroom_bg_1.avif`, alt: 'Showroom Hintergrund', category: 'umgebung' },
];

/** Marketing-Texte aus Original-Seite. */
export const JAKOBSPARK_TEXTS = {
  tagline: 'Eigentumswohnungen in Rorschach mit Seesicht',
  headline: 'Der Traum vom Leben am See, mit einer Aussicht die verzaubert.',
  description: '28 exklusive Eigentumswohnungen mit Seeblick in Rorschach. Moderne Architektur, nachhaltige Bauweise, zentrale Lage am Bodensee.',
  sections: [
    'Alle Facetten des Wohlfühlens',
    'Komfort ganz zentral, mit Blick auf den Bodensee',
    'Das Wohnangebot im Jakobspark',
    'Sommer oder Winter, komfortables Wohnen ist garantiert',
    'Die Lage als Vorteil und Wert',
    'Raum für mehr',
    'Die Lage im Zentrum eröffnet unzählige Möglichkeiten',
    'Nachhaltig & barrierefrei',
    'Vorzüge, die das Leben in Ihrer neuen Wohnung lebenswert machen',
    'Ausgleich oder Action: Die freie Wahl am Bodenseedreieck',
    'Die ideale Wohnlage für jeden',
  ],
} as const;

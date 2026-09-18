/**
 * The sector catalogue — the vocabulary the legal crawler matches against.
 *
 * This is a *matching input*, not just picker copy. `keywords` is what lets
 * `matcher.ts` decide, deterministically, whether a decree published in the
 * Journal Officiel concerns a given company. Editing a keyword changes which
 * legal alerts a company sees, so treat it as domain logic rather than as
 * display text.
 *
 * Keywords are deliberately given in both French and Arabic. Decrees are
 * published in both languages, and the French edition of the Journal Officiel
 * carries Arabic titles alongside the French — so a sector that only knows its
 * French name will miss matching Arabic headings.
 *
 * `code` is a stable internal identifier and is never shown as the primary
 * label in the UI: this app is used by business owners, not accountants, so the
 * picker leads with `label` and `description`. The codes are chosen to be
 * readable rather than to mirror any official Algerian nomenclature — see the
 * note at the bottom of this file.
 */

import { normalizeText } from "./text";

/** Coarse grouping, used to section the picker so it stays navigable. */
export const SECTOR_GROUPS = [
  "Agriculture & Pêche",
  "Industrie & Production",
  "Énergie & Mines",
  "Bâtiment & Travaux Publics",
  "Commerce",
  "Transport & Logistique",
  "Services aux entreprises",
  "Hébergement, Restauration & Tourisme",
  "Santé",
  "Éducation & Formation",
  "Autres",
] as const;

export type SectorGroup = (typeof SECTOR_GROUPS)[number];

export interface Sector {
  /** Stable internal identifier. Not an official Algerian code. */
  readonly code: string;
  /** Plain-French name, shown as the primary text in the picker. */
  readonly label: string;
  readonly group: SectorGroup;
  /** One line, written for a business owner rather than an accountant. */
  readonly description: string;
  /** French + Arabic terms the decree matcher looks for. */
  readonly keywords: readonly string[];
}

export const SECTORS: readonly Sector[] = [
  // ---------------------------------------------------------------- Agriculture
  {
    code: "AGRI_CULTURES",
    label: "Cultures & céréales",
    group: "Agriculture & Pêche",
    description:
      "Céréales, maraîchage, arboriculture, oléiculture et grandes cultures.",
    keywords: [
      "agriculture", "agricole", "céréales", "céréaliculture", "blé", "maraîchage",
      "arboriculture", "olive", "oléiculture", "phoeniciculture", "dattes", "cultures",
      "فلاحة", "الفلاحة", "زراعة", "الزراعة", "حبوب", "القمح", "خضر", "أشجار", "زيتون", "تمور",
    ],
  },
  {
    code: "AGRI_ELEVAGE",
    label: "Élevage & production animale",
    group: "Agriculture & Pêche",
    description:
      "Élevage bovin, ovin, aviculture, apiculture et production laitière.",
    keywords: [
      "élevage", "aviculture", "apiculture", "volaille", "bovin", "ovin", "lait",
      "laitier", "viande", "abattage", "fourrage", "animal", "animale",
      "تربية", "المواشي", "الدواجن", "النحل", "الأبقار", "الأغنام", "الحليب", "اللحوم", "الأعلاف",
    ],
  },
  {
    code: "AGRI_PECHE",
    label: "Pêche & aquaculture",
    group: "Agriculture & Pêche",
    description: "Pêche maritime, pêche en eau douce et aquaculture.",
    keywords: [
      "pêche", "aquaculture", "halieutique", "poisson", "maritime", "conchylicole",
      "الصيد", "الصيد البحري", "الأسماك", "تربية المائيات", "الاستزراع",
    ],
  },

  // ----------------------------------------------------------------- Industrie
  {
    code: "IND_AGROALIMENTAIRE",
    label: "Agroalimentaire & boissons",
    group: "Industrie & Production",
    description:
      "Transformation de produits agricoles, conserverie, boissons et tabac.",
    keywords: [
      "agroalimentaire", "agro-alimentaire", "alimentaire", "conserverie", "boisson",
      "boissons", "minoterie", "semoulerie", "huile", "sucre", "laiterie", "biscuiterie",
      "chocolaterie", "tabac", "conditionnement",
      "الصناعات الغذائية", "الغذائي", "المشروبات", "المطاحن", "السميد", "الزيوت", "السكر", "التبغ", "التعليب",
    ],
  },
  {
    code: "IND_TEXTILE",
    label: "Textile, cuir & habillement",
    group: "Industrie & Production",
    description:
      "Filature, tissage, confection, maroquinerie et industrie du cuir.",
    keywords: [
      "textile", "habillement", "confection", "filature", "tissage", "cuir", "maroquinerie",
      "chaussure", "chaussures", "tannerie", "bonneterie", "mode",
      "النسيج", "الملابس", "الخياطة", "الجلود", "الأحذية", "الدباغة", "الغزل",
    ],
  },
  {
    code: "IND_CHIMIE_PHARMA",
    label: "Chimie, plastique & pharmacie",
    group: "Industrie & Production",
    description:
      "Industrie chimique, pétrochimie, matières plastiques, détergents et production pharmaceutique.",
    keywords: [
      "chimie", "chimique", "pétrochimie", "plastique", "plastiques", "résine",
      "détergent", "peinture", "engrais", "pharmaceutique", "pharmacie", "médicament",
      "cosmétique", "parfum", "savon", "caoutchouc",
      "الكيمياء", "الكيميائية", "البلاستيك", "الأدوية", "الصيدلة", "الأسمدة", "الدهون", "المنظفات", "العطور", "المطاط",
    ],
  },
  {
    code: "IND_METALLURGIE",
    label: "Métallurgie & mécanique",
    group: "Industrie & Production",
    description:
      "Sidérurgie, fonderie, chaudronnerie, usinage et construction mécanique.",
    keywords: [
      "métallurgie", "sidérurgie", "fonderie", "chaudronnerie", "usinage", "mécanique",
      "métallique", "acier", "fer", "aluminium", "soudure", "outillage", "moule",
      "المعادن", "الحديد", "الصلب", "السباكة", "الميكانيك", "الألمنيوم", "اللحام", "الورشات",
    ],
  },
  {
    code: "IND_MATERIAUX",
    label: "Matériaux de construction",
    group: "Industrie & Production",
    description:
      "Ciment, brique, céramique, carrelage, plâtre, verre et béton prêt à l'emploi.",
    keywords: [
      "ciment", "cimenterie", "brique", "briqueterie", "céramique", "carrelage",
      "plâtre", "verre", "béton", "granulat", "marbre", "sanitaire", "matériaux",
      "الإسمنت", "الآجر", "الطوب", "السيراميك", "البلاط", "الجبلس", "الزجاج", "الخرسانة", "الرخام", "مواد البناء",
    ],
  },
  {
    code: "IND_BOIS_PAPIER",
    label: "Bois, papier & carton",
    group: "Industrie & Production",
    description:
      "Scierie, menuiserie industrielle, ameublement, papeterie et emballage carton.",
    keywords: [
      "bois", "menuiserie", "ameublement", "meuble", "meubles", "papier", "papeterie",
      "carton", "emballage", "imprimerie", "scierie", "panneau",
      "الخشب", "النجارة", "الأثاث", "الورق", "الكرتون", "التغليف", "الطباعة", "النشر",
    ],
  },
  {
    code: "IND_ELECTRONIQUE",
    label: "Électronique & électroménager",
    group: "Industrie & Production",
    description:
      "Fabrication et assemblage de composants électroniques et d'appareils électroménagers.",
    keywords: [
      "électronique", "électroménager", "électrique", "composant", "assemblage",
      "câblage", "batterie", "informatique", "appareil",
      "الإلكترونيك", "الإلكترونية", "الكهرومنزلية", "الكهربائية", "المكونات", "البطاريات", "التجميع",
    ],
  },

  // --------------------------------------------------------------- Énergie & Mines
  {
    code: "ENE_HYDROCARBURES",
    label: "Hydrocarbures & services pétroliers",
    group: "Énergie & Mines",
    description:
      "Exploration, production, raffinage, distribution de carburants et services pétroliers.",
    keywords: [
      "hydrocarbures", "pétrole", "pétrolier", "pétrolière", "gaz", "gazier", "raffinage",
      "carburant", "carburants", "sonatrach", "forage", "pipeline", "gnl",
      "المحروقات", "البترول", "النفط", "الغاز", "التكرير", "الوقود", "سوناطراك", "الحفر", "أنابيب",
    ],
  },
  {
    code: "ENE_ELECTRICITE",
    label: "Électricité & gaz de ville",
    group: "Énergie & Mines",
    description:
      "Production, transport et distribution d'électricité et de gaz.",
    keywords: [
      "électricité", "électrique", "gaz", "distribution", "transport d'énergie",
      "réseau", "tension", "centrale",
      "الكهرباء", "الغاز", "توزيع", "نقل الطاقة", "الشبكة", "التوتر", "المحطة",
    ],
  },
  {
    code: "ENE_RENOUVELABLE",
    label: "Énergies renouvelables",
    group: "Énergie & Mines",
    description:
      "Solaire, éolien, biomasse et efficacité énergétique.",
    keywords: [
      "renouvelable", "renouvelables", "solaire", "photovoltaïque", "éolien", "éolienne",
      "biomasse", "efficacité énergétique", "transition énergétique", "hydrogène",
      "الطاقات المتجددة", "الشمسية", "الطاقة الشمسية", "الرياح", "الكتلة الحيوية", "الهيدروجين",
    ],
  },
  {
    code: "MIN_EXTRACTION",
    label: "Mines & carrières",
    group: "Énergie & Mines",
    description:
      "Extraction minière, carrières de granulats et exploitation de gisements.",
    keywords: [
      "mines", "mine", "carrière", "carrières", "extraction", "minier", "minière",
      "granulats", "sable", "argile", "phosphate", "zinc", "or",
      "المناجم", "المحاجر", "التعدين", "استخراج", "الرمال", "الطين", "الفوسفات", "الزنك", "الذهب",
    ],
  },

  // --------------------------------------------------------------------- BTPH
  {
    code: "BTP_CONSTRUCTION",
    label: "Construction & génie civil",
    group: "Bâtiment & Travaux Publics",
    description:
      "Bâtiments, ouvrages d'art, génie civil et gros œuvre.",
    keywords: [
      "construction", "bâtiment", "bâtiments", "génie civil", "gros œuvre", "chantier",
      "ouvrage", "maçonnerie", "entreprise de bâtiment", "béton armé", "fondation",
      "البناء", "المباني", "الهندسة المدنية", "الأشغال", "الورشة", "البناء بالخرسانة", "الأساسات",
    ],
  },
  {
    code: "BTP_TRAVAUX_PUBLICS",
    label: "Travaux publics & voiries",
    group: "Bâtiment & Travaux Publics",
    description:
      "Routes, autoroutes, assainissement, réseaux divers et terrassement.",
    keywords: [
      "travaux publics", "voirie", "route", "routes", "autoroute", "assainissement",
      "terrassement", "réseau", "piste", "enrobé", "canalisation", "adduction d'eau",
      "الأشغال العمومية", "الطرق", "الطريق السيار", "الصرف", "الحفر", "القنوات", "تمويل المياه",
    ],
  },
  {
    code: "BTP_PROMOTION",
    label: "Promotion immobilière",
    group: "Bâtiment & Travaux Publics",
    description:
      "Lotissement, promotion immobilière, vente et location de biens bâtis.",
    keywords: [
      "promotion immobilière", "immobilier", "immobilière", "lotissement", "logement",
      "logements", "appartement", "villa", "lpa", "lpp", "lsp", "promoteur",
      "الترقية العقارية", "العقارات", "السكن", "الشقق", "الفيلات", "الترقوي", "التجزئة",
    ],
  },
  {
    code: "BTP_INSTALLATIONS",
    label: "Installations techniques du bâtiment",
    group: "Bâtiment & Travaux Publics",
    description:
      "Plomberie, électricité du bâtiment, climatisation, chauffage et ascenseurs.",
    keywords: [
      "plomberie", "installation", "installations", "climatisation", "chauffage",
      "ascenseur", "électricité bâtiment", "sanitaire", "vMC", "froid", "étanchéité",
      "السباكة", "التركيب", "التكييف", "التدفئة", "المصاعد", "الكهرباء", "العزل", "التبريد",
    ],
  },

  // ------------------------------------------------------------------ Commerce
  {
    code: "COM_DETAIL",
    label: "Commerce de détail",
    group: "Commerce",
    description:
      "Magasin, supérette, boutique et vente au détail aux particuliers.",
    keywords: [
      "commerce de détail", "détail", "détaillant", "magasin", "boutique", "supérette",
      "épicerie", "alimentation générale", "libre service", "vente au détail",
      "البيع بالتجزئة", "التجزئة", "المتجر", "المحل", "البقالة", "سوبر ماركت",
    ],
  },
  {
    code: "COM_GROS",
    label: "Commerce de gros",
    group: "Commerce",
    description:
      "Grossiste, demi-gros et approvisionnement des revendeurs.",
    keywords: [
      "commerce de gros", "gros", "grossiste", "demi-gros", "approvisionnement",
      "répartition", "central d'achat",
      "البيع بالجملة", "الجملة", "تاجر الجملة", "التموين", "التوزيع",
    ],
  },
  {
    code: "COM_AUTO",
    label: "Automobile : vente & réparation",
    group: "Commerce",
    description:
      "Concession, vente de véhicules, garage, carrosserie et mécanique auto.",
    keywords: [
      "automobile", "automobile", "véhicule", "véhicules", "garage", "carrosserie",
      "réparation auto", "concession", "voiture", "poids lourd", "moto",
      "السيارات", "المركبات", "الورشة", "تصليح السيارات", "الوكالة", "السيارة", "الشاحنات", "الدراجات",
    ],
  },
  {
    code: "COM_PIECES_QUINCAILLERIE",
    label: "Pièces de rechange & quincaillerie",
    group: "Commerce",
    description:
      "Pièces détachées, outillage, quincaillerie et fournitures industrielles.",
    keywords: [
      "pièces de rechange", "pièces détachées", "quincaillerie", "outillage", "visserie",
      "fournitures industrielles", "rechange",
      "قطع الغيار", "قطع التبديل", "العُدَد", "الأدوات", "الحدادة", "اللوازم الصناعية",
    ],
  },
  {
    code: "COM_IMPORT_EXPORT",
    label: "Import & export",
    group: "Commerce",
    description:
      "Importation, exportation et négoce international de marchandises.",
    keywords: [
      "import", "importation", "export", "exportation", "négoce international",
      "commerce extérieur", "transitaire", "douane",
      "الاستيراد", "التصدير", "التجارة الخارجية", "الجمارك", "العبور",
    ],
  },

  // ------------------------------------------------------- Transport & Logistique
  {
    code: "TRA_MARCHANDISES",
    label: "Transport routier de marchandises",
    group: "Transport & Logistique",
    description:
      "Camionnage, transport de fret routier et livraison.",
    keywords: [
      "transport", "transport routier", "marchandises", "fret", "camion", "camionnage",
      "livraison", "logistique", "poids lourd",
      "النقل", "النقل البري", "البضائع", "الشحن", "الشاحنات", "التوصيل", "اللوجستيك",
    ],
  },
  {
    code: "TRA_VOYAGEURS",
    label: "Transport de voyageurs",
    group: "Transport & Logistique",
    description:
      "Autocars, bus, minibus, taxis et transport scolaire.",
    keywords: [
      "transport de voyageurs", "voyageurs", "autocar", "autobus", "bus", "minibus",
      "taxi", "transport scolaire", "navette",
      "نقل المسافرين", "المسافرين", "الحافلات", "سيارة الأجرة", "النقل المدرسي",
    ],
  },
  {
    code: "TRA_LOGISTIQUE",
    label: "Logistique & entreposage",
    group: "Transport & Logistique",
    description:
      "Entreposage, distribution, manutention portuaire et chaîne du froid.",
    keywords: [
      "logistique", "entreposage", "entrepôt", "manutention", "distribution",
      "chaîne du froid", "transitaire", "plateforme logistique",
      "اللوجستيك", "التخزين", "المستودعات", "المناولة", "التوزيع", "سلسلة التبريد",
    ],
  },
  {
    code: "TRA_MARITIME_AERIEN",
    label: "Transport maritime & aérien",
    group: "Transport & Logistique",
    description:
      "Armement maritime, consignation, fret aérien et services portuaires.",
    keywords: [
      "maritime", "armement", "consignataire", "portuaire", "port", "fret aérien",
      "aérien", "aéroport", "navigation",
      "البحري", "الميناء", "الموانئ", "الجوي", "المطار", "الملاحة", "الشحن البحري", "الشحن الجوي",
    ],
  },

  // -------------------------------------------------- Services aux entreprises
  {
    code: "SER_INFORMATIQUE",
    label: "Informatique & numérique",
    group: "Services aux entreprises",
    description:
      "Développement logiciel, intégration, maintenance informatique, réseaux et hébergement.",
    keywords: [
      "informatique", "logiciel", "logiciels", "numérique", "digital", "développement",
      "programmation", "application", "réseau", "réseaux", "hébergement", "cloud",
      "données", "système d'information", "startup", "cybersécurité",
      "الإعلام الآلي", "المعلوماتية", "البرمجيات", "الرقمنة", "الشبكات", "الاستضافة", "المعطيات", "الأمن السيبراني",
    ],
  },
  {
    code: "SER_INGENIERIE",
    label: "Ingénierie, études & conseil technique",
    group: "Services aux entreprises",
    description:
      "Bureaux d'études, ingénierie, maîtrise d'œuvre, expertise et contrôle technique.",
    keywords: [
      "ingénierie", "bureau d'études", "études", "maîtrise d'œuvre", "expertise",
      "contrôle technique", "conseil", "consulting", "assistance technique",
      "الهندسة", "مكتب الدراسات", "الدراسات", "الخبرة", "الرقابة التقنية", "الاستشارة",
    ],
  },
  {
    code: "SER_COMPTABILITE",
    label: "Comptabilité, audit & fiscalité",
    group: "Services aux entreprises",
    description:
      "Expertise comptable, tenue de comptabilité, commissariat aux comptes et conseil fiscal.",
    keywords: [
      "comptabilité", "comptable", "expert-comptable", "audit", "commissaire aux comptes",
      "fiscalité", "fiscal", "gestion", "paie", "déclaration",
      "المحاسبة", "المحاسب", "الخبير المحاسب", "التدقيق", "الجبايات", "الجباية", "التسيير", "التصريح",
    ],
  },
  {
    code: "SER_JURIDIQUE",
    label: "Services juridiques",
    group: "Services aux entreprises",
    description:
      "Avocat, notaire, huissier de justice et conseil juridique.",
    keywords: [
      "juridique", "avocat", "notaire", "huissier", "justice", "droit", "cabinet",
      "contentieux", "greffe", "tribunal",
      "القانون", "القانوني", "المحامي", "المحاماة", "الموثق", "التوثيق", "العدالة", "القضاء", "المحكمة", "العدل",
    ],
  },
  {
    code: "SER_PUBLICITE_COMMUNICATION",
    label: "Publicité, marketing & communication",
    group: "Services aux entreprises",
    description:
      "Agence de publicité, communication, événementiel, imprimerie et signalétique.",
    keywords: [
      "publicité", "marketing", "communication", "événementiel", "agence", "média",
      "affichage", "signalétique", "imprimerie", "graphisme",
      "الإشهار", "التسويق", "الاتصال", "الوكالة", "الإعلام", "الإعلان", "الطباعة", "التصميم",
    ],
  },
  {
    code: "SER_SECURITE_NETTOYAGE",
    label: "Sécurité & nettoyage",
    group: "Services aux entreprises",
    description:
      "Gardiennage, sécurité privée, télésurveillance, nettoyage et entretien de locaux.",
    keywords: [
      "sécurité", "gardiennage", "surveillance", "télésurveillance", "nettoyage",
      "entretien", "propreté", "hygiène", "désinfection",
      "الأمن", "الحراسة", "المراقبة", "التنظيف", "الصيانة", "النظافة", "التطهير",
    ],
  },
  {
    code: "SER_LOCATION",
    label: "Location de matériel & de biens",
    group: "Services aux entreprises",
    description:
      "Location de matériel, d'engins, de véhicules et de biens immobiliers.",
    keywords: [
      "location", "loueur", "crédit-bail", "leasing", "location de matériel",
      "engins", "location immobilière", "bail",
      "الإيجار", "الكراء", "تأجير", "الكراء المالي", "العقارات", "الآلات",
    ],
  },

  // --------------------------------- Hébergement, Restauration & Tourisme
  {
    code: "HAB_RESTAURATION",
    label: "Restauration & cafés",
    group: "Hébergement, Restauration & Tourisme",
    description:
      "Restaurant, restauration rapide, café, salon de thé et traiteur.",
    keywords: [
      "restauration", "restaurant", "café", "cafeteria", "fast food", "traiteur",
      "salon de thé", "pizzeria", "glacier", "agence de voyage",
      "المطاعم", "المطعم", "المقاهي", "المقهى", "الوجبات السريعة", "قاعة الشاي", "الحلويات",
    ],
  },
  {
    code: "HAB_HOTELLERIE",
    label: "Hôtellerie & tourisme",
    group: "Hébergement, Restauration & Tourisme",
    description:
      "Hôtel, maison d'hôtes, campings, thermalisme et agences de tourisme.",
    keywords: [
      "hôtellerie", "hôtel", "tourisme", "touristique", "hébergement", "agence de voyage",
      "village touristique", "camping", "thermal", "loisirs",
      "الفنادق", "الفندق", "السياحة", "السياحي", "الإيواء", "وكالة الأسفار", "الترفيه",
    ],
  },

  // -------------------------------------------------------------------- Santé
  {
    code: "SAN_CLINIQUE",
    label: "Cliniques & cabinets médicaux",
    group: "Santé",
    description:
      "Clinique, polyclinique, cabinet médical, chirurgie et imagerie médicale.",
    keywords: [
      "santé", "clinique", "polyclinique", "cabinet médical", "médecin", "médecine",
      "chirurgie", "imagerie médicale", "radiologie", "maternité", "hospitalisation",
      "الصحة", "العيادة", "المصحة", "الطبيب", "الطب", "الجراحة", "التصوير الطبي", "الولادة", "الاستشفاء",
    ],
  },
  {
    code: "SAN_LABO",
    label: "Laboratoires d'analyses",
    group: "Santé",
    description: "Laboratoire d'analyses médicales et de biologie.",
    keywords: [
      "laboratoire", "analyses", "biologie", "biologie médicale", "prélèvement",
      "المخبر", "التحاليل", "البيولوجيا", "المخابر الطبية",
    ],
  },
  {
    code: "SAN_PHARMACIE",
    label: "Pharmacie & paramédical",
    group: "Santé",
    description:
      "Officine pharmaceutique, optique, prothèses, kinésithérapie et matériel médical.",
    keywords: [
      "pharmacie", "officine", "pharmacien", "optique", "lunettes", "prothèse",
      "orthopédie", "kinésithérapie", "matériel médical", "paramédical",
      "الصيدلية", "الصيدلي", "البصريات", "النظارات", "الأعضاء الاصطناعية", "العلاج الطبيعي", "الأجهزة الطبية",
    ],
  },

  // ------------------------------------------------------ Éducation & Formation
  {
    code: "EDU_ENSEIGNEMENT",
    label: "Enseignement privé",
    group: "Éducation & Formation",
    description:
      "École privée, collège, lycée, crèche et jardin d'enfants.",
    keywords: [
      "enseignement", "école", "scolaire", "collège", "lycée", "crèche", "garderie",
      "éducation", "privé", "jardin d'enfants", "université",
      "التعليم", "المدرسة", "المدارس", "الثانوية", "الروضة", "الحضانة", "التربية", "الجامعة",
    ],
  },
  {
    code: "EDU_FORMATION",
    label: "Formation professionnelle",
    group: "Éducation & Formation",
    description:
      "Centre de formation, auto-école, cours de langues et formation continue.",
    keywords: [
      "formation", "formation professionnelle", "centre de formation", "auto-école",
      "apprentissage", "langues", "perfectionnement", "stage",
      "التكوين", "التكوين المهني", "مركز التكوين", "مدرسة السياقة", "اللغات", "التدريب", "التربص",
    ],
  },

  // ------------------------------------------------------------------- Autres
  {
    code: "LIB_ARCHITECTURE",
    label: "Architecture & urbanisme",
    group: "Services aux entreprises",
    description:
      "Architecte, urbanisme, décoration et aménagement d'intérieur.",
    keywords: [
      "architecte", "architecture", "urbanisme", "décoration",
      "aménagement", "permis de construire", "maquette",
      "الهندسة المعمارية", "المعماري", "التعمير", "الديكور", "التهيئة", "رخصة البناء",
    ],
  },
  {
    code: "AUTRE",
    label: "Autre activité",
    group: "Autres",
    description:
      "Activité non listée ci-dessus, ou activité mixte relevant de plusieurs secteurs.",
    keywords: [],
  },
];

/** Fast lookup by code. */
const BY_CODE: ReadonlyMap<string, Sector> = new Map(
  SECTORS.map((s) => [s.code, s]),
);

export function findSector(code: string | null | undefined): Sector | undefined {
  return code ? BY_CODE.get(code) : undefined;
}

/** The codes, for constraining the extraction model's output vocabulary. */
export function sectorCodes(): string[] {
  return SECTORS.map((s) => s.code);
}

/**
 * Keywords for a code, normalised and de-duplicated, ready to match against
 * normalised decree text.
 */
export function sectorMatchTerms(code: string | null | undefined): string[] {
  const sector = findSector(code);
  if (!sector) return [];
  return [...new Set(sector.keywords.map(normalizeText).filter(Boolean))];
}

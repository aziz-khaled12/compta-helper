/**
 * Arabic display copy for the sector catalogue.
 *
 * `label`/`description`/`SECTOR_GROUPS` in `catalogue.ts` are the French picker
 * copy. `keywords` there are bilingual because the crawler matches decrees in
 * both languages. The labels and descriptions are *display* text, so their
 * Arabic forms live here, keyed by the stable `code` / group value.
 *
 * Both maps must mirror `catalogue.ts` 1:1 — a missing code falls back to the
 * French label rather than rendering an empty field, so it degrades gracefully,
 * but the two should never drift.
 */

import { findSector, type Sector, type SectorGroup } from "./catalogue";

/** Arabic headings for the picker's group sections, keyed by the French group. */
export const SECTOR_GROUP_AR: Readonly<Record<SectorGroup, string>> = {
  "Agriculture & Pêche": "الفلاحة والصيد البحري",
  "Industrie & Production": "الصناعة والإنتاج",
  "Énergie & Mines": "الطاقة والمناجم",
  "Bâtiment & Travaux Publics": "البناء والأشغال العمومية",
  Commerce: "التجارة",
  "Transport & Logistique": "النقل واللوجستيك",
  "Services aux entreprises": "الخدمات الموجهة للمؤسسات",
  "Hébergement, Restauration & Tourisme": "الإيواء والمطاعم والسياحة",
  Santé: "الصحة",
  "Éducation & Formation": "التعليم والتكوين",
  Autres: "أخرى",
};

/**
 * Arabic label per sector code. Factory copy in French lives on the `Sector`
 * entries themselves; these are the Arabic equivalents shown in the picker.
 */
export const SECTOR_LABEL_AR: Readonly<Record<string, string>> = {
  AGRI_CULTURES: "الزراعات والحبوب",
  AGRI_ELEVAGE: "تربية الحيوانات والإنتاج الحيواني",
  AGRI_PECHE: "الصيد البحري وتربية المائيات",
  IND_AGROALIMENTAIRE: "الصناعات الغذائية والمشروبات",
  IND_TEXTILE: "النسيج والجلود والملابس",
  IND_CHIMIE_PHARMA: "الكيمياء والبلاستيك والصيدلة",
  IND_METALLURGIE: "المعادن والميكانيك",
  IND_MATERIAUX: "مواد البناء",
  IND_BOIS_PAPIER: "الخشب والورق والكرتون",
  IND_ELECTRONIQUE: "الإلكترونيات والأجهزة الكهرومنزلية",
  ENE_HYDROCARBURES: "المحروقات والخدمات البترولية",
  ENE_ELECTRICITE: "الكهرباء والغاز",
  ENE_RENOUVELABLE: "الطاقات المتجددة",
  MIN_EXTRACTION: "المناجم والمحاجر",
  BTP_CONSTRUCTION: "البناء والهندسة المدنية",
  BTP_TRAVAUX_PUBLICS: "الأشغال العمومية والطرقات",
  BTP_PROMOTION: "الترقية العقارية",
  BTP_INSTALLATIONS: "التركيبات التقنية للبناء",
  COM_DETAIL: "التجارة التفصيلية (التجزئة)",
  COM_GROS: "التجارة بالجملة",
  COM_AUTO: "السيارات: البيع والتصليح",
  COM_PIECES_QUINCAILLERIE: "قطع الغيار ومواد الحديد",
  COM_IMPORT_EXPORT: "الاستيراد والتصدير",
  TRA_MARCHANDISES: "النقل البري للبضائع",
  TRA_VOYAGEURS: "نقل المسافرين",
  TRA_LOGISTIQUE: "اللوجستيك والتخزين",
  TRA_MARITIME_AERIEN: "النقل البحري والجوي",
  SER_INFORMATIQUE: "الإعلام الآلي والرقمنة",
  SER_INGENIERIE: "الهندسة والدراسات والاستشارة التقنية",
  SER_COMPTABILITE: "المحاسبة والتدقيق والجباية",
  SER_JURIDIQUE: "الخدمات القانونية",
  SER_PUBLICITE_COMMUNICATION: "الإشهار والتسويق والاتصال",
  SER_SECURITE_NETTOYAGE: "الأمن والتنظيف",
  SER_LOCATION: "كراء المعدات والعتاد",
  HAB_RESTAURATION: "المطاعم والمقاهي",
  HAB_HOTELLERIE: "الفندقة والسياحة",
  SAN_CLINIQUE: "العيادات والمصحات الخاصّة",
  SAN_LABO: "مخابر التحاليل",
  SAN_PHARMACIE: "الصيدليات والطب شبه الطبي",
  EDU_ENSEIGNEMENT: "التعليم الخاص",
  EDU_FORMATION: "التكوين المهني",
  LIB_ARCHITECTURE: "الهندسة المعمارية والتعمير",
  AUTRE: "نشاط آخر",
};

/** Arabic one-line description per sector code. */
export const SECTOR_DESCRIPTION_AR: Readonly<Record<string, string>> = {
  AGRI_CULTURES: "الحبوب، الخضروات، الأشجار المثمرة، الزيتون والزراعات الكبرى.",
  AGRI_ELEVAGE: "تربية الأبقار، الأغنام، الدواجن، النحل وإنتاج الحليب.",
  AGRI_PECHE: "الصيد البحري، الصيد في المياه العذبة وتربية المائيات.",
  IND_AGROALIMENTAIRE: "تحويل المنتجات الفلاحية، التعليب، المشروبات والتبغ.",
  IND_TEXTILE: "الغزل، النسيج، الخياطة، صناعة الجلد والمنتجات الجلدية.",
  IND_CHIMIE_PHARMA: "الصناعة الكيميائية، البتروكيمياء، المواد البلاستيكية، المنظفات وإنتاج الأدوية.",
  IND_METALLURGIE: "صناعة الصلب، المسابك، المراجل، التشغيل والبناء الميكانيكي.",
  IND_MATERIAUX: "الإسمنت، الآجر، السيراميك، البلاط، الجبس، الزجاج والخرسانة الجاهزة.",
  IND_BOIS_PAPIER: "مناشر الخشب، النجارة الصناعية، صناعة الأثاث، الورق والتغليف بالكرتون.",
  IND_ELECTRONIQUE: "تصنيع وتجميع المكونات الإلكترونية والأجهزة الكهرومنزلية.",
  ENE_HYDROCARBURES: "التنقيب، الإنتاج، التكرير، توزيع الوقود والخدمات البترولية.",
  ENE_ELECTRICITE: "إنتاج ونقل وتوزيع الكهرباء والغاز.",
  ENE_RENOUVELABLE: "الطاقة الشمسية، طاقة الرياح، الكتلة الحيوية والنجاعة الطاقوية.",
  MIN_EXTRACTION: "الاستخراج المعدني، محاجر الحصى واستغلال الموارد الطبيعية.",
  BTP_CONSTRUCTION: "المباني، المنشآت الفنية، الهندسة المدنية والأشغال الكبرى.",
  BTP_TRAVAUX_PUBLICS: "الطرق، الطرق السيار، التطهير، الشبكات المتنوعة وأشغال الحفر.",
  BTP_PROMOTION: "التجزئة العقارية، الترقية العقارية، بيع وكراء المباني.",
  BTP_INSTALLATIONS: "السباكة، كهرباء البناء، التكييف، التدفئة والمصاعد.",
  COM_DETAIL: "المتاجر، البقالات، المحلات والبيع بالتجزئة للأفراد.",
  COM_GROS: "تجار الجملة، أنصاف الجملة وتموين تجار التجزئة.",
  COM_AUTO: "الوكالات، بيع المركبات، الورشات، هياكل السيارات وميكانيك السيارات.",
  COM_PIECES_QUINCAILLERIE: "قطع الغيار، العُدد، مواد الحديد (الكوينكايري) واللوازم الصناعية.",
  COM_IMPORT_EXPORT: "استيراد وتصدير والوساطة التجارية الدولية للبضائع.",
  TRA_MARCHANDISES: "النقل بالشاحنات، نقل البضائع والتوصيل.",
  TRA_VOYAGEURS: "الحافلات، حافلات النقل، الميني باصات، سيارات الأجرة والنقل المدرسي.",
  TRA_LOGISTIQUE: "التخزين، التوزيع، المناولة المينائية وسلسلة التبريد.",
  TRA_MARITIME_AERIEN: "الشحن البحري، الوكلاء البحريون، الشحن الجوي والخدمات المينائية.",
  SER_INFORMATIQUE: "تطوير البرمجيات، الإدماج، الصيانة المعلوماتية، الشبكات والاستضافة.",
  SER_INGENIERIE: "مكاتب الدراسات، الهندسة، متابعة الأشغال، الخبرة والرقابة التقنية.",
  SER_COMPTABILITE: "الخبرة المحاسبية، مسك الدفاتر، مراقبة الحسابات والاستشارة الجبائية.",
  SER_JURIDIQUE: "المحاماة، التوثيق، التنفيذ العدلي والاستشارة القانونية.",
  SER_PUBLICITE_COMMUNICATION: "وكالات الإشهار، الاتصال، تنظيم المناسبات، الطباعة واللافتات.",
  SER_SECURITE_NETTOYAGE: "الحراسة، الأمن الخاص، المراقبة عن بعد، تنظيف وصيانة المحلات.",
  SER_LOCATION: "كراء المعدات، الآلات، المركبات والعقارات.",
  HAB_RESTAURATION: "المطاعم، الوجبات السريعة، المقاهي، قاعات الشاي والتموين.",
  HAB_HOTELLERIE: "الفنادق، بيوت الضيافة، التخييم، الاستشفاء والوكالات السياحية.",
  SAN_CLINIQUE: "العيادات، المصحات، عيادات الأطباء، الجراحة والتصوير الطبي.",
  SAN_LABO: "مخابر التحاليل الطبية والبيولوجية.",
  SAN_PHARMACIE: "الصيدليات، البصريات، الأطراف الاصطناعية، العلاج الطبيعي والتجهيزات الطبية.",
  EDU_ENSEIGNEMENT: "المدارس الخاصة، المتوسطات، الثانويات، الحضانات ورياض الأطفال.",
  EDU_FORMATION: "مراكز التكوين، مدارس السياقة، دروس اللغات والتكوين المستمر.",
  LIB_ARCHITECTURE: "المعماري، التعمير، الديكور والتهيئة الداخلية.",
  AUTRE: "نشاط غير مذكور أعلاه، أو نشاط مختلط يندرج ضمن عدة قطاعات.",
};

/** Matches whatever Arabic locale variant the browser reports (ar, ar-DZ, …). */
function isArabicLang(lang?: string): boolean {
  return lang?.toLowerCase().startsWith("ar") === true;
}

/** Picker label for a sector, in the requested language (French default). */
export function sectorLabel(sector: Sector, lang?: string): string {
  return isArabicLang(lang) ? (SECTOR_LABEL_AR[sector.code] ?? sector.label) : sector.label;
}

/** One-line description under a sector row / under the field, per language. */
export function sectorDescription(sector: Sector, lang?: string): string {
  return isArabicLang(lang)
    ? (SECTOR_DESCRIPTION_AR[sector.code] ?? sector.description)
    : sector.description;
}

/** Section heading in the picker, per language. */
export function sectorGroupLabel(group: SectorGroup, lang?: string): string {
  return isArabicLang(lang) ? (SECTOR_GROUP_AR[group] ?? group) : group;
}

/**
 * Display label for a stored code, in the requested language.
 *
 * Falls back to the raw code (see `catalogue.ts`) rather than an empty field
 * when neither the code nor its Arabic copy resolve — the stored value is kept
 * visible even if it no longer maps to the catalogue.
 */
export function sectorLabelFor(code: string | null | undefined, lang?: string): string {
  const sector = findSector(code);
  if (!sector) return code || "";
  return sectorLabel(sector, lang);
}
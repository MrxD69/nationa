import type { Address } from "../../schema/types";

// Demo user id used when neither `DEMO_USER_ID` nor an argv override is set.
export const DEMO_USER_ID = "923b6355-02dc-44f8-a6b2-380c35f3305e";

// Company permission scopes granted to the demo user. These mirror
// `COMPANY_ROLE_PERMISSIONS` in `@nationa/api` (which cannot be imported here).
export const OWNER_SCOPES = [
  "company.read",
  "company.update",
  "company.manage_access",
  "company.delete",
  "documents.read",
  "documents.write",
  "documents.delete",
  "documents.extract",
  "documents.generate",
  "cases.read",
  "cases.write",
  "cases.submit",
  "cases.cancel",
  "checks.read",
  "checks.run",
  "checks.resolve",
  "submissions.read",
  "submissions.create",
  "submissions.resubmit",
  "invoices.read",
  "invoices.write",
  "invoices.verify",
  "filings.read",
  "filings.write",
  "filings.submit",
  "ai.use",
  "billing.read",
  "billing.pay",
  "notifications.manage",
  "activity.read",
];

export const ACCOUNTANT_SCOPES = [
  "company.read",
  "company.update",
  "company.manage_access",
  "documents.read",
  "documents.write",
  "documents.delete",
  "documents.extract",
  "documents.generate",
  "cases.read",
  "cases.write",
  "cases.submit",
  "cases.cancel",
  "checks.read",
  "checks.run",
  "checks.resolve",
  "submissions.read",
  "submissions.create",
  "submissions.resubmit",
  "invoices.read",
  "invoices.write",
  "invoices.verify",
  "filings.read",
  "filings.write",
  "filings.submit",
  "ai.use",
  "billing.read",
  "activity.read",
];

export type DemoPersonData = {
  key: string;
  firstName: string;
  lastName: string;
  fullName: string;
  fullNameAr: string;
  nationalId: string;
  nationality: string;
  birthDate: string;
  gender: "male" | "female";
  phone: string;
};

export const PERSONS: DemoPersonData[] = [
  {
    key: "person_amel",
    firstName: "Amel",
    lastName: "Ben Salah",
    fullName: "Amel Ben Salah",
    fullNameAr: "أمل بن صالح",
    nationalId: "09123456",
    nationality: "Tunisienne",
    birthDate: "1990-04-12",
    gender: "female",
    phone: "+216 20 123 456",
  },
  {
    key: "person_ahmed",
    firstName: "Ahmed",
    lastName: "El Makchar",
    fullName: "Ahmed El Makchar",
    fullNameAr: "أحمد المكشر",
    nationalId: "08765432",
    nationality: "Tunisienne",
    birthDate: "1982-09-03",
    gender: "male",
    phone: "+216 22 987 654",
  },
  {
    key: "person_sonia",
    firstName: "Sonia",
    lastName: "Trabelsi",
    fullName: "Sonia Trabelsi",
    fullNameAr: "سنية الطرابلسي",
    nationalId: "07998811",
    nationality: "Tunisienne",
    birthDate: "1987-01-27",
    gender: "female",
    phone: "+216 55 445 566",
  },
];

export type DemoCompanyData = {
  key: string;
  uniqueIdentifier: string;
  internalManagementNumber: string;
  legalName: string;
  legalNameAr: string;
  tradeName: string;
  brandName: string | null;
  legalForm: string;
  capitalAmount: string;
  currency: string;
  durationYears: number;
  publicationDate: string;
  headquartersAddress: Address;
  activityAddress: Address;
  mainActivityLabel: string;
  mainActivityLabelAr: string;
  mainActivityCode: string;
  activityStartDate: string;
  workforce: number;
  taxId: string;
};

const MEGRINE_ADDRESS: Address = {
  fr: {
    street: "Rue de l'Innovation",
    building: "Immeuble Nova",
    office: "Bureau 4B",
    locality: "Zone Industrielle Megrine",
    postalCode: "2033",
    city: "Megrine",
    governorate: "Ben Arous",
    country: "Tunisie",
  },
  ar: {
    street: "شارع الابتكار",
    building: "عمارة نوفا",
    office: "مكتب 4ب",
    locality: "المنطقة الصناعية مقرين",
    postalCode: "2033",
    city: "مقرين",
    governorate: "بن عروس",
    country: "تونس",
  },
  raw: "Immeuble Nova, Bureau 4B, Rue de l'Innovation, Zone Industrielle Megrine 2033, Ben Arous, Tunisie",
};

const ARIANA_ADDRESS: Address = {
  fr: {
    street: "Avenue Habib Bourguiba",
    building: "Centre Azur",
    office: "Bureau 12",
    locality: "Ariana Ville",
    postalCode: "2080",
    city: "Ariana",
    governorate: "Ariana",
    country: "Tunisie",
  },
  ar: {
    street: "شارع الحبيب بورقيبة",
    building: "مركز أزور",
    office: "مكتب 12",
    locality: "أريانة المدينة",
    postalCode: "2080",
    city: "أريانة",
    governorate: "أريانة",
    country: "تونس",
  },
  raw: "Centre Azur, Bureau 12, Avenue Habib Bourguiba, Ariana Ville 2080, Ariana, Tunisie",
};

export const COMPANY_IMPERIAL: DemoCompanyData = {
  key: "company_imperial",
  uniqueIdentifier: "1923492A",
  internalManagementNumber: "C02188712025",
  legalName: "IMPERIAL INTELLIGENCE TECHNOLOGIES",
  legalNameAr: "إمبريال إنتليجنس تكنولوجيز",
  tradeName: "IMPERIAL.AI",
  brandName: null,
  legalForm: "SARL",
  capitalAmount: "1000.000",
  currency: "TND",
  durationYears: 99,
  publicationDate: "2025-05-30",
  headquartersAddress: MEGRINE_ADDRESS,
  activityAddress: MEGRINE_ADDRESS,
  mainActivityLabel: "ACTIVITES INFORMATIQUES",
  mainActivityLabelAr: "الأنشطة الإعلامية",
  mainActivityCode: "72",
  activityStartDate: "2025-05-15",
  workforce: 4,
  taxId: "1923492A",
};

export const COMPANY_CARTHAGE: DemoCompanyData = {
  key: "company_carthage",
  uniqueIdentifier: "1847391B",
  internalManagementNumber: "C02173912024",
  legalName: "CARTHAGE E-COMMERCE SARL",
  legalNameAr: "قرطاج للتجارة الإلكترونية",
  tradeName: "CARTHAGE SHOP",
  brandName: null,
  legalForm: "SARL",
  capitalAmount: "5000.000",
  currency: "TND",
  durationYears: 99,
  publicationDate: "2024-03-12",
  headquartersAddress: ARIANA_ADDRESS,
  activityAddress: ARIANA_ADDRESS,
  mainActivityLabel: "COMMERCE ELECTRONIQUE",
  mainActivityLabelAr: "التجارة الإلكترونية",
  mainActivityCode: "4791",
  activityStartDate: "2024-03-01",
  workforce: 2,
  taxId: "1847391B",
};

export type DemoInvoiceLineData = {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  taxAmount: string;
  lineTotal: string;
};

export type DemoInvoiceData = {
  key: string;
  companyKey: "company_imperial" | "company_carthage";
  direction: "purchase" | "sale";
  supplierName: string;
  supplierTaxId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  lines: DemoInvoiceLineData[];
};

const VAT_19 = "19.00";

export const DEMO_INVOICES: DemoInvoiceData[] = [
  {
    key: "steg_2026_04",
    companyKey: "company_imperial",
    direction: "purchase",
    supplierName: "Société Tunisienne de l'Électricité et du Gaz (STEG)",
    supplierTaxId: "0012345A",
    invoiceNumber: "STEG-2026-04512",
    issueDate: "2026-04-05",
    dueDate: "2026-04-20",
    subtotal: "420.000",
    taxAmount: "79.800",
    total: "499.800",
    lines: [
      {
        description: "Électricité — consommation avril 2026",
        quantity: "1.000",
        unitPrice: "420.000",
        taxRate: VAT_19,
        taxAmount: "79.800",
        lineTotal: "420.000",
      },
    ],
  },
  {
    key: "tunisie_telecom_2026_04",
    companyKey: "company_imperial",
    direction: "purchase",
    supplierName: "Tunisie Télécom",
    supplierTaxId: "0023456B",
    invoiceNumber: "TT-2026-11984",
    issueDate: "2026-04-10",
    dueDate: "2026-04-25",
    subtotal: "180.000",
    taxAmount: "34.200",
    total: "214.200",
    lines: [
      {
        description: "Abonnement fibre optique professionnel — avril 2026",
        quantity: "1.000",
        unitPrice: "180.000",
        taxRate: VAT_19,
        taxAmount: "34.200",
        lineTotal: "180.000",
      },
    ],
  },
  {
    key: "vermeg_2026_05",
    companyKey: "company_imperial",
    direction: "purchase",
    supplierName: "Vermeg SA",
    supplierTaxId: "0034567C",
    invoiceNumber: "VERMEG-2026-00871",
    issueDate: "2026-05-02",
    dueDate: "2026-06-01",
    subtotal: "2500.000",
    taxAmount: "475.000",
    total: "2975.000",
    lines: [
      {
        description: "Licence annuelle plateforme de données",
        quantity: "1.000",
        unitPrice: "2500.000",
        taxRate: VAT_19,
        taxAmount: "475.000",
        lineTotal: "2500.000",
      },
    ],
  },
  {
    key: "bna_2026_05",
    companyKey: "company_imperial",
    direction: "purchase",
    supplierName: "Banque Nationale Agricole (BNA)",
    supplierTaxId: "0045678D",
    invoiceNumber: "BNA-2026-33904",
    issueDate: "2026-05-15",
    dueDate: "2026-05-15",
    subtotal: "60.000",
    taxAmount: "11.400",
    total: "71.400",
    lines: [
      {
        description: "Frais de tenue de compte et commissions",
        quantity: "1.000",
        unitPrice: "60.000",
        taxRate: VAT_19,
        taxAmount: "11.400",
        lineTotal: "60.000",
      },
    ],
  },
  {
    key: "imperial_sale_2026_05",
    companyKey: "company_imperial",
    direction: "sale",
    supplierName: "IMPERIAL INTELLIGENCE TECHNOLOGIES",
    supplierTaxId: "1923492A",
    invoiceNumber: "IMP-2026-0042",
    issueDate: "2026-05-20",
    dueDate: "2026-06-20",
    subtotal: "8000.000",
    taxAmount: "1520.000",
    total: "9520.000",
    lines: [
      {
        description: "Prestation de conseil en intelligence artificielle",
        quantity: "1.000",
        unitPrice: "8000.000",
        taxRate: VAT_19,
        taxAmount: "1520.000",
        lineTotal: "8000.000",
      },
    ],
  },
  {
    key: "carthage_purchase_2026_05",
    companyKey: "company_carthage",
    direction: "purchase",
    supplierName: "Sotexma Distribution SARL",
    supplierTaxId: "0076543E",
    invoiceNumber: "SOTEX-2026-00418",
    issueDate: "2026-05-06",
    dueDate: "2026-06-05",
    subtotal: "1000.000",
    taxAmount: "190.000",
    total: "1190.000",
    lines: [
      {
        description: "Achat de marchandises — mai 2026",
        quantity: "1.000",
        unitPrice: "1000.000",
        taxRate: VAT_19,
        taxAmount: "190.000",
        lineTotal: "1000.000",
      },
    ],
  },
  {
    key: "carthage_sale_2026_05",
    companyKey: "company_carthage",
    direction: "sale",
    supplierName: "CARTHAGE E-COMMERCE SARL",
    supplierTaxId: "1847391B",
    invoiceNumber: "CAR-2026-0042",
    issueDate: "2026-05-22",
    dueDate: "2026-06-21",
    subtotal: "3000.000",
    taxAmount: "570.000",
    total: "3570.000",
    lines: [
      {
        description: "Ventes en ligne — mai 2026",
        quantity: "1.000",
        unitPrice: "3000.000",
        taxRate: VAT_19,
        taxAmount: "570.000",
        lineTotal: "3000.000",
      },
    ],
  },
];

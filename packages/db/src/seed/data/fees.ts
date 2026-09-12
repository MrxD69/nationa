import type { JsonObject } from "../types";

export type SeedFee = {
  key: string;
  agencyId: string;
  procedureTemplateKey: string | null;
  obligationKey: string | null;
  label: string;
  amount: string;
  currency: string;
  logic: JsonObject;
};

export const FEES: SeedFee[] = [
  {
    key: "fee_rne_immatriculation",
    agencyId: "RNE",
    procedureTemplateKey: "procedure_creation_societe",
    obligationKey: "obligation_rne_immatriculation_societe",
    label: "Frais d'immatriculation d'une société au RNE",
    amount: "150.000",
    currency: "TND",
    logic: {
      type: "percentage_of_capital",
      rate: 0.001,
      min: 150,
      max: 1500,
      base: "capital_social",
      refundable: false,
    },
  },
  {
    key: "fee_rne_changement_gerant",
    agencyId: "RNE",
    procedureTemplateKey: "procedure_changement_gerant",
    obligationKey: "obligation_rne_changement_dirigeant",
    label: "Frais de déclaration de changement de gérant",
    amount: "20.000",
    currency: "TND",
    logic: { type: "fixed", refundable: false },
  },
  {
    key: "fee_rne_modification_statutaire",
    agencyId: "RNE",
    procedureTemplateKey: null,
    obligationKey: null,
    label: "Frais de modification statutaire (statuts, capital, dénomination)",
    amount: "100.000",
    currency: "TND",
    logic: { type: "fixed", refundable: false },
  },
  {
    key: "fee_rne_dissolution_liquidation",
    agencyId: "RNE",
    procedureTemplateKey: null,
    obligationKey: "obligation_rne_dissolution_liquidation",
    label: "Frais d'inscription de la dissolution / liquidation",
    amount: "200.000",
    currency: "TND",
    logic: { type: "fixed", refundable: false },
  },
  {
    key: "fee_rne_etablissement_secondaire",
    agencyId: "RNE",
    procedureTemplateKey: null,
    obligationKey: "obligation_rne_etablissement_secondaire",
    label: "Frais de déclaration d'un établissement secondaire",
    amount: "100.000",
    currency: "TND",
    logic: { type: "fixed", refundable: false },
  },
  {
    key: "fee_rne_publication_jort",
    agencyId: "RNE",
    procedureTemplateKey: null,
    obligationKey: null,
    label: "Frais de publication au Journal Officiel (JORT)",
    amount: "50.000",
    currency: "TND",
    logic: { type: "fixed", refundable: false },
  },
];

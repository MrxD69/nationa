export type AddressParts = {
  street?: string;
  building?: string;
  office?: string;
  locality?: string;
  postalCode?: string;
  city?: string;
  governorate?: string;
  country?: string;
};

export type Address = {
  fr?: AddressParts;
  ar?: AddressParts;
  raw?: string;
};

export type JsonObject = Record<string, unknown>;

export type AiPart =
  | { type: "text"; text: string }
  | {
      type: "tool";
      toolName: string;
      toolCallId: string;
      args: JsonObject;
      result?: unknown;
    }
  | { type: "citation"; ruleCitationId: string; snippet?: string };

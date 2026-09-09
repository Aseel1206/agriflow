import type { Dictionary } from "@/lib/i18n";

export type Vars = Partial<{
  pickupTime: string;
  pickupLocation: string;
  crop: string;
  quantity: string;
  price: string;
}>;

type StepBase = {
  id: string;
  say: (t: Dictionary, vars: Vars) => string;
};

export type InfoStep = StepBase & { kind: "info"; next: string };

export type MenuOption = {
  digit: string;
  label: (t: Dictionary) => string;
  next: string;
  setVars?: (vars: Vars) => Vars;
};

export type MenuStep = StepBase & { kind: "menu"; options: MenuOption[] };

export type NumericStep = StepBase & {
  kind: "numeric";
  field: "quantity" | "price";
  maxDigits: number;
  next: string;
};

export type SummaryStep = StepBase & { kind: "summary" };

export type CallStep = InfoStep | MenuStep | NumericStep | SummaryStep;

import { z } from "zod";

export const disaggregatedDataSchema = z.object({
  reportId: z.number().int(),
  indicatorId: z.number().int(),
  projectId: z.number().int().optional(),
  Economy: z.number().int().optional(),
  Infrastructure: z.number().int().optional(),
  Institution: z.string().optional(),
  Operator: z.string().optional(),
  Gender: z.string().optional(),
  Age: z.string().optional(),
  City: z.string().optional(),
  Language: z.string().optional(),
  Sector: z.string().optional(),
  ASN: z.string().optional(),
  Technology: z.string().optional(),
  Disability: z.string().optional(),
  RuralUrban: z.string().optional(),
  Topic: z.string().optional(),
  StakeholderType: z.string().optional(),
  Dialogues: z.number().int().optional(),
  DialoguesText: z.string().optional(),
  PartnerType: z.string().optional(),
  NumberOfUsers: z.number().int().optional(),
  Notes: z.string().optional(),
});


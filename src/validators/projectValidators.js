import { z } from "zod";

const indicatorCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
});

const outcomeCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  indicators: z.array(indicatorCreateSchema).optional().default([]),
});

const objectiveCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  outcomes: z.array(outcomeCreateSchema).optional().default([]),
});

export const projectCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  category: z.string().optional(),
  programLead: z.string().optional().default(""),
  projectSupport: z.string().optional().default(""),
  generalCategory: z.string().optional().default(""),
  specificCategory: z.string().optional().default(""),
  expectedUsers: z.number().int().nonnegative().optional(),
  // Allow YYYY-MM-DD or full ISO strings; we parse server-side.
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  reportingInterval: z.enum(["MONTHLY", "QUARTERLY", "YEARLY", "monthly", "quarterly", "yearly"]),
  leadId: z.number().int().optional().nullable(),
  objectives: z.array(objectiveCreateSchema).optional().default([]),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const assignLeadSchema = z.object({
  leadId: z.number().int(),
});


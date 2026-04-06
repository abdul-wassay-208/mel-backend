import { z } from "zod";

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
  // Backward compatible: allow old single leadId OR new multi leadIds
  leadId: z.number().int().optional().nullable(),
  leadIds: z.array(z.number().int()).min(1).optional(),
  // IDs of global objectives to link to this project
  objectiveIds: z.array(z.number().int()).optional().default([]),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const assignLeadSchema = z.object({
  leadIds: z.array(z.number().int()).min(1),
});


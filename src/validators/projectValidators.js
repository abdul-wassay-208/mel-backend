import { z } from "zod";

export const projectCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  reportingInterval: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const assignLeadSchema = z.object({
  leadId: z.number().int(),
});


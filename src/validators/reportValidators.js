import { z } from "zod";

export const reportCreateSchema = z.object({
  title: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  projectId: z.number().int(),
});

export const reportUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  learningSummary: z.string().optional(),
});

export const reportStatusChangeSchema = z.object({
  action: z.enum(["SUBMIT", "PUBLISH", "REQUEST_EDIT", "COMPLETE", "APPROVE_EDIT"]),
  comment: z.string().optional(),
});


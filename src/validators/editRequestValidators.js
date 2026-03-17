import { z } from "zod";

export const editRequestCreateSchema = z.object({
  projectId: z.number().int(),
  reportId: z.number().int(),
  indicatorId: z.number().int(),
  projectName: z.string().min(1),
  indicatorName: z.string().min(1),
  fieldsToEdit: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1),
});

export const editRequestStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});


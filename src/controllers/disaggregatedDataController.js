import { prisma } from "../config/prisma.js";
import { disaggregatedDataSchema } from "../validators/disaggregatedDataValidators.js";
import { createAuditLog } from "../utils/audit.js";

export async function submitDisaggregatedData(req, res, next) {
  try {
    const parsed = disaggregatedDataSchema.safeParse({
      ...req.body,
      reportId: Number(req.body.reportId),
      indicatorId: Number(req.body.indicatorId),
      projectId: req.body.projectId ? Number(req.body.projectId) : undefined,
    });
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }
    const data = parsed.data;

    const report = await prisma.report.findUnique({
      where: { id: data.reportId },
      include: { project: true },
    });
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    if (req.user.role === "PROJECT_LEAD" && report.leadId !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const indicator = await prisma.indicator.findUnique({ where: { id: data.indicatorId } });
    if (!indicator) {
      return res.status(404).json({ message: "Indicator not found" });
    }

    // Basic rule: require at least one of the disaggregated fields to be set
    const {
      Economy,
      Infrastructure,
      Institution,
      Operator,
      Gender,
      Age,
      Sector,
      ASN,
      Technology,
      Disability,
      RuralUrban,
      Topic,
      StakeholderType,
      Dialogues,
      PartnerType,
    } = data;

    const hasAnyField =
      Economy != null ||
      Infrastructure != null ||
      Institution != null ||
      Operator != null ||
      !!Gender ||
      !!Age ||
      !!Sector ||
      !!ASN ||
      !!Technology ||
      !!Disability ||
      !!RuralUrban ||
      !!Topic ||
      !!StakeholderType ||
      Dialogues != null ||
      !!PartnerType;

    if (!hasAnyField) {
      return res.status(400).json({ message: "At least one disaggregation field must be provided" });
    }

    const created = await prisma.disaggregatedData.create({
      data: {
        projectId: data.projectId || report.projectId,
        reportId: data.reportId,
        indicatorId: data.indicatorId,
        Economy,
        Infrastructure,
        Institution,
        Operator,
        Gender,
        Age,
        Sector,
        ASN,
        Technology,
        Disability,
        RuralUrban,
        Topic,
        StakeholderType,
        Dialogues,
        PartnerType,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entity: "DisaggregatedData",
      entityId: created.id,
      action: "CREATE",
      oldValues: null,
      newValues: created,
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}


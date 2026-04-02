import { prisma } from "../config/prisma.js";
import { disaggregatedDataSchema, disaggregatedDataReplaceSchema } from "../validators/disaggregatedDataValidators.js";
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
      DialoguesText,
      PartnerType,
      NumberOfUsers,
      Language,
      City,
      Notes,
    } = data;

    const hasAnyField =
      Economy != null ||
      Infrastructure != null ||
      Institution != null ||
      Operator != null ||
      !!Gender ||
      !!Age ||
      !!Language ||
      !!City ||
      !!Sector ||
      !!ASN ||
      !!Technology ||
      !!Disability ||
      !!RuralUrban ||
      !!Topic ||
      !!StakeholderType ||
      Dialogues != null ||
      !!DialoguesText ||
      !!PartnerType ||
      NumberOfUsers != null ||
      !!Notes;

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
        City,
        Sector,
        ASN,
        Technology,
        Disability,
        RuralUrban,
        Topic,
        StakeholderType,
        Dialogues,
        DialoguesText,
        PartnerType,
        NumberOfUsers,
        Language,
        Notes,
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

export async function replaceDisaggregatedData(req, res, next) {
  try {
    const parsed = disaggregatedDataReplaceSchema.safeParse({
      reportId: Number(req.body.reportId),
      indicatorId: Number(req.body.indicatorId),
      projectId: req.body.projectId ? Number(req.body.projectId) : undefined,
      rows: req.body.rows ?? [],
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

    // Replace existing disaggregated data for this (reportId, indicatorId)
    await prisma.disaggregatedData.deleteMany({
      where: {
        reportId: data.reportId,
        indicatorId: data.indicatorId,
        ...(data.projectId != null ? { projectId: data.projectId } : {}),
      },
    });

    const createRow = async (row) => {
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
        DialoguesText,
        PartnerType,
        NumberOfUsers,
        Language,
        City,
        Notes,
      } = row;

      const hasAnyField =
        Economy != null ||
        Infrastructure != null ||
        Institution != null ||
        Operator != null ||
        !!Gender ||
        !!Age ||
        !!Language ||
        !!City ||
        !!Sector ||
        !!ASN ||
        !!Technology ||
        !!Disability ||
        !!RuralUrban ||
        !!Topic ||
        !!StakeholderType ||
        Dialogues != null ||
        !!DialoguesText ||
        !!PartnerType ||
        NumberOfUsers != null ||
        !!Notes;

      // If a row is empty, skip creating it.
      if (!hasAnyField) return null;

      return prisma.disaggregatedData.create({
        data: {
          projectId: data.projectId ?? report.projectId,
          reportId: data.reportId,
          indicatorId: data.indicatorId,
          Economy,
          Infrastructure,
          Institution,
          Operator,
          Gender,
          Age,
          City,
          Sector,
          ASN,
          Technology,
          Disability,
          RuralUrban,
          Topic,
          StakeholderType,
          Dialogues,
          DialoguesText,
          PartnerType,
          NumberOfUsers,
          Language,
          Notes,
        },
      });
    };

    const created = [];
    for (const row of data.rows) {
      const r = await createRow(row);
      if (!r) continue;
      await createAuditLog({
        userId: req.user.id,
        entity: "DisaggregatedData",
        entityId: r.id,
        action: "CREATE",
        oldValues: null,
        newValues: r,
      });
      created.push(r);
    }

    return res.status(201).json({ replaced: true, count: created.length });
  } catch (err) {
    next(err);
  }
}


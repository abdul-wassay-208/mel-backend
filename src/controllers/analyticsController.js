import { prisma } from "../config/prisma.js";

export async function getReportAnalytics(req, res, next) {
  try {
    const { category, status, leadId, from, to, reportingInterval } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }
    if (leadId) {
      where.leadId = Number(leadId);
    }
    if (from || to) {
      where.periodStart = {};
      if (from) where.periodStart.gte = new Date(from);
      if (to) where.periodStart.lte = new Date(to);
    }

    const projectWhere = {};
    if (category) projectWhere.category = category;
    if (reportingInterval) projectWhere.reportingInterval = reportingInterval;

    const reports = await prisma.report.findMany({
      where,
      include: { project: { where: projectWhere } },
    });

    const summaries = reports
      .filter((r) => r.project)
      .map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        project: {
          id: r.project.id,
          name: r.project.name,
          category: r.project.category,
          reportingInterval: r.project.reportingInterval,
        },
      }));

    res.json({
      total: summaries.length,
      results: summaries,
    });
  } catch (err) {
    next(err);
  }
}


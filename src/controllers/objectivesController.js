import { prisma } from "../config/prisma.js";

export async function getObjectives(req, res, next) {
  try {
    const objectives = await prisma.objective.findMany({
      include: {
        outcomes: {
          include: {
            indicators: true,
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { id: "asc" },
    });
    res.json(objectives);
  } catch (err) {
    next(err);
  }
}

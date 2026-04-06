import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Source data (mirrors mel-client/src/config/hierarchyConfig.ts) ──

const STRATEGIC_OBJECTIVES = [
  { prefix: '1', label: 'Objective 1 – Enhance technical capability of more than 100,000 people' },
  { prefix: '2', label: 'Objective 2 – Enhance digital inclusion for 1 million people' },
  { prefix: '3', label: 'Objective 3 – Influence techno policy transformation in at least 10 economies' },
];

const OUTCOMES = [
  { id: '1.1', label: 'Outcome 1.1 – Internet users have reliable, safe, and meaningful access to the Internet' },
  { id: '1.2', label: 'Outcome 1.2 – A robust Internet ecosystem is nurtured through collaboration and knowledge sharing by inclusive communities of practice' },
  { id: '1.3', label: 'Outcome 1.3 – Communities gain better access to knowledge and have more opportunities for better livelihoods' },
  { id: '2.1', label: 'Outcome 2.1 – New and evolving Internet and digital technologies responsibly further socio-economic outcomes' },
  { id: '2.2', label: "Outcome 2.2 – Stakeholders' actions are grounded in unbiased frameworks that are vendor-neutral and tech-neutral" },
  { id: '3.1', label: 'Outcome 3.1 – Stakeholders intervene based on coordinated and informed technical and policy advice' },
  { id: '3.2', label: 'Outcome 3.2 – Governments nurture supportive techno-policy environments to facilitate digital development and further socioeconomic progress' },
  { id: '3.3', label: 'Outcome 3.3 – Establish leadership for collective impact for digital development' },
];

const INDICATORS = [
  { id: '1.1.1', outcomePrefix: '1.1', label: '1.1.1 – # of local infrastructure deployed or upgraded' },
  { id: '1.1.2', outcomePrefix: '1.1', label: '1.1.2 – % of Internet traffic served locally' },
  { id: '1.1.3', outcomePrefix: '1.1', label: '1.1.3 – # of people benefiting from infrastructure improvements' },
  { id: '1.2.1', outcomePrefix: '1.2', label: '1.2.1 – # of people trained' },
  { id: '1.2.2', outcomePrefix: '1.2', label: '1.2.2 – % of participants applying knowledge in workplace or operations' },
  { id: '1.2.3', outcomePrefix: '1.2', label: '1.2.3 – # of organisations represented' },
  { id: '1.3.1', outcomePrefix: '1.3', label: '1.3.1 – # of knowledge resources produced' },
  { id: '1.3.2', outcomePrefix: '1.3', label: '1.3.2 – % of beneficiaries reporting improved livelihood opportunities' },
  { id: '2.1.1', outcomePrefix: '2.1', label: '2.1.1 – # of Foundation-supported research, tools, platforms, protocols, and pilot solutions developed or trialed' },
  { id: '2.1.2', outcomePrefix: '2.1', label: '2.1.2 – # of innovations adopted by ISPs, governments, institutions, and other relevant entities' },
  { id: '2.1.3', outcomePrefix: '2.1', label: '2.1.3 – # of people benefitting from innovative solutions deployed' },
  { id: '2.2.1', outcomePrefix: '2.2', label: '2.2.1 – # of vendor or tech-neutral frameworks developed or published' },
  { id: '2.2.2', outcomePrefix: '2.2', label: '2.2.2 – # of stakeholders adopting or supporting vendor or tech-neutral frameworks' },
  { id: '3.1.1', outcomePrefix: '3.1', label: '3.1.1 – # of policy papers, briefs, or guidance notes published' },
  { id: '3.1.2', outcomePrefix: '3.1', label: '3.1.2 – # of stakeholders citing Foundation in policies, strategies, frameworks, consultations, or reports' },
  { id: '3.1.3', outcomePrefix: '3.1', label: '3.1.3 – # of capacity-building and advocacy events on digital policy' },
  { id: '3.1.4', outcomePrefix: '3.1', label: '3.1.4 – % of stakeholders reporting increased policy understanding or capacity' },
  { id: '3.2.1', outcomePrefix: '3.2', label: '3.2.1 – # of draft or adopted policies, strategies, or regulations that reflect Foundation input' },
  { id: '3.2.2', outcomePrefix: '3.2', label: '3.2.2 – # of people impacted by policy or regulatory changes' },
  { id: '3.3.1', outcomePrefix: '3.3', label: '3.3.1 – # of multistakeholder initiatives or platforms supported, co-led or sustained by the Foundation' },
  { id: '3.3.2', outcomePrefix: '3.3', label: '3.3.2 – # of joint publications, reports, events, and activities with partners' },
  { id: '3.3.3', outcomePrefix: '3.3', label: '3.3.3 – % of partners recognising Foundation as a leader in digital development' },
];

async function main() {
  // ── 1. Seed Objectives ──
  const objectivePrefixToId = {};
  for (const obj of STRATEGIC_OBJECTIVES) {
    const created = await prisma.objective.create({
      data: { title: obj.label },
    });
    objectivePrefixToId[obj.prefix] = created.id;
    console.log(`Created Objective [${created.id}]: ${obj.label}`);
  }

  // ── 2. Seed Outcomes ──
  // outcome id format is 'X.Y' — the part before '.' is the objective prefix
  const outcomeStringToId = {};
  for (const outcome of OUTCOMES) {
    const objectivePrefix = outcome.id.split('.')[0];
    const objectiveId = objectivePrefixToId[objectivePrefix];
    const created = await prisma.outcome.create({
      data: { title: outcome.label, objectiveId },
    });
    outcomeStringToId[outcome.id] = created.id;
    console.log(`Created Outcome [${created.id}]: ${outcome.label}`);
  }

  // ── 3. Seed Indicators ──
  for (const indicator of INDICATORS) {
    const outcomeId = outcomeStringToId[indicator.outcomePrefix];
    const created = await prisma.indicator.create({
      data: { name: indicator.label, outcomeId },
    });
    console.log(`Created Indicator [${created.id}]: ${indicator.label}`);
  }

  console.log(`\nSeed complete: ${STRATEGIC_OBJECTIVES.length} objectives, ${OUTCOMES.length} outcomes, ${INDICATORS.length} indicators.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


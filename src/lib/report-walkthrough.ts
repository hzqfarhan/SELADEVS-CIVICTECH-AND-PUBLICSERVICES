import { z } from "zod";

export type WalkthroughView = "resident" | "operator" | "passenger";
export type WalkthroughStage = 0 | 1 | 2 | 3 | 4;
export const WALKTHROUGH_STORAGE_KEY = "gerak:report-walkthrough:v1";
export const stageLabels = [
  "Draft",
  "Submitted",
  "Acknowledged",
  "In progress",
  "Resolved",
] as const;

export const walkthroughScenarios = [
  {
    id: "pothole",
    label: "Pothole near crossing",
    title: "Pothole near the crossing",
    description:
      "A pothole near the bus stop crossing makes the road unsafe for passengers and other road users.",
    location: "Example location · Near Larkin Sentral crossing",
    category: "Infrastructure",
    photo: "/demo/civic-pothole.png",
    coordinate: [103.743, 1.493],
  },
  {
    id: "damaged-stop",
    label: "Damaged bus shelter",
    title: "Damaged shelter at the bus stop",
    description:
      "The bus shelter roof and seating are damaged, leaving passengers without a safe waiting area.",
    location: "Example location · Community bus stop",
    category: "Damaged stop",
    photo: "/demo/civic-damaged-stop.png",
    coordinate: [103.749, 1.487],
  },
  {
    id: "flood",
    label: "Flooded walking route",
    title: "Flooding blocks the walking route",
    description:
      "Standing water covers the walkway beside the bus stop and blocks the usual route to the shelter.",
    location: "Example location · Walkway beside the bus stop",
    category: "Flooding",
    photo: "/demo/civic-flood.png",
    coordinate: [103.752, 1.484],
  },
  {
    id: "accessibility",
    label: "Blocked access ramp",
    title: "Access ramp is blocked",
    description:
      "A barrier blocks the access ramp, making it difficult for wheelchair users and passengers with prams to reach the stop.",
    location: "Example location · Bus stop access ramp",
    category: "Accessibility",
    photo: "/demo/civic-accessibility.png",
    coordinate: [103.757, 1.479],
  },
] as const;

const stateSchema = z
  .object({
    version: z.literal(1),
    scenarioId: z.string(),
    title: z.string().max(120),
    description: z.string().max(2_000),
    location: z.string().max(200),
    photoAttached: z.boolean(),
    stage: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ]),
    view: z.enum(["resident", "operator", "passenger"]),
    reportId: z.string().regex(/^DEMO-GRK-00[1-4]$/),
    updatedAt: z.string().datetime().nullable(),
  })
  .strict();

export type WalkthroughState = z.infer<typeof stateSchema>;

export function createWalkthrough(scenarioId = "pothole"): WalkthroughState {
  const index = Math.max(
    0,
    walkthroughScenarios.findIndex((item) => item.id === scenarioId),
  );
  const scenario = walkthroughScenarios[index];
  return {
    version: 1,
    scenarioId: scenario.id,
    title: scenario.title,
    description: scenario.description,
    location: scenario.location,
    photoAttached: false,
    stage: 0,
    view: "resident",
    reportId: `DEMO-GRK-00${index + 1}`,
    updatedAt: null,
  };
}

export function parseWalkthrough(value: unknown): WalkthroughState {
  const parsed = stateSchema.safeParse(value);
  if (!parsed.success) return createWalkthrough();
  const index = walkthroughScenarios.findIndex(
    (scenario) => scenario.id === parsed.data.scenarioId,
  );
  if (index < 0 || parsed.data.reportId !== `DEMO-GRK-00${index + 1}`)
    return createWalkthrough();
  if (
    parsed.data.stage > 0 &&
    (!parsed.data.updatedAt ||
      !parsed.data.photoAttached ||
      parsed.data.title.trim().length < 5 ||
      parsed.data.description.trim().length < 10 ||
      parsed.data.location.trim().length < 2)
  )
    return createWalkthrough();
  return parsed.data;
}

export function submitWalkthrough(
  state: WalkthroughState,
  now = new Date().toISOString(),
): WalkthroughState {
  if (state.stage !== 0)
    throw Error("This demo report has already been submitted.");
  if (state.title.trim().length < 5)
    throw Error("Add a report title with at least five characters.");
  if (state.description.trim().length < 10)
    throw Error("Add a description with at least ten characters.");
  if (state.location.trim().length < 2) throw Error("Add the report location.");
  if (!state.photoAttached)
    throw Error("Snap the example photo before submitting.");
  return {
    ...state,
    title: state.title.trim(),
    description: state.description.trim(),
    location: state.location.trim(),
    stage: 1,
    updatedAt: now,
  };
}

export function advanceWalkthrough(
  state: WalkthroughState,
  now = new Date().toISOString(),
): WalkthroughState {
  if (state.stage === 0) throw Error("Submit the demo report first.");
  if (state.stage === 4) return state;
  return {
    ...state,
    stage: (state.stage + 1) as WalkthroughStage,
    view: "operator",
    updatedAt: now,
  };
}

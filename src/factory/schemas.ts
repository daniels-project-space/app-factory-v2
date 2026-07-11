import { z } from "zod";

/** Stage outputs are structured — no regex-salvaging JSON out of logs (v1). */

export const BriefSchema = z.object({
  name: z.string().describe("App display name, 1-2 words, distinctive"),
  slug: z
    .string()
    .regex(/^[a-z0-9-]{3,30}$/)
    .describe("kebab-case slug"),
  oneLiner: z.string().max(120),
  positioning: z.string().describe("who it's for, the pain, why this wins — 3-5 sentences"),
  persona: z.string().describe("primary persona in 2 sentences"),
  pricing: z.string().describe("price point + model, e.g. '$7.99/week hard paywall after 3 uses'"),
  mvpFeatures: z.array(z.string()).min(4).max(10).describe("the MVP cut, nothing more"),
  brand: z.object({
    primary: z.string().describe("hex"),
    accent: z.string().describe("hex"),
    font: z.string().describe("one of: SpaceGrotesk, Sora, Manrope, PlayfairDisplay"),
    vibe: z.string().describe("3-6 word art direction, e.g. 'warm paper, ink, quiet luxury'"),
  }),
  risks: z.array(z.string()).max(5),
  verdictScore: z.number().min(0).max(10).describe("honest build-worthiness score"),
});
export type Brief = z.infer<typeof BriefSchema>;

export const RoadmapSchema = z.object({
  items: z
    .array(
      z.object({
        milestone: z.number().min(1).max(4).describe("1=walking skeleton, 2=core value, 3=monetization+polish, 4=store-ready"),
        title: z.string().max(100),
        acceptance: z
          .string()
          .describe("ONE concretely checkable criterion, phrased so a browser test or reviewer can verify it"),
      }),
    )
    .min(12)
    .max(32),
});
export type Roadmap = z.infer<typeof RoadmapSchema>;

export const VisionFindingsSchema = z.object({
  findings: z
    .array(
      z.object({
        screen: z.string(),
        severity: z.enum(["P0", "P1", "P2", "P3"]),
        category: z.enum([
          "broken_render",
          "layout_overflow",
          "contrast",
          "placeholder_content",
          "generic_design",
          "missing_state",
          "other",
        ]),
        title: z.string().max(120),
        detail: z.string().max(500),
      }),
    )
    .max(12),
  overall: z.number().min(0).max(10),
  looksShippable: z.boolean(),
});
export type VisionFindings = z.infer<typeof VisionFindingsSchema>;

export const ReviewVerdictSchema = z.object({
  verdict: z.enum(["approve", "fix_first", "hold_for_daniel"]),
  summary: z.string().max(800),
  fixes: z
    .array(
      z.object({
        severity: z.enum(["P0", "P1"]),
        title: z.string().max(120),
        detail: z.string().max(500),
      }),
    )
    .max(8)
    .describe("only defects against the roadmap acceptance criteria — no new scope"),
  roadmapItemsVerified: z.array(z.string()).describe("titles of roadmap items confirmed working"),
});
export type ReviewVerdict = z.infer<typeof ReviewVerdictSchema>;

export const IdeaVerdictSchema = z.object({
  score: z.number().min(0).max(10),
  verdict: z.string().max(600).describe("one-paragraph honest deliberation: market, differentiation, revenue"),
  proceed: z.boolean(),
});
export type IdeaVerdict = z.infer<typeof IdeaVerdictSchema>;

export const ForgeCandidatesSchema = z.object({
  candidates: z
    .array(
      z.object({
        repoUrl: z.string(),
        name: z.string(),
        stars: z.number(),
        license: z.string().describe("MIT or Apache-2.0 ONLY — verified from LICENSE file text"),
        category: z.string(),
        pitch: z.string().max(300),
      }),
    )
    .max(8),
});

export const BuildReportSchema = z.object({
  completedItems: z.array(z.string()).describe("exact titles of roadmap items fully implemented"),
  fixedIssues: z.array(z.string()).describe("fingerprints of issues fixed"),
  notes: z.string().max(500),
});
export type BuildReport = z.infer<typeof BuildReportSchema>;

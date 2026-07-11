import { Mastra } from "@mastra/core/mastra";
import {
  inceptionAgent,
  roadmapAgent,
  designerAgent,
  builderAgent,
  fixerAgent,
  visionAgent,
  reviewerAgent,
  packagerAgent,
  forgeScoutAgent,
  triageAgent,
} from "./agents";

export const mastra = new Mastra({
  agents: {
    inceptionAgent,
    roadmapAgent,
    designerAgent,
    builderAgent,
    fixerAgent,
    visionAgent,
    reviewerAgent,
    packagerAgent,
    forgeScoutAgent,
    triageAgent,
  },
});

export {
  inceptionAgent,
  roadmapAgent,
  designerAgent,
  builderAgent,
  fixerAgent,
  visionAgent,
  reviewerAgent,
  packagerAgent,
  forgeScoutAgent,
  triageAgent,
};

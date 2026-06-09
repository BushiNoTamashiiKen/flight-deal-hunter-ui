import {
  cloudRepoEnvDocs,
  isManagedServerlessHost,
  trimmedCloudRepoRef,
  trimmedCloudRepoUrl,
} from "@/lib/cursor-agent-options";

export function buildSkyflintAgentCreateInput(apiKey: string) {
  const name = "Skyflint flight-deal-hunter";
  const model = { id: "composer-2" as const };

  if (isManagedServerlessHost()) {
    const repoUrl = trimmedCloudRepoUrl();
    if (!repoUrl) {
      throw new Error(`${cloudRepoEnvDocs} must be set for live hunts on Netlify/Vercel/Lambda`);
    }
    return {
      apiKey,
      name,
      model,
      cloud: {
        repos: [{ url: repoUrl, startingRef: trimmedCloudRepoRef() }],
        autoCreatePR: false as const,
        skipReviewerRequest: true as const,
      },
    };
  }

  return {
    apiKey,
    name,
    model,
    local: {
      cwd: process.cwd(),
    },
  };
}

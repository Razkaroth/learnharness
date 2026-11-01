import { claudeCodeInstallationResponse, withUser } from "@/src/server";

/** Installation/version only; never reads auth status or makes a model request. */
async function handleGET(request: Request) {
	return claudeCodeInstallationResponse(request);
}

export const GET = withUser(handleGET);

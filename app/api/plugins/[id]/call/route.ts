import { pluginTransport, withUser } from "@/src/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handlePOST(request: Request, context: { params: Promise<{ id: string }> }) {
	return pluginTransport.call((await context.params).id, request);
}

export const POST = withUser(handlePOST);

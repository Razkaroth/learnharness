import { pluginTransport, withUser } from "@/src/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handlePUT(request: Request, context: { params: Promise<{ id: string }> }) {
	return pluginTransport.setEnabled((await context.params).id, request);
}

export const PUT = withUser(handlePUT);

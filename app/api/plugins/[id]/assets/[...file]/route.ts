import { pluginTransport, withUser } from "@/src/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handleGET(_request: Request, context: { params: Promise<{ id: string; file: string[] }> }) {
	const { id, file } = await context.params;
	return pluginTransport.asset(id, file);
}

export const GET = withUser(handleGET);

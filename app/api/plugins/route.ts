import { pluginTransport, withUser } from "@/src/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function handleGET(_req: Request) { return pluginTransport.list(); }
function handlePOST(request: Request) { return pluginTransport.refresh(request); }

export const GET = withUser(handleGET);
export const POST = withUser(handlePOST);

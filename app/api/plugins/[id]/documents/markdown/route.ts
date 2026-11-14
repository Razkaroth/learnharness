import { createPluginDocumentRoute, pluginTransport, withUser } from "@/src/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This exact route skips Proxy body cloning, NOT desktop authentication.
const handlers = createPluginDocumentRoute(pluginTransport);
export const POST = withUser(handlers.POST);
export const OPTIONS = handlers.OPTIONS;
export const GET = withUser(handlers.GET);
export const HEAD = withUser(handlers.HEAD);
export const PUT = withUser(handlers.PUT);
export const PATCH = withUser(handlers.PATCH);
export const DELETE = withUser(handlers.DELETE);

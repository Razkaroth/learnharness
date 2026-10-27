import { cookies } from "next/headers";
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, isAppLanguage, resolveSettings, type AppLanguage } from "@/src/core";
import { readSettingsRecord, registryExists, runAsUser } from "@/src/server";
import { pageUserId } from "./user";

/** The page's app language: the signed-in profile's setting. With no
 *  profile open, the last language this browser used; an unclaimed
 *  install without that cookie still has its root settings record. */
export async function pageLanguage(): Promise<AppLanguage> {
	const userId = await pageUserId();
	if (userId) return runAsUser(userId, () => resolveSettings(readSettingsRecord()).general.language);
	const remembered = (await cookies()).get(LANGUAGE_COOKIE)?.value;
	if (isAppLanguage(remembered)) return remembered;
	if (!registryExists()) return resolveSettings(readSettingsRecord()).general.language;
	return DEFAULT_LANGUAGE;
}

"use client";

/**
 * The UI language: the root layout seeds it from the settings record (no
 * English flash), and it follows every general-section save. Components
 * read copy through useT(); with no provider mounted they get English.
 * Every language change is remembered in a browser cookie, which the
 * profile select screen reads before anyone has signed in.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, resolveSettings, translate, type AppLanguage, type TranslationKey, type UserSettings } from "@/src/core";
import { useSettingsSaved } from "@/components/settings-signal";

const LanguageContext = createContext<AppLanguage>(DEFAULT_LANGUAGE);
const SetLanguageContext = createContext<(language: AppLanguage) => void>(() => {});

export function I18nProvider({ initialLanguage, children }: { initialLanguage: AppLanguage; children: React.ReactNode }) {
	const [language, setLanguage] = useState<AppLanguage>(initialLanguage);
	useSettingsSaved((section) => {
		if (section !== "general") return;
		fetch("/api/settings")
			.then((r) => r.json() as Promise<{ settings?: UserSettings | null }>)
			.then((body) => setLanguage(resolveSettings(body.settings ?? null).general.language))
			.catch(() => {});
	});
	useEffect(() => {
		document.documentElement.lang = language;
		document.cookie = `${LANGUAGE_COOKIE}=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
	}, [language]);
	return (
		<SetLanguageContext.Provider value={setLanguage}>
			<LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>
		</SetLanguageContext.Provider>
	);
}

export function useLanguage(): AppLanguage {
	return useContext(LanguageContext);
}

/** Switch the UI language for this page without touching a settings
 *  record — the select screen's picker, before any profile is open. */
export function useSetLanguage(): (language: AppLanguage) => void {
	return useContext(SetLanguageContext);
}

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export function useT(): Translate {
	const language = useLanguage();
	return useCallback<Translate>((key, vars) => translate(language, key, vars), [language]);
}

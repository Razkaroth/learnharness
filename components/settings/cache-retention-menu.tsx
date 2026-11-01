"use client";

import type { CacheRetention } from "@earendil-works/pi-ai";
import { useT, type Translate } from "@/components/i18n";

const OPTIONS = [
	{ value: undefined, key: "default" },
	{ value: "none", key: "none" },
	{ value: "short", key: "short" },
	{ value: "long", key: "long" },
] as const;

export function cacheRetentionLabel(value: CacheRetention | undefined, t: Translate): string {
	const option = OPTIONS.find((o) => o.value === value)!;
	return t("settings.cache.label", { value: t(`settings.cache.${option.key}.compact`) });
}

export function CacheRetentionMenu({ value, onPick }: {
	value: CacheRetention | undefined;
	onPick: (value: CacheRetention | undefined) => void;
}) {
	const t = useT();
	return <>
		<div className="border-b border-border px-2 pb-2">
			<p className="text-card-foreground">{t("settings.cache.title")}</p>
			<p className="mt-1 text-muted-foreground">{t("settings.cache.description")}</p>
		</div>
		{OPTIONS.map((option) => <button
			key={option.value ?? "default"}
			type="button"
			data-testid={`cache-retention-option-${option.value ?? "default"}`}
			aria-pressed={value === option.value}
			onClick={() => onPick(option.value)}
			className={`rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted ${value === option.value ? "bg-muted/60" : ""}`}
		>
			<span className="flex justify-between gap-2 text-card-foreground"><span>{t(`settings.cache.${option.key}.label`)}</span>{value === option.value && <span aria-hidden>✓</span>}</span>
			<span className="mt-1 block text-muted-foreground">{t(`settings.cache.${option.key}.description`)}</span>
		</button>)}
	</>;
}

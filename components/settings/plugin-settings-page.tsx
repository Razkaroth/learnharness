"use client";

import type { FrontendPlugin } from "@/components/plugin-manager";
import { useT } from "@/components/i18n";
import { PluginMountPoint } from "@/components/plugins";
import { PluginSettingsRows } from "@/components/plugin-ui-host";
import { SettingsSection } from "./controls";

/** Plugin persistence belongs to the registration; the host only presents it. */
export function PluginSettingsPage({ plugin }: { plugin: FrontendPlugin }) {
	const t = useT();
	const { info, settings } = plugin;
	const name = info.manifest?.name ?? info.id;
	return <SettingsSection title={name} testid={`section-plugin-${info.id}`}>
		{plugin.error && <p role="alert" className="break-words text-xs text-destructive">{plugin.error}</p>}
		{plugin.phase === "loading" ? <p role="status" className="text-xs text-muted-foreground">{t("plugins.settings.loading")}</p>
			: plugin.phase === "error" ? !plugin.error && <p role="alert" className="text-xs text-destructive">{t("plugins.settings.failed")}</p>
				: !settings ? <p className="text-xs text-muted-foreground">{t("plugins.settings.none")}</p>
					: typeof settings === "function" ? <PluginMountPoint pluginId={info.id} mount={settings} label={t("plugins.settings.label", { name })} />
						: <PluginSettingsRows schema={settings} />}
	</SettingsSection>;
}

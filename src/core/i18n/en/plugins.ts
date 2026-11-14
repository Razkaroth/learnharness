/** Plugin host UI: settings pages, plugin views, chrome and plugin-owned docks. */
export const plugins = {

	// Settings → Core/Community plugins
	"plugins.trustWarning": "Only enable plugins you trust. Plugins run trusted local code with broad file and network access; they are not sandboxed. A broken plugin may require restarting LearnHarness.",
	"plugins.install.title": "How to install a plugin",
	"plugins.install.copy": "Clone or copy the plugin into the directory below, using its plugin ID as the folder name.",
	"plugins.install.build": "For source projects, follow the repository’s dependency setup and run `npm run build`. Prebuilt packages already contain `dist/manifest.json` and need no build.",
	"plugins.install.enable": "Refresh the list, then enable the plugin. New plugins are disabled by default.",
	"plugins.install.restart": "Restart LearnHarness after changing loaded code. Preserve `data/` beside `dist/` when updating.",
	"plugins.authoring.title": "Build a plugin",
	"plugins.authoring.body": "Download the authoring skill for your coding agent.",
	"plugins.authoring.download": "Download authoring skill",
	"plugins.directory": "Plugins directory",
	"plugins.refresh": "Refresh plugins",
	"plugins.loading": "Loading plugins…",
	"plugins.emptyCore": "No Core plugins available.",
	"plugins.emptyCommunity": "No community plugins installed.",
	"plugins.status.saving": "Saving…",
	"plugins.status.error": "Error",
	"plugins.status.loading": "Loading…",
	"plugins.status.enabled": "Enabled",
	"plugins.status.disabled": "Disabled",
	"plugins.settingsFor": "Settings for {name}",
	"plugins.enable": "Enable {name}",
	"plugins.settings.loading": "Loading plugin settings…",
	"plugins.settings.failed": "Plugin settings could not be loaded.",
	"plugins.settings.none": "No settings available.",
	"plugins.settings.label": "{name} settings",

	// Plugin view page
	"plugins.view.notInstalled": "Plugin is not installed.",
	"plugins.view.disabled": "This plugin is disabled.",
	"plugins.view.unavailable": "This plugin view is not available.",
	"plugins.view.fallbackTitle": "Plugin",
	"plugins.view.settings": "Plugin settings",
	"plugins.view.loading": "Loading plugin…",
	"plugins.view.backHome": "Back to home",

	// Plugin chrome
	"plugins.chrome.graphActions": "Plugin graph actions",
	"plugins.chrome.moreActions": "More plugin actions",

	"plugins.dialog.close": "Close dialog",

	// Plugin questions and problems
	"plugins.question.preparing": "Preparing question…",
	"plugins.question.unavailable": "Question unavailable",
	"plugins.question.dismissed": "Question dismissed",
	"plugins.question.dismiss": "Dismiss question",
	"plugins.question.thinking": "Your thinking",
	"plugins.problem.preparing": "Preparing problem…",
	"plugins.problem.unavailable": "Problem unavailable",
	"plugins.renderer.codeBlock": "Plugin code block ({language})",
	"plugins.renderer.tool": "Plugin tool ({toolName})",

	// Plugin action shortcuts (Settings → Keyboard)
	"plugins.shortcut.scope.app": "App-wide",
	"plugins.shortcut.scope.teaching": "Teaching",
	"plugins.shortcut.scope.practice": "Practice",
	"plugins.shortcut.scope.views": "Views: {views}",
	"plugins.shortcut.invalid": "Not an allowed plugin action shortcut",
	"plugins.shortcut.conflictCore": "Conflicts with core shortcut: {label}",
	"plugins.shortcut.conflictPlugin": "Conflicts with {plugin} · {name}",
	"plugins.shortcut.inactive": "Inactive: {reason}",
	"plugins.shortcut.unavailable": "This plugin action is no longer available.",

	// Misc host surfaces
	"plugins.settings.outOfRange": "Value is outside the allowed range.",
	"plugins.composer.placeholder": "Message…",
	"plugins.worker.details": "Task details",
	"plugins.worker.formatFailed": "Result formatting failed: {error}",
	"plugins.worker.fallbackTitle": "Plugin worker",
} as const;

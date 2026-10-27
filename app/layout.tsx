import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { AppShell, SidebarProvider } from "@/components/sidebar";
import { ActivityProvider } from "@/components/activity-dock";
import { PhoneLayoutProvider } from "@/components/phone-layout-context";
import { ServerEventsProvider } from "@/components/server-events";
import { AppearanceProvider } from "@/components/settings/appearance";
import UpdateBanner from "@/components/update-banner";
import { I18nProvider } from "@/components/i18n";
import { resolveSettings, translate } from "@/src/core";
import { readSettingsRecord } from "@/src/server";

// Chrome = JetBrains Mono, teaching prose = Source Sans 3, titles = CMU
// Serif (the bundled lh-cmu @font-face in globals.css — no CDN).
const ui = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });
const prose = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans3" });

export function generateMetadata(): Metadata {
	const language = resolveSettings(readSettingsRecord()).general.language;
	return {
		title: "Learning Harness",
		description: translate(language, "nav.meta.description"),
	};
}

// Dynamic: the app language is read from the settings record per request.
export const dynamic = "force-dynamic";

// cover: the page runs under the phone's home indicator, and the docks pad
// by env(safe-area-inset-bottom). resizes-content: Android shrinks the page
// for the keyboard; iOS ignores it and the keyboard inset covers it.
// Pinch-zoom stays enabled.
export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
	interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	const language = resolveSettings(readSettingsRecord()).general.language;
	return (
		<html lang={language} className={`dark ${ui.variable} ${prose.variable}`}>
			<body className="min-h-dvh antialiased">
			<I18nProvider initialLanguage={language}>
			{/* The notification channel rides OUTSIDE everything: sidebar, dock,
				 and pages all subscribe as the polls retire (push S3, 2026-10-02). */}
			<ServerEventsProvider>
				<AppearanceProvider>
					<PhoneLayoutProvider>
						<SidebarProvider>
							<ActivityProvider>
								<AppShell>{children}</AppShell>
							</ActivityProvider>
						</SidebarProvider>
					</PhoneLayoutProvider>
				</AppearanceProvider>
			</ServerEventsProvider>
			{/* Auto-update banner (Wave C): fixed card, Electron-only pushes. */}
			<UpdateBanner />
			</I18nProvider>
		</body>
		</html>
	);
}

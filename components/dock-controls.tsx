"use client";

import { ChevronDownIcon, Maximize2Icon, Minimize2Icon } from "lucide-react";
import { useT } from "@/components/i18n";

const BUTTON =
	"flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

/** The phone dock's corner controls: fold the open question/problem to its
 *  slim bar, or give it the whole screen. Sits over the card's top-right. */
export function DockControls({
	fullscreen,
	onMinimize,
	onToggleFullscreen,
}: {
	fullscreen: boolean;
	onMinimize: () => void;
	onToggleFullscreen: () => void;
}) {
	const t = useT();
	const toggleLabel = t(fullscreen ? "composer.dock.exitFullscreen" : "composer.dock.fullscreen");
	return (
		<div data-testid="dock-controls" className="absolute top-1 right-1 z-10 flex gap-0.5 rounded-md bg-card/90">
			<button type="button" data-testid="dock-minimize" aria-label={t("composer.dock.minimize")} onClick={onMinimize} className={BUTTON}>
				<ChevronDownIcon className="size-4" />
			</button>
			<button
				type="button"
				data-testid="dock-fullscreen"
				aria-label={toggleLabel}
				aria-pressed={fullscreen}
				onClick={onToggleFullscreen}
				className={BUTTON}
			>
				{fullscreen ? <Minimize2Icon className="size-4" /> : <Maximize2Icon className="size-4" />}
			</button>
		</div>
	);
}

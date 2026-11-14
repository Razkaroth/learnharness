"use client";

import type { ReactElement, ReactNode } from "react";
import { HostDialog } from "@/components/host-dialog";
import { useBackdropDismiss } from "@/components/backdrop-dismiss";
import { useT } from "@/components/i18n";
import type { TranslationKey } from "@/src/core";

/**
 * The ESC-abort guard (owner, 2026-10-02): the global Esc → abort chain
 * opens this confirm popup EVERYWHERE — mid-stream aborts and pending-
 * question dismissals alike. Esc on the popup itself cancels (claimed —
 * it must never chain into another abort), which is also why Chat's
 * abort handler ignores events while this dialog is open: two window
 * listeners fire per Esc and stopPropagation alone cannot order them.
 *
 * MINIMAL, the delete-node dialog's tone: title, one line, Cancel +
 * action. No busy state — both actions are local (a fetch that fires
 * and forgets, an answer submit whose own machinery shows progress).
 *
 * What "abort" means is mode-dependent: from a running turn it kills
 * the turn (partial stays); from a pending question there is no turn to
 * kill — abort IS dismissal (A2, 2026-10-03): the silent route writes
 * the skipped toolResult and wakes NOTHING; the session pauses until
 * the user's next plain message, which carries the dismissal to the
 * model in its context.
 */

/** What Esc is aborting — drives copy and the confirm action. */
export type AbortMode = "turn" | "question" | "problem";

const COPY: Record<AbortMode, { title: TranslationKey; line: TranslationKey; action: TranslationKey }> = {
	turn: {
		title: "composer.abort.turn.title",
		line: "composer.abort.turn.line",
		action: "composer.abort.turn.action",
	},
	question: {
		title: "composer.abort.question.title",
		line: "composer.abort.question.line",
		action: "composer.abort.question.action",
	},
	problem: {
		title: "composer.abort.problem.title",
		line: "composer.abort.problem.line",
		action: "composer.abort.problem.action",
	},
};

/** The dialog's pure body — exported for SSR pins (the delete-node
 * pattern). The wrapper owns effects + the portal. */
export function AbortTurnBody({
	mode,
	onClose,
	onConfirm,
	busy = false,
	renderFrame,
}: {
	mode: AbortMode;
	onClose: () => void;
	onConfirm: () => void;
	/** The dismiss doubles as the abort when a turn is still running
	 * (owner, 2026-10-04): the line says so. */
	busy?: boolean;
	renderFrame?: (frame: ReactElement<{ children: ReactNode }>) => ReactNode;
}) {
	const backdropDismiss = useBackdropDismiss(onClose);
	const t = useT();
	const copy = COPY[mode];
	const frame = (
			<div
				className="mx-4 w-full max-w-sm rounded-xl border bg-card p-5 shadow-lg"
				onClick={(e) => e.stopPropagation()}
			>
				<h2 className="text-sm font-semibold text-card-foreground" data-testid="abort-turn-title">
					{t(copy.title)}
				</h2>
				<p className="mt-1.5 text-xs text-muted-foreground" data-testid="abort-turn-line">
					{t(copy.line)}
					{busy && mode !== "turn" ? ` ${t("composer.abort.busy")}` : ""}
				</p>
				<div className="mt-4 flex justify-end gap-2">
					<button
						type="button"
						data-testid="abort-turn-cancel"
						onClick={onClose}
						className="rounded-sm px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
					>
						{t("composer.abort.cancel")}
					</button>
					<button
						type="button"
						data-testid="abort-turn-confirm"
						onClick={onConfirm}
						// Destructive red — the app's established destructive pair.
						className="rounded-sm border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/20"
					>
						{t(copy.action)}
					</button>
				</div>
			</div>
	);
	if (renderFrame) return renderFrame(frame);
	return <div role="dialog" aria-modal="true" aria-label={t(copy.title)} data-testid="abort-turn-dialog"
		className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
		{...backdropDismiss}>{frame}</div>;
}

export function AbortTurnDialog({
	mode,
	onClose,
	onConfirm,
	busy = false,
}: {
	/** What Esc is aborting; null = closed (nothing rendered). */
	mode: AbortMode | null;
	onClose: () => void;
	onConfirm: (mode: AbortMode) => void;
	busy?: boolean;
}) {
	if (mode === null) return null;
	return <AbortTurnBody mode={mode} onClose={onClose} onConfirm={() => onConfirm(mode)} busy={busy}
		renderFrame={(frame) => <HostDialog open frame={frame} aria-label={COPY[mode].title}
			onClose={() => { onClose(); return "closed"; }}
			backdropProps={{ className: "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm", "data-testid": "abort-turn-dialog" }}>
			{frame.props.children}
		</HostDialog>} />;
}

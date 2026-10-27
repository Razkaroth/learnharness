"use client";
/**
 * The profile form (multi-user profiles, 2026-10-27): name, one of eight
 * colors, optional PIN, with a live avatar preview. Shared by the select
 * screen's "Add profile" and the Users settings section; only the Users
 * section shows the language field (the select screen has its own picker).
 */

import { useId, useState } from "react";
import {
	APP_LANGUAGES,
	PROFILE_COLORS,
	PROFILE_NAME_MAX,
	isAppLanguage,
	isValidPin,
	normalizeProfileName,
	profileGradient,
	type AppLanguage,
	type ProfileColor,
} from "@/src/core";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n";
import { ProfileAvatar } from "./profile-avatar";

export interface ProfileFormValues {
	name: string;
	color: ProfileColor;
	/** undefined = unchanged (editing), null = clear, string = set. */
	pin?: string | null;
	/** Set only when the form shows the language field. */
	language?: AppLanguage;
}

export function ProfileForm({
	initial,
	initialLanguage,
	hasPin = false,
	submitLabel,
	onSubmit,
	onCancel,
	compact = false,
}: {
	initial?: { name: string; color: ProfileColor };
	/** Shows the language field, starting on this language. */
	initialLanguage?: AppLanguage;
	/** Editing a profile that already has a PIN: offer to keep or remove it. */
	hasPin?: boolean;
	submitLabel: string;
	/** Resolves to an error message to show, or null on success. */
	onSubmit: (values: ProfileFormValues) => Promise<string | null>;
	onCancel?: () => void;
	/** Settings density: smaller preview, tighter spacing. */
	compact?: boolean;
}) {
	const t = useT();
	const [name, setName] = useState(initial?.name ?? "");
	const [color, setColor] = useState<ProfileColor>(initial?.color ?? "indigo");
	const [pin, setPin] = useState("");
	const [removePin, setRemovePin] = useState(false);
	const [language, setLanguage] = useState<AppLanguage | undefined>(initialLanguage);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const pinId = useId();
	const languageId = useId();

	const submit = async () => {
		const trimmed = normalizeProfileName(name);
		if (!trimmed) return setError(t("users.form.name.required"));
		if (pin && !isValidPin(pin)) return setError(t("users.form.pin.invalid"));
		const values: ProfileFormValues = { name: trimmed, color };
		if (pin) values.pin = pin;
		else if (removePin) values.pin = null;
		else if (!initial) values.pin = null;
		if (language) values.language = language;
		setBusy(true);
		setError(null);
		const problem = await onSubmit(values);
		setBusy(false);
		if (problem) setError(problem);
	};

	return (
		<form
			data-testid="profile-form"
			className={cn("flex flex-col items-center", compact ? "gap-4" : "gap-6")}
			onSubmit={(e) => {
				e.preventDefault();
				void submit();
			}}
			onKeyDown={(e) => {
				if (e.key === "Escape" && onCancel) {
					e.preventDefault();
					e.stopPropagation();
					onCancel();
				}
			}}
		>
			<ProfileAvatar name={name || "?"} color={color} className={compact ? "size-16 text-xl" : "size-28 text-4xl"} />

			<label className="flex w-full max-w-72 flex-col gap-1.5">
				<span className="text-xs uppercase tracking-widest text-muted-foreground">{t("users.form.name")}</span>
				<input
					autoFocus
					value={name}
					maxLength={PROFILE_NAME_MAX}
					onChange={(e) => setName(e.target.value)}
					placeholder={t("users.form.name.placeholder")}
					data-testid="profile-name"
					className="h-9 rounded-md border border-border bg-background px-3 font-prose text-(length:--lh-prose-size) text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-muted-foreground"
				/>
			</label>

			<div className="flex w-full max-w-72 flex-col gap-1.5">
				<span className="text-xs uppercase tracking-widest text-muted-foreground">{t("users.form.color")}</span>
				<div role="radiogroup" aria-label={t("users.form.color")} className="flex justify-between gap-2">
					{PROFILE_COLORS.map((c) => (
						<button
							key={c}
							type="button"
							role="radio"
							aria-checked={color === c}
							aria-label={t(`users.form.color.${c}`)}
							data-testid={`profile-color-${c}`}
							onClick={() => setColor(c)}
							className={cn(
								"size-7 rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-110",
								color === c && "ring-2 ring-foreground",
							)}
							style={{ backgroundImage: profileGradient(c) }}
						/>
					))}
				</div>
			</div>

			<div className="flex w-full max-w-72 flex-col gap-1.5">
				<label htmlFor={pinId} className="text-xs uppercase tracking-widest text-muted-foreground">
					{hasPin ? t("users.form.newPin") : t("users.form.pin")} <span className="normal-case tracking-normal text-muted-foreground/60">{t("users.form.optional")}</span>
				</label>
				<input
					id={pinId}
					type="password"
					inputMode="numeric"
					autoComplete="off"
					value={pin}
					maxLength={8}
					onChange={(e) => {
						setPin(e.target.value.replace(/\D/g, ""));
						setRemovePin(false);
					}}
					placeholder={hasPin ? t("users.form.pin.keepPlaceholder") : t("users.form.pin.placeholder")}
					data-testid="profile-pin"
					className="h-9 rounded-md border border-border bg-background px-3 font-ui text-sm tracking-[0.3em] text-foreground outline-none placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:border-muted-foreground"
				/>
				{hasPin && (
					<label className="flex items-center gap-2 text-xs text-muted-foreground">
						<input
							type="checkbox"
							checked={removePin}
							onChange={(e) => {
								setRemovePin(e.target.checked);
								if (e.target.checked) setPin("");
							}}
							data-testid="profile-remove-pin"
						/>
						{t("users.form.removePin")}
					</label>
				)}
			</div>

			{language && (
				<div className="flex w-full max-w-72 flex-col gap-1.5">
					<label htmlFor={languageId} className="text-xs uppercase tracking-widest text-muted-foreground">
						{t("users.form.language")}
					</label>
					<select
						id={languageId}
						value={language}
						onChange={(e) => {
							if (isAppLanguage(e.target.value)) setLanguage(e.target.value);
						}}
						data-testid="profile-language"
						className="h-9 rounded-md border border-border bg-background px-3 font-ui text-sm text-foreground outline-none focus:border-muted-foreground"
					>
						{APP_LANGUAGES.map((lang) => (
							<option key={lang.id} value={lang.id}>
								{lang.label}
							</option>
						))}
					</select>
				</div>
			)}

			{error && (
				<p role="alert" data-testid="profile-error" className="text-xs text-red-400">
					{error}
				</p>
			)}

			<div className="flex gap-2">
				{onCancel && (
					<button
						type="button"
						onClick={onCancel}
						className="h-8 rounded-md px-4 font-ui text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					>
						{t("users.form.cancel")}
					</button>
				)}
				<button
					type="submit"
					disabled={busy}
					data-testid="profile-submit"
					className="h-8 rounded-md bg-primary px-4 font-ui text-xs uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
				>
					{submitLabel}
				</button>
			</div>
		</form>
	);
}

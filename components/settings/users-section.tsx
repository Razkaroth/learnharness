"use client";
/**
 * The Users section (multi-user profiles, 2026-10-27). Everyone edits
 * their own name, color, and PIN. The admin also adds, edits, and deletes
 * profiles and turns restricted sign-ups on or off. Install-wide data
 * (/api/users), never the profile's settings record.
 */

import { useCallback, useEffect, useState } from "react";
import type { PublicProfile, UsersSnapshot } from "@/src/core";
import { ProfileAvatar } from "@/components/profile-avatar";
import { ProfileForm, type ProfileFormValues } from "@/components/profile-form";
import { useT, type Translate } from "@/components/i18n";
import { SettingsGroup, SettingsRow, Toggle } from "./controls.tsx";

type Editing = { kind: "none" } | { kind: "edit"; id: string } | { kind: "add" } | { kind: "delete"; id: string };

async function errorOf(res: Response, t: Translate): Promise<string> {
	const body = (await res.json().catch(() => ({}))) as { error?: string };
	return body.error ?? t("users.error.generic", { status: res.status });
}

const ROW_BUTTON =
	"rounded-sm px-2 py-1 font-ui text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

export function UsersSection() {
	const t = useT();
	const [snapshot, setSnapshot] = useState<UsersSnapshot | null | undefined>(undefined);
	const [editing, setEditing] = useState<Editing>({ kind: "none" });
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		try {
			const res = await fetch("/api/users", { cache: "no-store" });
			setSnapshot(res.ok ? ((await res.json()) as UsersSnapshot) : null);
		} catch {
			setSnapshot(null);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	if (snapshot === undefined) return <p className="text-xs text-muted-foreground/70">{t("users.settings.loading")}</p>;
	if (snapshot === null || !snapshot.current)
		return <p className="text-xs text-muted-foreground/70">{t("users.settings.loadFailed")}</p>;

	const me = snapshot.current;
	const isAdmin = me.role === "admin";

	const save = async (id: string, values: ProfileFormValues): Promise<string | null> => {
		const res = await fetch(`/api/users/${id}`, {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(values),
		});
		if (!res.ok) return errorOf(res, t);
		setEditing({ kind: "none" });
		await refresh();
		return null;
	};

	const add = async (values: ProfileFormValues): Promise<string | null> => {
		const res = await fetch("/api/users", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: values.name, color: values.color, pin: values.pin ?? undefined }),
		});
		if (!res.ok) return errorOf(res, t);
		setEditing({ kind: "none" });
		await refresh();
		return null;
	};

	const remove = async (id: string) => {
		setError(null);
		const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
		if (!res.ok) setError(await errorOf(res, t));
		setEditing({ kind: "none" });
		await refresh();
	};

	const setRestricted = async (restricted: boolean) => {
		setError(null);
		const res = await fetch("/api/users/host", {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ restrictedSignups: restricted }),
		});
		if (!res.ok) setError(await errorOf(res, t));
		await refresh();
	};

	const editForm = (p: PublicProfile) => (
		<div className="rounded-md border border-border p-4">
			<ProfileForm
				compact
				initial={{ name: p.name, color: p.color }}
				hasPin={p.hasPin}
				submitLabel={t("users.settings.save")}
				onSubmit={(values) => save(p.id, values)}
				onCancel={() => setEditing({ kind: "none" })}
			/>
		</div>
	);

	return (
		<div data-testid="users-section">
			{error && (
				<p role="alert" className="mb-3 rounded-sm border border-red-500/40 px-3 py-2 text-xs text-red-500">
					{error}
				</p>
			)}

			<SettingsGroup label={t("users.settings.me")} testid="users-me">
				{editing.kind === "edit" && editing.id === me.id ? (
					editForm(me)
				) : (
					<ProfileRow profile={me}>
						<button type="button" className={ROW_BUTTON} data-testid="users-edit-me" onClick={() => setEditing({ kind: "edit", id: me.id })}>
							{t("users.settings.edit")}
						</button>
					</ProfileRow>
				)}
			</SettingsGroup>

			{isAdmin && (
				<>
					<SettingsGroup label={t("users.settings.signups")} testid="users-signups">
						<SettingsRow label={t("users.settings.restricted")} hint={t("users.settings.restricted.hint")}>
							<Toggle
								label={t("users.settings.restricted.aria")}
								testid="toggle-restricted-sign-ups"
								checked={snapshot.host.restrictedSignups}
								onChange={(next) => void setRestricted(next)}
							/>
						</SettingsRow>
					</SettingsGroup>

					<SettingsGroup label={t("users.settings.profiles")} testid="users-profiles">
						{snapshot.profiles.map((p) =>
							editing.kind === "edit" && editing.id === p.id && p.id !== me.id ? (
								<div key={p.id}>{editForm(p)}</div>
							) : editing.kind === "delete" && editing.id === p.id ? (
								<div key={p.id} className="flex items-center justify-between gap-3 rounded-md border border-red-500/40 px-3 py-2" data-testid="users-confirm-delete">
									<span className="text-xs text-foreground">
										{t("users.settings.deleteConfirm", { name: p.name })}
									</span>
									<span className="flex shrink-0 gap-1">
										<button type="button" className={ROW_BUTTON} onClick={() => setEditing({ kind: "none" })}>
											{t("users.form.cancel")}
										</button>
										<button
											type="button"
											data-testid="users-delete-confirm"
											className="rounded-sm px-2 py-1 font-ui text-xs text-red-400 transition-colors hover:bg-accent"
											onClick={() => void remove(p.id)}
										>
											{t("users.settings.delete")}
										</button>
									</span>
								</div>
							) : (
								<ProfileRow key={p.id} profile={p}>
									{p.id !== me.id && (
										<button type="button" className={ROW_BUTTON} data-testid={`users-edit-${p.id}`} onClick={() => setEditing({ kind: "edit", id: p.id })}>
											{t("users.settings.edit")}
										</button>
									)}
									{p.role !== "admin" && (
										<button type="button" className={ROW_BUTTON} data-testid={`users-delete-${p.id}`} onClick={() => setEditing({ kind: "delete", id: p.id })}>
											{t("users.settings.deleteMenu")}
										</button>
									)}
								</ProfileRow>
							),
						)}
						{editing.kind === "add" ? (
							<div className="rounded-md border border-border p-4">
								<ProfileForm compact submitLabel={t("users.select.add")} onSubmit={add} onCancel={() => setEditing({ kind: "none" })} />
							</div>
						) : (
							<button
								type="button"
								data-testid="users-add"
								onClick={() => setEditing({ kind: "add" })}
								className="self-start rounded-sm px-2 py-1 font-ui text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
							>
								{t("users.settings.add")}
							</button>
						)}
					</SettingsGroup>
				</>
			)}
		</div>
	);
}

function ProfileRow({ profile, children }: { profile: PublicProfile; children?: React.ReactNode }) {
	const t = useT();
	return (
		<div className="flex items-center gap-3 py-1" data-testid={`users-row-${profile.id}`}>
			<ProfileAvatar name={profile.name} color={profile.color} className="size-8 text-xs" />
			<span className="min-w-0 flex-1">
				<span className="block truncate font-prose text-(length:--lh-prose-size)">{profile.name}</span>
				<span className="block text-xs text-muted-foreground/70">
					{profile.role === "admin" ? t("users.role.admin") : t("users.role.member")}
					{profile.hasPin ? t("users.role.hasPin") : ""}
				</span>
			</span>
			<span className="flex shrink-0 gap-1">{children}</span>
		</div>
	);
}

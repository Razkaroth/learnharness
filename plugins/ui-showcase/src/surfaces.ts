import type { PluginUi, PluginSurfaceTarget, PluginSurfaceProps, PluginWidgetHandle } from "learnharness-plugin-api";
import { Scope, button, element, example, family, note, readout, row } from "./dom.ts";
import { t } from "./i18n.ts";

/** Shared ordinary overlays, always using the real host stack and keyboard policy. */
export function mountOverlayExamples(ui: PluginUi, body: HTMLElement, life: Scope, kind: "menus" | "dialogs"): void {
  let selection: string | null = null;
  let lastCallback = "none";
  let opens = 0;
  const show = readout(body, kind);
  const render = () => show({ selection, opens, lastCallback });
  if (kind === "menus") {
    note(body, t("menus.note"));
    const actions = row(body);
    for (const preferredSide of ["down", "up"] as const) {
      const anchor = example(actions, `menu-${preferredSide}`);
      life.widget(ui.mountButton(anchor, { label: t("menus.open", { side: preferredSide }), variant: "outline", onClick() {
        if (life.signal.aborted) return;
        opens++; lastCallback = `openMenu (${preferredSide})`; render();
        life.widget(ui.openMenu(anchor.querySelector("button") ?? anchor, {
          label: t("menus.label", { side: preferredSide }), preferredSide,
          items: [
            { key: "first", label: t("menus.first"), onSelect() { selection = "first"; lastCallback = "first.onSelect"; render(); } },
            { key: "disabled", label: t("menus.disabled"), disabled: true, onSelect() { throw new Error("Disabled menu item must not run"); } },
            { key: "second", label: t("menus.second"), onSelect() { selection = "second"; lastCallback = "second.onSelect"; render(); } },
          ],
          onClose() { if (!life.signal.aborted) { lastCallback = "menu.onClose"; render(); } },
        }, { signal: life.signal }));
      } }, { signal: life.signal }));
    }
  } else {
    note(body, t("dialogs.note"));
    const actions = row(body);
    for (const mode of ["ordinary", "long", "nested"] as const) {
      button(ui, actions, life, `dialog-${mode}`, { label: t(`dialogs.open.${mode}`), variant: "outline", onClick() {
        opens++; lastCallback = `openDialog (${mode})`; render();
        openDialog(ui, life, mode, () => { if (!life.signal.aborted) { lastCallback = `${mode}.onClose`; render(); } });
      } });
    }
  }
  render();
}

function openDialog(ui: PluginUi, owner: Scope, mode: "ordinary" | "long" | "nested", onClose: () => void): void {
  owner.widget(ui.openDialog({
    title: t(`dialogs.title.${mode}`),
    content(container, signal) {
      const life = new Scope(signal);
      if (signal.aborted) return life.dispose;
      const root = element("div", undefined, "ui-showcase ui-showcase-overlay");
      root.dataset.showcase = `dialog-${mode}`;
      container.append(root); life.own(() => root.remove());
      note(root, t("dialogs.content"));
      retainedField(ui, root, life, `dialog-${mode}`);
      if (mode === "ordinary") knowledgeExample(ui, root, life, "dialog-ordinary-knowledge");
      if (mode === "long") {
        for (let index = 1; index <= 32; index++) {
          note(root, t("dialogs.paragraph", { n: index }));
        }
      }
      if (mode !== "ordinary") {
        button(ui, root, life, `dialog-${mode}-child`, { label: t("dialogs.child"), onClick() { openDialog(ui, life, "ordinary", () => {}); } });
      }
      return life.dispose;
    },
    onClose,
  }, { signal: owner.signal }));
}

function retainedField(ui: PluginUi, root: HTMLElement, life: Scope, id: string): void {
  let value = t("retained.initial");
  let lastCallback = "none";
  const show = readout(root, id);
  const schema = () => ({ rows: [{ key: "retained", type: "text" as const, label: t("retained.label"), description: t("retained.description"), value,
    onChange(next: string) { if (!life.signal.aborted) { value = next; lastCallback = "retained.onChange"; field.update(schema()); render(); } },
  }] });
  const field = life.widget(ui.mountSettingsRows(example(root, `${id}-retained-field`), schema(), { signal: life.signal }));
  function render() { show({ value, lastCallback }); }
  render();
}

function knowledgeExample(ui: PluginUi, root: HTMLElement, life: Scope, id: string): void {
  note(root, t("knowledge.note"));
  let value: readonly string[] = [];
  const show = readout(root, id);
  const picker = life.widget(ui.mountKnowledgePicker(example(root, `${id}-picker`, t("knowledge.label")), {
    value, onChange(next) {
      if (life.signal.aborted) return;
      value = [...next]; picker.update({ value }); show({ value });
    },
  }, { signal: life.signal }));
  show({ value });
}

/** The target is passed through unchanged from the native action context. */
export function openSurfaceDemo(ui: PluginUi, target: PluginSurfaceTarget, signal: AbortSignal, onClose?: () => void): PluginWidgetHandle<PluginSurfaceProps> {
  return openDemo(ui, signal, target, onClose);
}

/** Direct opening captures the current page body through the public host API. */
export function openPageSurfaceDemo(ui: PluginUi, signal: AbortSignal, onClose: () => void): PluginWidgetHandle<PluginSurfaceProps> {
  return openDemo(ui, signal, undefined, onClose);
}

function openDemo(ui: PluginUi, signal: AbortSignal, target?: PluginSurfaceTarget, onClose?: () => void): PluginWidgetHandle<PluginSurfaceProps> {
  const open = (surface: PluginSurfaceProps, lifetime: AbortSignal) => target === undefined
    ? ui.openSurface(surface, { signal: lifetime })
    : ui.openSurface(target, surface, { signal: lifetime });
  let handle: PluginWidgetHandle<PluginSurfaceProps> | undefined;
  handle = open({
    title: t("action.surface"),
    content(container, contentSignal) {
      const scope = new Scope(contentSignal);
      if (contentSignal.aborted) return scope.dispose;
      const root = element("div", undefined, "ui-showcase ui-showcase-surface");
      root.dataset.showcase = "surface";
      container.append(root); scope.own(() => root.remove());
      family(ui, root, scope, "surfaces", t("family.surfaceExamples"), (body, life) => {
        note(body, t("surface.note"));
        retainedField(ui, body, life, "surface-parent");
        knowledgeExample(ui, body, life, "surface-knowledge");
        let opened = 0; let closed = 0; let lastCallback = "none";
        let background: NonNullable<PluginSurfaceProps["background"]> = "dimmed";
        handle?.update({ background });
        const show = readout(body, "surfaces");
        const render = () => show({ background, nestedOpened: opened, nestedClosed: closed, lastCallback });
        const backgrounds = row(body);
        for (const preset of ["dimmed", "opaque"] as const) {
          button(ui, backgrounds, life, `surface-background-${preset}`, { label: t(`surface.background.${preset}`), variant: "outline", onClick() {
            if (life.signal.aborted) return;
            background = preset; handle?.update({ background }); lastCallback = `surface.update (${preset})`; render();
          } });
        }
        button(ui, body, life, "surface-nested", { label: t("surface.nested"), onClick() {
          if (life.signal.aborted) return;
          opened++; lastCallback = target === undefined ? "openSurface (current page body)" : "openSurface (same opaque native target)"; render();
          life.widget(open({
            title: t("surface.nestedTitle"),
            content(childContainer, childSignal) {
              const child = new Scope(childSignal);
              if (childSignal.aborted) return child.dispose;
              const content = element("div", undefined, "ui-showcase ui-showcase-surface");
              content.dataset.showcase = "surface-nested";
              childContainer.append(content); child.own(() => content.remove());
              note(content, t("surface.nestedNote"));
              retainedField(ui, content, child, "surface-child");
              family(ui, content, child, "menus", t("family.menusAbove"), (area, lifetime) => mountOverlayExamples(ui, area, lifetime, "menus"));
              family(ui, content, child, "dialogs", t("family.dialogsAbove"), (area, lifetime) => mountOverlayExamples(ui, area, lifetime, "dialogs"));
              return child.dispose;
            },
            onClose() { if (!life.signal.aborted) { closed++; lastCallback = "nested surface.onClose"; render(); } },
          }, life.signal));
        } });
        family(ui, body, life, "menus", t("family.menusAbove"), (area, lifetime) => mountOverlayExamples(ui, area, lifetime, "menus"));
        family(ui, body, life, "dialogs", t("family.dialogsAbove"), (area, lifetime) => mountOverlayExamples(ui, area, lifetime, "dialogs"));
        render();
      });
      return scope.dispose;
    },
    onClose,
  }, signal);
  return handle;
}

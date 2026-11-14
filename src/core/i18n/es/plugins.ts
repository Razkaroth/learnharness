import type { plugins as en } from "../en/plugins.ts";

export const plugins: Record<keyof typeof en, string> = {

	// Settings → Core/Community plugins
	"plugins.trustWarning": "Activa solo plugins en los que confíes. Los plugins ejecutan código local de confianza con amplio acceso a archivos y a la red; no están aislados. Un plugin defectuoso puede requerir reiniciar LearnHarness.",
	"plugins.install.title": "Cómo instalar un plugin",
	"plugins.install.copy": "Clona o copia el plugin en el directorio de abajo, usando su ID de plugin como nombre de carpeta.",
	"plugins.install.build": "Para proyectos con código fuente, sigue la instalación de dependencias del repositorio y ejecuta `npm run build`. Los paquetes precompilados ya contienen `dist/manifest.json` y no necesitan compilarse.",
	"plugins.install.enable": "Actualiza la lista y luego activa el plugin. Los plugins nuevos están desactivados por defecto.",
	"plugins.install.restart": "Reinicia LearnHarness después de cambiar código ya cargado. Conserva `data/` junto a `dist/` al actualizar.",
	"plugins.authoring.title": "Crea un plugin",
	"plugins.authoring.body": "Descarga la skill de creación de plugins para tu agente de programación.",
	"plugins.authoring.download": "Descargar skill de creación",
	"plugins.directory": "Directorio de plugins",
	"plugins.refresh": "Actualizar plugins",
	"plugins.loading": "Cargando plugins…",
	"plugins.emptyCore": "No hay plugins principales disponibles.",
	"plugins.emptyCommunity": "No hay plugins de la comunidad instalados.",
	"plugins.status.saving": "Guardando…",
	"plugins.status.error": "Error",
	"plugins.status.loading": "Cargando…",
	"plugins.status.enabled": "Activado",
	"plugins.status.disabled": "Desactivado",
	"plugins.settingsFor": "Ajustes de {name}",
	"plugins.enable": "Activar {name}",
	"plugins.settings.loading": "Cargando ajustes del plugin…",
	"plugins.settings.failed": "No se pudieron cargar los ajustes del plugin.",
	"plugins.settings.none": "No hay ajustes disponibles.",
	"plugins.settings.label": "Ajustes de {name}",

	// Plugin view page
	"plugins.view.notInstalled": "El plugin no está instalado.",
	"plugins.view.disabled": "Este plugin está desactivado.",
	"plugins.view.unavailable": "Esta vista del plugin no está disponible.",
	"plugins.view.fallbackTitle": "Plugin",
	"plugins.view.settings": "Ajustes del plugin",
	"plugins.view.loading": "Cargando plugin…",
	"plugins.view.backHome": "Volver al inicio",

	// Plugin chrome
	"plugins.chrome.graphActions": "Acciones de plugins en el grafo",
	"plugins.chrome.moreActions": "Más acciones de plugins",

	"plugins.dialog.close": "Cerrar diálogo",

	// Plugin questions and problems
	"plugins.question.preparing": "Preparando pregunta…",
	"plugins.question.unavailable": "Pregunta no disponible",
	"plugins.question.dismissed": "Pregunta descartada",
	"plugins.question.dismiss": "Descartar pregunta",
	"plugins.question.thinking": "Tu razonamiento",
	"plugins.problem.preparing": "Preparando problema…",
	"plugins.problem.unavailable": "Problema no disponible",
	"plugins.renderer.codeBlock": "Bloque de código de plugin ({language})",
	"plugins.renderer.tool": "Herramienta de plugin ({toolName})",

	// Plugin action shortcuts (Settings → Keyboard)
	"plugins.shortcut.scope.app": "En toda la app",
	"plugins.shortcut.scope.teaching": "Enseñanza",
	"plugins.shortcut.scope.practice": "Práctica",
	"plugins.shortcut.scope.views": "Vistas: {views}",
	"plugins.shortcut.invalid": "No es un atajo permitido para acciones de plugins",
	"plugins.shortcut.conflictCore": "Choca con el atajo de la app: {label}",
	"plugins.shortcut.conflictPlugin": "Choca con {plugin} · {name}",
	"plugins.shortcut.inactive": "Inactivo: {reason}",
	"plugins.shortcut.unavailable": "Esta acción del plugin ya no está disponible.",

	// Misc host surfaces
	"plugins.settings.outOfRange": "El valor está fuera del rango permitido.",
	"plugins.composer.placeholder": "Mensaje…",
	"plugins.worker.details": "Detalles de la tarea",
	"plugins.worker.formatFailed": "Falló el formato del resultado: {error}",
	"plugins.worker.fallbackTitle": "Worker de plugin",
};

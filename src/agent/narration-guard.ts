import type { ToolCallHooks } from "@earendil-works/pi-agent-core";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import { QUESTION_TOOLS } from "../core/pending.ts";
import { SEND_TO_USER_TOOL, sendToUserText } from "../core/native-messages.ts";
import { sendToUserApplies } from "./tools/send-to-user.ts";
import { DEFAULT_LANGUAGE, type AppLanguage } from "../core/i18n.ts";

export const NARRATION_GUARD_MAX_BLOCKS = 2;

export const NARRATION_BLOCK_REASON =
	"This response contains narration but no delivered learner-facing prose. Write the explanation or commentary the learner needs through `send_to_user`, then retry this question. Deliver learner-facing content, not internal reasoning.";

export const SEND_TO_USER_DELIVERY_RULE =
	"## Delivering your prose\n\n" +
	"Deliver learner-facing prose through `send_to_user`; ordinary response text may be converted into summarized thinking instead of reaching the learner. " +
	"Send the complete explanation, example, or commentary before calling the accompanying question tool. " +
	"Question-only turns do not require an extra message. " +
	"A question whose response contains narration but no delivered prose may be rejected so you can deliver the missing explanation and retry.";

const SEND_TO_USER_DELIVERY_RULE_ES =
	"## Cómo entregar tu prosa\n\n" +
	"Entrega la prosa dirigida al aprendiz mediante `send_to_user`; el texto de respuesta ordinario puede convertirse en un resumen del razonamiento en lugar de llegar al aprendiz. " +
	"Envía la explicación, el ejemplo o el comentario completos antes de llamar a la herramienta de pregunta que los acompaña. " +
	"Los turnos que solo contienen una pregunta no requieren un mensaje adicional. " +
	"Una pregunta cuya respuesta contiene narración pero ninguna prosa entregada puede ser rechazada para que entregues la explicación que falta y vuelvas a intentarlo.";

/** The delivery rule in the app language (absent = English). */
export function sendToUserDeliveryRule(language: AppLanguage = DEFAULT_LANGUAGE): string {
	return language === "es" ? SEND_TO_USER_DELIVERY_RULE_ES : SEND_TO_USER_DELIVERY_RULE;
}

export function narrationGuardApplies(
	kind: string,
	model: { provider: string; id: string },
	toolsOverridden: boolean,
): boolean {
	return kind === "teacher" && sendToUserApplies(kind, model, toolsOverridden);
}

export function isNarrationBlock(block: { type: string; thinkingSignature?: string }): boolean {
	if (block.type !== "thinking" || typeof block.thinkingSignature !== "string") return false;
	try {
		return Buffer.from(block.thinkingSignature, "base64").subarray(0, 60).includes("narration");
	} catch {
		return false;
	}
}

export function questionLacksDeliveredProse(message: AssistantMessage, toolName: string, delivered = false): boolean {
	if (!(QUESTION_TOOLS as readonly string[]).includes(toolName)) return false;
	if (!message.content.some(isNarrationBlock as (b: AssistantMessage["content"][number]) => boolean)) return false;
	return !delivered && !message.content.some((b) => b.type === "text" && b.text.trim().length > 0);
}

export function makeNarrationGuard(): ToolCallHooks {
	let blocked = 0;
	// The sequential output/question tools run in call order. Credit only a
	// successful output already executed for THIS response, never a later
	// call, an older lesson, or a failed/aborted output. State is run-local.
	const delivered = new WeakSet<AssistantMessage>();
	return {
		beforeToolCall: async ({ assistantMessage, toolCall }) => {
			if (blocked >= NARRATION_GUARD_MAX_BLOCKS) return undefined;
			if (!questionLacksDeliveredProse(assistantMessage, toolCall.name, delivered.has(assistantMessage))) return undefined;
			blocked++;
			return { block: true, reason: NARRATION_BLOCK_REASON };
		},
		afterToolCall: async ({ assistantMessage, toolCall, result, isError }) => {
			if (toolCall.name === SEND_TO_USER_TOOL && !isError && !result.isError && sendToUserText(toolCall) !== undefined) {
				delivered.add(assistantMessage);
			}
			return undefined;
		},
	};
}

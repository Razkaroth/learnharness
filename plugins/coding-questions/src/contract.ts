import type { PluginProblemTypeDefinition, PluginQuestionTypeDefinition } from "learnharness-plugin-api";
import { t } from "./i18n.ts";
import type { CodingTests } from "./test-result.ts";

export const QUESTION_TYPE_ID = "code";
export const PROBLEM_TYPE_ID = "code";
export type CodingPayload = {
  language: string;
  starterCode?: string;
  tests: CodingTests;
};
export type CodingQuestionPayload = CodingPayload & { modelSolution: string };

export function teacherInstructions(translate: typeof t = t): string {
  return translate("instructions.teacher") + translate("instructions.execution");
}

export function practiceAgentInstructions(translate: typeof t = t): string {
  return translate("instructions.practice") + translate("instructions.execution") + translate("instructions.practice.after");
}

/** English defaults for unit fixtures that inspect text without activating. */
export const instructions = teacherInstructions();
export const practiceInstructions = practiceAgentInstructions();

export function buildDefinition(translate: typeof t = t) {
  return {
    id: QUESTION_TYPE_ID,
    label: translate("question.label"),
    contractVersion: 1,
    showThinking: true,
    questionSchema: {
      type: "object",
      properties: {
        language: {
          type: "string",
          pattern: "\\S",
          description: translate("schema.language"),
        },
        starterCode: {
          type: "string",
          description: translate("schema.starterCode"),
        },
        modelSolution: {
          type: "string",
          pattern: "\\S",
          description: translate("schema.modelSolution"),
        },
        tests: {
          type: "object",
          description: translate("schema.tests"),
          properties: {
            program: { type: "string", pattern: "\\S", description: translate("schema.tests.program") },
            args: { type: "array", items: { type: "string" }, description: translate("schema.tests.args") },
            code: { type: "string", pattern: "\\S", description: translate("schema.tests.code") },
          },
          required: ["program", "args", "code"],
          additionalProperties: false,
        },
      },
      required: ["language", "tests", "modelSolution"],
      additionalProperties: false,
    },
    answerSchema: { type: "string", pattern: "\\S" },
    teach: {
      toolName: "coding_question",
      description: translate("question.teach"),
    },
  } satisfies PluginQuestionTypeDefinition;
}

export function buildProblemDefinition(translate: typeof t = t) {
  const question = buildDefinition(translate);
  return {
    id: PROBLEM_TYPE_ID,
    label: translate("problem.label"),
    contractVersion: 1,
    tool: {
      toolName: "coding_problem",
      description: translate("problem.tool"),
    },
    problemSchema: {
      type: "object",
      properties: {
        language: question.questionSchema.properties.language,
        starterCode: question.questionSchema.properties.starterCode,
        tests: question.questionSchema.properties.tests,
      },
      required: ["language", "tests"],
      additionalProperties: false,
    },
    submissionSchema: question.answerSchema,
  } satisfies PluginProblemTypeDefinition;
}

/** English defaults for schema Compile() and registration-shape fixtures. */
export const definition = buildDefinition();
export const problemDefinition = buildProblemDefinition();

/** Narrow the public plain-schema payload without relying on a TypeBox-only static brand. */
export function readTests(payload: unknown): CodingTests {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Coding question payload is unavailable.");
  const tests = (payload as Record<string, unknown>).tests;
  if (tests === null || typeof tests !== "object" || Array.isArray(tests)) throw new Error("Coding question test recipe is unavailable.");
  const recipe = tests as Record<string, unknown>;
  if (typeof recipe.program !== "string" || !/\S/.test(recipe.program) || !Array.isArray(recipe.args) || !recipe.args.every(arg => typeof arg === "string") || typeof recipe.code !== "string" || !/\S/.test(recipe.code)) throw new Error("Coding question test recipe is invalid.");
  return { program: recipe.program, args: recipe.args, code: recipe.code };
}

/** Readiness is not correctness, and must never trim the actual answer. */
export function isReady(code: string): boolean {
  return /\S/.test(code);
}

export function normalizeLineEndings(code: string): string {
  return code.replace(/\r\n?/g, "\n");
}

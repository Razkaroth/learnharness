import type { PluginBackendContext } from "learnharness-plugin-api";
import { buildDefinition, buildProblemDefinition, practiceAgentInstructions, readTests, teacherInstructions } from "./contract.ts";
import { useI18n, t } from "./i18n.ts";
import { runTests } from "./runner.ts";

export function activate(ctx: PluginBackendContext): () => void {
  useI18n(ctx.i18n);
  const unregisterQuestion = ctx.registerQuestionType({
    ...buildDefinition(t),
    gradeAnswer(context) {
      if (typeof context.answer !== "string") throw new Error("Coding answers must be strings.");
      return runTests({
        dataDirectory: ctx.dataDirectory,
        questionId: context.questionId,
        answer: context.answer,
        tests: readTests(context.input.payload),
        signal: context.signal,
      });
    },
  });
  const unregisterProblem = ctx.registerProblemType({
    ...buildProblemDefinition(t),
    processSubmission(context) {
      if (typeof context.submission !== "string") throw new Error("Coding submissions must be strings.");
      return runTests({
        dataDirectory: ctx.dataDirectory,
        questionId: context.problemId,
        answer: context.submission,
        tests: readTests(context.input.payload),
        signal: context.signal,
      });
    },
  });
  const unregisterPracticeInstructions = ctx.registerInstructions({ agents: ["practice"], text: practiceAgentInstructions(t) });
  const unregisterInstructions = ctx.registerInstructions({ agents: ["teacher"], text: teacherInstructions(t) });
  return () => {
    unregisterInstructions();
    unregisterPracticeInstructions();
    unregisterProblem();
    unregisterQuestion();
  };
}

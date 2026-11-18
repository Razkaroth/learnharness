'use strict';

const { t } = require('./i18n.cjs');

const compose = sourceInstructions => [
  t('generation.section.sourceSpecific'), sourceInstructions,
  t('generation.section.cardWriting'), t('generation.cardWriting'),
  t('generation.section.inputSafety'), t('generation.inputSafety'),
  t('generation.section.outputProtocol'), t('generation.outputProtocol'),
].join('\n\n');

// Keep task-specific payloads separate; neither path serializes source data into
// its system instructions. JSON quoting remains unchanged by prompt composition.
const graphPromptFor = input => t('generation.graphPrompt', {
  json: JSON.stringify({
    targets: input.targets,
    propositions: input.propositions,
    chains: input.chains,
    cards: input.cards.map(({ propositionId, active }) => ({ propositionId, active })),
  }),
});
const filePromptFor = input => t('generation.filePrompt', { json: JSON.stringify(input) });

module.exports = {
  get cardWriting() { return t('generation.cardWriting'); },
  get inputSafety() { return t('generation.inputSafety'); },
  get outputProtocol() { return t('generation.outputProtocol'); },
  get graphSourceInstructions() { return t('generation.graphSourceInstructions'); },
  get fileSourceInstructions() { return t('generation.fileSourceInstructions'); },
  get graphInstructions() { return compose(t('generation.graphSourceInstructions')); },
  get fileInstructions() { return compose(t('generation.fileSourceInstructions')); },
  graphPromptFor,
  filePromptFor,
};

/**
 * Pipeline task stubs — placeholders for the 6 stages.
 *
 * These exist so the Trigger.dev project has all the task IDs registered
 * from the start. Each stage's body lands in a follow-up phase per the
 * pipeline v0.1 design doc.
 *
 * DO NOT implement here. Each stage will get its own file when work begins:
 *   ./brief.ts
 *   ./copy.ts
 *   ./visual-prompt.ts
 *   ./render.ts
 *   ./composite.ts
 *   ./bundle.ts
 */

import { task } from '@trigger.dev/sdk/v3';

const notImplemented = (stage: string) => async () => {
  throw new Error(`[pipeline] stage "${stage}" not implemented yet`);
};

export const briefTask = task({
  id: 'pipeline.brief',
  maxDuration: 30,
  run: notImplemented('brief'),
});

export const copyTask = task({
  id: 'pipeline.copy',
  maxDuration: 90,
  run: notImplemented('copy'),
});

export const visualPromptTask = task({
  id: 'pipeline.visual-prompt',
  maxDuration: 90,
  run: notImplemented('visual-prompt'),
});

export const renderTask = task({
  id: 'pipeline.render',
  maxDuration: 600,
  run: notImplemented('render'),
});

export const compositeTask = task({
  id: 'pipeline.composite',
  maxDuration: 300,
  run: notImplemented('composite'),
});

export const bundleTask = task({
  id: 'pipeline.bundle',
  maxDuration: 60,
  run: notImplemented('bundle'),
});

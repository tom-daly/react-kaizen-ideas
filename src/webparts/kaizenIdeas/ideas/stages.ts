/*
 * What an idea's stage means for what people can do with it. Nothing in here
 * talks to the site.
 */
import { IIdea } from './types';
import { STAGES } from '../setup/schema';

/** The stages where an idea has finished, one way or the other. */
export const CLOSED_STAGES = ['Done', 'Not going ahead'];

/** Still going: not Done and not Not going ahead. A stage added by hand counts as still going. */
export const isOpen = (stage: string): boolean => CLOSED_STAGES.indexOf(stage) < 0;

/** People can vote, and take a vote back, while an idea is still going. */
export const canVote = (stage: string): boolean => isOpen(stage);

/** The person who shared an idea can change or delete it until a reviewer has picked it up. */
export const canChangeOwn = (idea: IIdea, myId: number): boolean =>
  idea.author.id === myId && idea.stage === STAGES[0];

/** How a stage's badge looks. */
export type StageTone = 'new' | 'review' | 'progress' | 'done' | 'stopped' | 'other';

const TONES: Record<string, StageTone> = {
  Submitted: 'new',
  'Under review': 'review',
  'In progress': 'progress',
  Done: 'done',
  'Not going ahead': 'stopped'
};

export const stageTone = (stage: string): StageTone => TONES[stage] || 'other';

/** The stages a reviewer can pick: the tool's own, then any added by hand, and the idea's own if it is neither. */
export function stageChoices(columnChoices: string[], current: string): string[] {
  const out = STAGES.slice();
  columnChoices.concat(current).forEach(s => { if (s && out.indexOf(s) < 0) out.push(s); });
  return out;
}

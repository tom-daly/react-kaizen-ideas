/*
 * An idea as someone types it in, the checks before it saves, and the review
 * a reviewer types in. Nothing in here talks to the site.
 */
import { IIdea, IPerson } from './types';
import { IDEA_FORM } from '../strings/form';

/** The longest an idea's name can be: SharePoint's limit for a Title. */
export const TITLE_MAX = 255;

export interface IIdeaDraft {
  title: string;
  problem: string;
  proposal: string;
  benefit: string;
  area: string;
}

export const blankDraft = (area: string): IIdeaDraft =>
  ({ title: '', problem: '', proposal: '', benefit: '', area });

export const draftFromIdea = (idea: IIdea): IIdeaDraft => ({
  title: idea.title,
  problem: idea.problem,
  proposal: idea.proposal,
  benefit: idea.benefit,
  area: idea.area
});

/** The draft with the spaces round each answer taken off, as it saves. */
export const tidyDraft = (d: IIdeaDraft): IIdeaDraft => ({
  title: d.title.trim(),
  problem: d.problem.trim(),
  proposal: d.proposal.trim(),
  benefit: d.benefit.trim(),
  area: d.area.trim()
});

export type DraftErrors = Partial<Record<keyof IIdeaDraft, string>>;

/** What has to be put right before it can save. Empty when it's fine. */
export function draftErrors(d: IIdeaDraft): DraftErrors {
  const t = tidyDraft(d);
  const errors: DraftErrors = {};
  if (!t.title) errors.title = IDEA_FORM.titleNeeded;
  else if (t.title.length > TITLE_MAX) errors.title = IDEA_FORM.titleTooLong(TITLE_MAX);
  if (!t.problem) errors.problem = IDEA_FORM.problemNeeded;
  return errors;
}

export const hasErrors = (e: DraftErrors): boolean => Object.keys(e).length > 0;

/** Whether anything differs, ignoring spaces round the answers. */
export function draftChanged(a: IIdeaDraft, b: IIdeaDraft): boolean {
  const x = tidyDraft(a);
  const y = tidyDraft(b);
  return x.title !== y.title || x.problem !== y.problem || x.proposal !== y.proposal ||
    x.benefit !== y.benefit || x.area !== y.area;
}

/** The row to write to the ideas list. */
export function ideaRow(d: IIdeaDraft): Record<string, string> {
  const t = tidyDraft(d);
  return { Title: t.title, Problem: t.problem, Proposal: t.proposal, Benefit: t.benefit, IdeaArea: t.area };
}

/* ---------------------------------------------------------------- review */

/** Who owns an idea in the review form: someone already on the site, or someone just found by the search. */
export interface IOwnerPick {
  /** Their ID on this site. Missing for someone the search found who has never been on it. */
  id?: number;
  /** How SharePoint knows them, for adding them to the site. Missing for someone already there. */
  login?: string;
  name: string;
  email: string;
}

export interface IReviewDraft {
  stage: string;
  owner?: IOwnerPick;
  note: string;
}

export const reviewFromIdea = (idea: IIdea): IReviewDraft => ({
  stage: idea.stage,
  owner: idea.owner ? { ...idea.owner } : undefined,
  note: idea.reviewNote
});

const sameOwner = (a: IOwnerPick | undefined, b: IOwnerPick | undefined): boolean =>
  !a || !b ? !a && !b : a.id !== undefined && b.id !== undefined ? a.id === b.id : a.login === b.login;

export const reviewChanged = (a: IReviewDraft, b: IReviewDraft): boolean =>
  a.stage !== b.stage || a.note.trim() !== b.note.trim() || !sameOwner(a.owner, b.owner);

/** The row to write, once the owner (if any) has an ID on the site. */
export const reviewRow = (r: IReviewDraft, ownerId: number | undefined): Record<string, unknown> =>
  ({ IdeaStatus: r.stage, IdeaOwnerId: ownerId === undefined ? null : ownerId, ReviewNote: r.note.trim() });

/** The idea as it is once the review saved, so the page can show it straight away. */
export const withReview = (idea: IIdea, r: IReviewDraft, owner: IPerson | undefined): IIdea =>
  ({ ...idea, stage: r.stage, owner, reviewNote: r.note.trim() });

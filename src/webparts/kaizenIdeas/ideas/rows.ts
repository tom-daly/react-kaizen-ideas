/*
 * Turning list rows into ideas and votes, and the columns to ask for. Nothing
 * in here talks to the site.
 */
import { IIdea, IPerson, IVote } from './types';
import { maybeNum, num, text } from './rowValues';
import { STAGES } from '../setup/schema';

/** The idea columns to read, people expanded. */
export const IDEA_SELECT = [
  'Id', 'Title', 'Problem', 'Proposal', 'Benefit', 'IdeaArea', 'IdeaStatus', 'ReviewNote', 'Created',
  'IdeaOwner/Id', 'IdeaOwner/Title', 'IdeaOwner/EMail',
  'Author/Id', 'Author/Title', 'Author/EMail'
];
export const IDEA_EXPAND = ['IdeaOwner', 'Author'];

/** The vote columns to read. */
export const VOTE_SELECT = ['Id', 'VoteIdeaId', 'AuthorId'];

export type Row = Record<string, unknown>;

/** A person column as REST hands it back, or undefined if it is empty. */
export function personFrom(v: unknown): IPerson | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const p = v as Row;
  const id = maybeNum(p.Id);
  if (id === undefined) return undefined;
  return { id, name: text(p.Title), email: text(p.EMail) };
}

export function ideaFrom(row: Row): IIdea {
  return {
    id: num(row.Id),
    title: text(row.Title),
    problem: text(row.Problem),
    proposal: text(row.Proposal),
    benefit: text(row.Benefit),
    area: text(row.IdeaArea),
    // Empty only if someone cleared it by hand; it is still at the start.
    stage: text(row.IdeaStatus) || STAGES[0],
    owner: personFrom(row.IdeaOwner),
    reviewNote: text(row.ReviewNote),
    author: personFrom(row.Author) || { id: 0, name: '', email: '' },
    created: text(row.Created)
  };
}

/** A vote row, or undefined if it points at no idea (someone emptied it by hand). */
export function voteFrom(row: Row): IVote | undefined {
  const ideaId = maybeNum(row.VoteIdeaId);
  if (ideaId === undefined) return undefined;
  return { id: num(row.Id), ideaId, voterId: num(row.AuthorId) };
}

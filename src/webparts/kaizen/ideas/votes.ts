/*
 * Counting votes. Each person counts once per idea, however many rows they
 * have for it — two clicks at once can leave two. Nothing in here talks to the
 * site.
 */
import { IVote } from './types';

/** The votes for one idea. */
export interface IIdeaVotes {
  /** How many different people back it. */
  count: number;
  /** The rows of the person looking, all of them, so taking a vote back clears every one. Empty if they haven't voted. */
  mine: number[];
}

export type Tally = Record<number, IIdeaVotes>;

const NONE: IIdeaVotes = { count: 0, mine: [] };

export function tallyVotes(votes: IVote[], myId: number): Tally {
  const voters: Record<number, Record<number, true>> = {};
  const tally: Tally = {};
  for (const v of votes) {
    const seen = voters[v.ideaId] || (voters[v.ideaId] = {});
    const t = tally[v.ideaId] || (tally[v.ideaId] = { count: 0, mine: [] });
    if (!seen[v.voterId]) {
      seen[v.voterId] = true;
      t.count++;
    }
    if (v.voterId === myId) t.mine.push(v.id);
  }
  return tally;
}

/** One idea's votes, none if nobody has voted. */
export const votesFor = (tally: Tally, ideaId: number): IIdeaVotes => tally[ideaId] || NONE;

/** Whether the person looking has voted for it. */
export const iVoted = (tally: Tally, ideaId: number): boolean => votesFor(tally, ideaId).mine.length > 0;

import { iVoted, tallyVotes, votesFor } from './votes';

describe('tallyVotes', () => {
  const votes = [
    { id: 1, ideaId: 10, voterId: 7 },
    { id: 2, ideaId: 10, voterId: 8 },
    { id: 3, ideaId: 11, voterId: 8 },
    // Two clicks at once left a second row.
    { id: 4, ideaId: 10, voterId: 7 }
  ];

  it('counts each person once per idea', () => {
    const tally = tallyVotes(votes, 7);
    expect(votesFor(tally, 10).count).toBe(2);
    expect(votesFor(tally, 11).count).toBe(1);
  });

  it('keeps every row of mine, so taking the vote back clears them all', () => {
    const tally = tallyVotes(votes, 7);
    expect(votesFor(tally, 10).mine).toEqual([1, 4]);
    expect(iVoted(tally, 10)).toBe(true);
    expect(iVoted(tally, 11)).toBe(false);
  });

  it('says nobody voted for an idea with no rows', () => {
    expect(votesFor(tallyVotes(votes, 7), 99)).toEqual({ count: 0, mine: [] });
    expect(votesFor(tallyVotes([], 7), 10).count).toBe(0);
  });
});

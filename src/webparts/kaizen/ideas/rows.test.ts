import { ideaFrom, personFrom, voteFrom } from './rows';

describe('reading rows', () => {
  it('reads an idea with its people', () => {
    const got = ideaFrom({
      Id: 4, Title: ' Label shelves ', Problem: 'Slow', Proposal: null, Benefit: undefined, IdeaArea: 'Time',
      IdeaStatus: 'Under review', ReviewNote: 'Good one', Created: '2026-10-01T09:00:00Z',
      IdeaOwner: { Id: 8, Title: 'Alex Wilber', EMail: 'alex@example.com' },
      Author: { Id: 7, Title: 'Megan Bowen', EMail: 'megan@example.com' }
    });
    expect(got).toEqual({
      id: 4, title: 'Label shelves', problem: 'Slow', proposal: '', benefit: '', area: 'Time',
      stage: 'Under review', reviewNote: 'Good one', created: '2026-10-01T09:00:00Z',
      owner: { id: 8, name: 'Alex Wilber', email: 'alex@example.com' },
      author: { id: 7, name: 'Megan Bowen', email: 'megan@example.com' }
    });
  });

  it('reads an empty owner as nobody, and an empty stage as the first', () => {
    const got = ideaFrom({ Id: 1, IdeaOwner: null, IdeaStatus: '' });
    expect(got.owner).toBeUndefined();
    expect(got.stage).toBe('Submitted');
    expect(personFrom({ Title: 'No ID' })).toBeUndefined();
  });

  it('reads a vote, and drops one that points at no idea', () => {
    expect(voteFrom({ Id: 3, VoteIdeaId: 4, AuthorId: 7 })).toEqual({ id: 3, ideaId: 4, voterId: 7 });
    expect(voteFrom({ Id: 3, VoteIdeaId: null, AuthorId: 7 })).toBeUndefined();
  });
});

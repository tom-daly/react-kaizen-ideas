import { DEFAULT_QUERY, IBoardQuery, areaOptions, boardIdeas, filterCounts, firstLine, matchesSearch, searchWords } from './board';
import { tallyVotes } from './votes';
import { BOARD_IDEAS, ME, idea } from './__fixtures__/ideas';

const q = (patch: Partial<IBoardQuery>): IBoardQuery => ({ ...DEFAULT_QUERY, ...patch });
const NO_VOTES = tallyVotes([], ME);

describe('boardIdeas', () => {
  it('shows the open ideas by default, a stage added by hand among them', () => {
    const ideas = [...BOARD_IDEAS, idea({ id: 6, stage: 'On hold' })];
    expect(boardIdeas(ideas, NO_VOTES, DEFAULT_QUERY, ME).map(i => i.id).sort()).toEqual([1, 2, 3, 6]);
  });

  it('shows done, not going ahead and my own ideas under their pills', () => {
    expect(boardIdeas(BOARD_IDEAS, NO_VOTES, q({ filter: 'done' }), ME).map(i => i.id)).toEqual([4]);
    expect(boardIdeas(BOARD_IDEAS, NO_VOTES, q({ filter: 'stopped' }), ME).map(i => i.id)).toEqual([5]);
    expect(boardIdeas(BOARD_IDEAS, NO_VOTES, q({ filter: 'mine' }), ME).map(i => i.id)).toEqual([1, 4]);
  });

  it('puts the most votes first, newest first among equals', () => {
    const tally = tallyVotes([
      { id: 1, ideaId: 3, voterId: 7 }, { id: 2, ideaId: 3, voterId: 8 }, { id: 3, ideaId: 1, voterId: 8 }
    ], ME);
    expect(boardIdeas(BOARD_IDEAS, tally, DEFAULT_QUERY, ME).map(i => i.id)).toEqual([3, 1, 2]);
  });

  it('puts the newest first when asked, whatever the votes', () => {
    const tally = tallyVotes([{ id: 1, ideaId: 1, voterId: 8 }], ME);
    expect(boardIdeas(BOARD_IDEAS, tally, q({ sort: 'newest' }), ME).map(i => i.id)).toEqual([2, 3, 1]);
  });

  it('narrows to one area', () => {
    expect(boardIdeas(BOARD_IDEAS, NO_VOTES, q({ area: 'Time' }), ME).map(i => i.id).sort()).toEqual([1, 2]);
  });

  it('finds every word typed, in any part of the idea, whatever the case', () => {
    expect(boardIdeas(BOARD_IDEAS, NO_VOTES, q({ search: 'SHELF label' }), ME).map(i => i.id)).toEqual([1]);
    expect(boardIdeas(BOARD_IDEAS, NO_VOTES, q({ search: 'floor' }), ME).map(i => i.id)).toEqual([3]);
    expect(boardIdeas(BOARD_IDEAS, NO_VOTES, q({ search: 'floor label' }), ME)).toEqual([]);
  });
});

describe('filterCounts', () => {
  it('counts every pill', () => {
    expect(filterCounts(BOARD_IDEAS, DEFAULT_QUERY, ME)).toEqual({ open: 3, done: 1, stopped: 1, mine: 2 });
  });

  it('counts only what the search and area let through', () => {
    expect(filterCounts(BOARD_IDEAS, q({ area: 'Time' }), ME)).toEqual({ open: 2, done: 0, stopped: 0, mine: 1 });
    expect(filterCounts(BOARD_IDEAS, q({ search: 'toner' }), ME)).toEqual({ open: 0, done: 1, stopped: 0, mine: 1 });
  });
});

describe('searching', () => {
  it('ignores the spaces between words', () => {
    expect(searchWords('  label   shelves ')).toEqual(['label', 'shelves']);
    expect(matchesSearch(idea(), searchWords(''))).toBe(true);
  });

  it('looks at what it would improve too', () => {
    expect(matchesSearch(idea({ benefit: 'Fewer mistakes' }), ['mistakes'])).toBe(true);
  });
});

describe('areaOptions', () => {
  it('keeps the column\'s order and adds areas ideas still have that the column has lost', () => {
    const ideas = [idea({ area: 'Packing' }), idea({ area: 'Time' }), idea({ area: 'Admin' }), idea({ area: '' })];
    expect(areaOptions(['Time', 'Safety'], ideas)).toEqual(['Time', 'Safety', 'Admin', 'Packing']);
  });
});

describe('firstLine', () => {
  it('takes the first line with anything on it', () => {
    expect(firstLine('\n  Finding parts takes ages. \nMore')).toBe('Finding parts takes ages.');
    expect(firstLine('')).toBe('');
  });
});

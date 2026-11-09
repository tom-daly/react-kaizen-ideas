/*
 * Which ideas the board shows, and in what order: the stage pills, the
 * search box, the area picker and the sort. Nothing in here talks to the site.
 */
import { IIdea } from './types';
import { Tally, votesFor } from './votes';
import { isOpen } from './stages';

/** The pills along the top of the board. */
export type BoardFilter = 'open' | 'done' | 'stopped' | 'mine';
export const BOARD_FILTERS: BoardFilter[] = ['open', 'done', 'stopped', 'mine'];

export type BoardSort = 'votes' | 'newest';

export interface IBoardQuery {
  filter: BoardFilter;
  /** As typed. Every word has to be found somewhere in the idea. */
  search: string;
  /** Empty for every area. */
  area: string;
  sort: BoardSort;
}

export const DEFAULT_QUERY: IBoardQuery = { filter: 'open', search: '', area: '', sort: 'votes' };

export function inFilter(idea: IIdea, filter: BoardFilter, myId: number): boolean {
  switch (filter) {
    case 'open': return isOpen(idea.stage);
    case 'done': return idea.stage === 'Done';
    case 'stopped': return idea.stage === 'Not going ahead';
    case 'mine': return idea.author.id === myId;
  }
}

/** The words typed, lower case, blanks dropped. */
export const searchWords = (typed: string): string[] =>
  typed.toLowerCase().split(/\s+/).filter(w => w.length > 0);

/** Every word is somewhere in the idea's name, problem, change or benefit. */
export function matchesSearch(idea: IIdea, words: string[]): boolean {
  if (!words.length) return true;
  const said = [idea.title, idea.problem, idea.proposal, idea.benefit].join('\n').toLowerCase();
  return words.every(w => said.indexOf(w) > -1);
}

/* The search and the area, which narrow every pill alike. */
function narrowed(ideas: IIdea[], query: IBoardQuery): IIdea[] {
  const words = searchWords(query.search);
  return ideas.filter(i => (!query.area || i.area === query.area) && matchesSearch(i, words));
}

/** How many ideas each pill would show, with the search and area as they are. */
export function filterCounts(ideas: IIdea[], query: IBoardQuery, myId: number): Record<BoardFilter, number> {
  const pool = narrowed(ideas, query);
  const counts = {} as Record<BoardFilter, number>;
  BOARD_FILTERS.forEach(f => { counts[f] = pool.filter(i => inFilter(i, f, myId)).length; });
  return counts;
}

/* Newest first: the later one shared, then the higher row number. */
const newer = (a: IIdea, b: IIdea): number =>
  (a.created === b.created ? 0 : a.created < b.created ? 1 : -1) || b.id - a.id;

/** The ideas the board shows, in order. */
export function boardIdeas(ideas: IIdea[], tally: Tally, query: IBoardQuery, myId: number): IIdea[] {
  const shown = narrowed(ideas, query).filter(i => inFilter(i, query.filter, myId));
  return shown.sort((a, b) =>
    query.sort === 'votes'
      ? votesFor(tally, b.id).count - votesFor(tally, a.id).count || newer(a, b)
      : newer(a, b));
}

/**
 * The areas to pick from: the column's own, in its order, then any an idea
 * still has that were since taken off the column, A to Z.
 */
export function areaOptions(columnChoices: string[], ideas: IIdea[]): string[] {
  const extra: string[] = [];
  ideas.forEach(i => {
    if (i.area && columnChoices.indexOf(i.area) < 0 && extra.indexOf(i.area) < 0) extra.push(i.area);
  });
  return columnChoices.concat(extra.sort((a, b) => a.localeCompare(b)));
}

/** The first line of some text, for a card. */
export const firstLine = (s: string): string => s.split(/\r?\n/).map(l => l.trim()).filter(l => l)[0] || '';

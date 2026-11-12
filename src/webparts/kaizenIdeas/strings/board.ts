/*
 * Words on the board: the list of ideas with its pills, search, area and
 * sort, each idea's card and its vote button.
 */
import type { BoardFilter, BoardSort } from '../ideas/board';
import { countText } from './plural';
import { VOTES } from './common';

export const BOARD = {
  title: 'Ideas',
  intro: 'Small changes that make work better. Share yours, and vote for the ones you want to see happen.',
  share: 'Share an idea',
  loading: 'Loading ideas…',
  loadFailed: 'The ideas could not load.',
  // The pills, read out as one group.
  filtersLabel: 'Show',
  // The search box.
  searchLabel: 'Search ideas',
  searchPlaceholder: 'Search ideas',
  // The area and sort pickers.
  areaLabel: 'Area',
  allAreas: 'All areas',
  sortLabel: 'Sort by',
  // How many show, for screen readers as the list changes.
  showing: (n: number): string => (n === 1 ? '1 idea shown' : `${n} ideas shown`),
  // Nothing at all yet.
  noIdeasTitle: 'No ideas yet',
  noIdeasBody: 'Be the first to share one.',
  // Nothing under the pill, search and area picked.
  nothingHere: 'No ideas match.',
  noneOfMine: 'You haven\'t shared any ideas yet.',
  clearSearch: 'Clear the search and area'
};

export const FILTER_LABELS: Record<BoardFilter, string> = {
  open: 'Open',
  done: 'Done',
  stopped: 'Not going ahead',
  mine: 'Mine'
};

export const SORT_LABELS: Record<BoardSort, string> = {
  votes: 'Most votes',
  newest: 'Newest'
};

// On each idea's card and on the idea's own page.
export const CARD = {
  // "Shared by Megan Bowen on 4 Oct 2026"
  sharedBy: (name: string, on: string): string => (on ? `Shared by ${name} on ${on}` : `Shared by ${name}`),
  // Someone who has since left, whose name SharePoint no longer has.
  someone: 'someone',
  owner: (name: string): string => `Owner: ${name}`,
  noOwner: 'No owner yet'
};

// The vote button.
export const VOTE = {
  // What the button says, beside the count.
  vote: 'Vote',
  voted: 'Voted',
  // Read out, and shown on hover.
  voteFor: (idea: string): string => `Vote for ${idea}`,
  takeBack: (idea: string): string => `Take back your vote for ${idea}`,
  closed: 'Voting has closed on this idea.',
  // The count on its own, for screen readers.
  count: (n: number): string => countText(n, VOTES),
  failed: (reason: string): string => `Your vote didn't go through. ${reason}`
};

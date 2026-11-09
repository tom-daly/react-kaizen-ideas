/*
 * Words on an idea's own page, and the reviewers' panel on it.
 */

export const IDEA_PAGE = {
  // The headings over each part of the idea.
  problem: 'What\'s the problem today',
  proposal: 'What would you change',
  benefit: 'What it would improve',
  // An idea shared without saying what to change.
  noProposal: 'No change suggested yet.',
  reviewNote: 'Note from the reviewers',
  // The sharer's own buttons, while it's still Submitted.
  change: 'Change it',
  delete: 'Delete',
  canChangeHint: 'You can change or delete your idea until a reviewer picks it up.',
  confirmDelete: 'Delete this idea? It goes to the site\'s recycle bin, where a site owner can bring it back.',
  keep: 'Keep it',
  deleting: 'Deleting…',
  deleteFailed: (reason: string): string => `The idea couldn't be deleted. ${reason}`,
  // Gone since the board loaded.
  goneTitle: 'This idea isn\'t here any more',
  goneBody: 'It may have been deleted.'
};

export const REVIEW_PANEL = {
  title: 'Review',
  intro: 'Move the idea along, pick who will see it through and leave a note everyone can read.',
  stageLabel: 'Stage',
  ownerLabel: 'Owner',
  ownerHint: 'Who is seeing it through. Leave empty if nobody is yet.',
  noteLabel: 'Note from the reviewers',
  noteHint: 'Everyone can see this. Say what happens next, or why it isn\'t going ahead.',
  pickerHeader: 'People',
  pickerNoResults: 'No one found',
  pickerSearching: 'Searching…',
  removeOwner: (name: string): string => `Remove ${name}`,
  searchFailed: (reason: string): string => `Searching for people didn't work. ${reason}`,
  saved: 'Review saved.',
  saveFailed: (reason: string): string => `The review couldn't be saved. ${reason}`
};

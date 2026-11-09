/*
 * Words on the Reviewers page, where site owners say who looks after the ideas.
 */

export const REVIEWERS_PAGE = {
  title: 'Reviewers',
  intro: 'Reviewers look after the ideas: they move each one through its stages, pick who sees it through and ' +
    'leave a note. Site owners always can.',
  loading: 'Loading reviewers…',
  loadFailed: (error: string): string => `The reviewers couldn't be loaded. ${error}`,
  // A site that hasn't had Fix it run since the group was taken away. Names the setup screen's button.
  noGroup: 'Run Fix it to turn on reviewers.',
  none: "There aren't any reviewers yet.",
  removeLabel: (name: string): string => `Remove ${name}`,
  // The search box for adding someone, and what its list of suggestions says.
  addLabel: 'Add a person',
  pickerHeader: 'People',
  pickerNoResults: 'No one found',
  pickerSearching: 'Searching…',
  // For reviewers, who can see the list but not change it.
  askOwner: 'Ask a site owner to add or remove reviewers.',
  adding: (name: string): string => `Adding ${name}…`,
  added: (name: string): string => `${name} is a reviewer now.`,
  removing: (name: string): string => `Removing ${name}…`,
  removed: (name: string): string => `${name} isn't a reviewer any more.`,
  searchFailed: (error: string): string => `Searching for people didn't work. ${error}`,
  addFailed: (name: string, error: string): string => `${name} couldn't be added. ${error}`,
  removeFailed: (name: string, error: string): string => `${name} couldn't be removed. ${error}`
};

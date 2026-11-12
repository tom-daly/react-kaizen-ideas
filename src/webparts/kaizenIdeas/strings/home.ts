/*
 * Words around every page: the row of pages, the notes after saving, the IT
 * bar, the bar asking about unsaved changes and the bar saying something
 * didn't load.
 */

// The row of pages reviewers and site owners see along the top.
export const NAV = {
  // Read out for the row as a whole.
  label: 'Kaizen ideas pages',
  ideas: 'Ideas',
  areas: 'Areas',
  reviewers: 'Reviewers'
};

export const HOME = {
  // Notes after the form and the idea page.
  shared: (name: string): string => `Thanks — "${name}" is shared.`,
  saved: (name: string): string => `"${name}" saved.`,
  deleted: (name: string): string => `"${name}" deleted.`,
  // "Needs IT. Ask a site collection administrator…" with the first sentence in bold, then a list of problems:
  needsItLead: 'Needs IT.',
  needsItAsk: 'Ask a site collection administrator to open this page and fix:'
};

// The bar asked on the way out of something with changes not saved yet.
export const UNSAVED = {
  message: "Your changes aren't saved yet.",
  discard: 'Throw them away',
  keep: 'Keep editing'
};

// The bar saying something didn't load, like "The ideas could not load." and why.
export const LOAD_FAILED = {
  message: (lead: string, why: string): string => `${lead} ${why}`
};

/*
 * Messages from loading and saving ideas and votes. A reason after them is
 * SharePoint's own words.
 */

export const KAIZEN_DATA = {
  listsNotSetUp: 'The Kaizen ideas lists are not set up.',
  // The idea saved but SharePoint didn't say which row it became. Only seen if something is badly wrong.
  noNewId: 'The idea was shared, but it couldn\'t be read back. Refresh the page to see it.',
  // A reviewer picked the idea up while its sharer had it open to change.
  movedOn: (stage: string): string =>
    `A reviewer has moved this idea on to ${stage}, so it can't be changed or deleted now.`,
  ownerUnknown: (name: string): string => `${name} couldn't be found on this site.`
};

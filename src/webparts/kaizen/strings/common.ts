/*
 * Words used on more than one screen. Words used on one screen only live in
 * that screen's own strings file beside this one.
 */
import type { IPlural } from './plural';

export const COMMON = {
  save: 'Save',
  saving: 'Saving…',
  saved: 'Saved.',
  cancel: 'Cancel',
  close: 'Close',
  delete: 'Delete',
  tryAgain: 'Try again',
  checkBackSoon: 'Check back soon.',
  // "← All ideas", back to the board from an idea or the form.
  allIdeas: 'All ideas'
};

export const IDEAS: IPlural = { one: 'idea', other: 'ideas' };
export const VOTES: IPlural = { one: 'vote', other: 'votes' };

/*
 * Words on the form for sharing an idea, or changing one before a reviewer
 * picks it up.
 */

export const IDEA_FORM = {
  newTitle: 'Share an idea',
  newIntro: 'Small changes count. Say what gets in the way today and what you\'d do about it.',
  editTitle: 'Change your idea',
  editIntro: 'You can change it until a reviewer picks it up.',
  // The fields, with the help under each.
  titleLabel: 'Your idea in a few words',
  titlePlaceholder: 'Like: Label the spare parts shelves',
  problemLabel: 'What\'s the problem today?',
  problemHint: 'What goes wrong, takes too long or gets in the way.',
  proposalLabel: 'What would you change?',
  proposalHint: 'Leave it empty if you\'re not sure yet.',
  benefitLabel: 'What would it improve?',
  benefitHint: 'Time saved, fewer mistakes, safer… Optional.',
  areaLabel: 'Area',
  // Buttons.
  share: 'Share idea',
  sharing: 'Sharing…',
  // What has to be put right before it saves.
  titleNeeded: 'Give your idea a short name.',
  titleTooLong: (max: number): string => `Keep the name under ${max} characters.`,
  problemNeeded: 'Say what the problem is today.',
  fixFirst: 'Some answers need another look before this can save.',
  saveFailed: (reason: string): string => `Your idea couldn't be saved. ${reason}`
};

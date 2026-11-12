/*
 * Words on the Areas page, where reviewers and site owners say what an idea
 * can be about.
 */
import { countText } from './plural';
import { IDEAS } from './common';

// The pill colours, by the name SharePoint's own colours go by in the code.
export const AREA_COLOR_NAMES: Record<string, string> = {
  CornflowerBlue: 'Blue',
  MintGreen: 'Green',
  Gold: 'Yellow',
  Peach: 'Orange',
  Coral: 'Red',
  DustRose: 'Pink',
  Lavender: 'Purple',
  Cyan: 'Teal'
};

export const AREAS_PAGE = {
  title: 'Areas',
  intro: 'What people pick from when they share an idea. Changes save straight away.',
  // Under each area: "3 ideas", and "New ideas start here" on the one the form starts with.
  count: (n: number): string => countText(n, IDEAS),
  startsHere: 'New ideas start here',
  // The buttons beside each area, read out with its name.
  moveUp: (name: string): string => `Move ${name} up`,
  moveDown: (name: string): string => `Move ${name} down`,
  rename: (name: string): string => `Rename ${name}`,
  remove: (name: string): string => `Take ${name} off`,
  renameLabel: (name: string): string => `New name for ${name}`,
  color: (name: string): string => `Colour for ${name}`,
  noColor: 'No colour',
  // Adding one, and picking where new ideas start.
  addLabel: 'Add an area',
  addPlaceholder: 'Like: Engineering',
  add: 'Add',
  defaultLabel: 'New ideas start in',
  // What has to be put right before it saves.
  nameNeeded: 'Give the area a name.',
  nameTooLong: (max: number): string => `Keep the name under ${max} characters.`,
  nameTaken: (name: string): string => `There's already an area called ${name}.`,
  lastOne: 'There has to be at least one area.',
  gone: (name: string): string => `${name} has been taken off since this page opened.`,
  // While a change saves, then what it did.
  saving: 'Saving…',
  added: (name: string): string => `${name} added.`,
  moved: (name: string): string => `${name} moved.`,
  removed: (name: string, ideas: number): string => ideas
    ? `${name} taken off. Its ${countText(ideas, IDEAS)} keep it, but nobody can pick it for a new idea.`
    : `${name} taken off.`,
  renamed: (from: string, to: string): string => `${from} is now ${to}.`,
  movingIdeas: (n: number, to: string): string => `Moving ${countText(n, IDEAS)} to ${to}…`,
  renamedWithIdeas: (from: string, to: string, ideas: number): string =>
    `${from} is now ${to}, along with its ${countText(ideas, IDEAS)}.`,
  startsIn: (name: string): string => `New ideas start in ${name} now.`,
  colored: (name: string, color: string): string => `${name} is ${color.toLowerCase()} now.`,
  uncolored: (name: string): string => `${name} has no colour now.`,
  // When something didn't save. SharePoint's reason comes after.
  failed: (reason: string): string => `That didn't save. ${reason}`,
  ideasLeft: (from: string, to: string, reason: string): string =>
    `${from} is now ${to}, but some of its ideas still say ${from}. ${reason}`
};

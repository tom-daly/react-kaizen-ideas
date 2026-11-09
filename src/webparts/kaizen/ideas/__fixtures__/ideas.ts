import { IIdea } from '../types';

export const ME = 7;
export const MEGAN = { id: 7, name: 'Megan Bowen', email: 'megan@example.com' };
export const ALEX = { id: 8, name: 'Alex Wilber', email: 'alex@example.com' };

export const idea = (patch: Partial<IIdea> = {}): IIdea => ({
  id: 1,
  title: 'Label the spare parts shelves',
  problem: 'Finding parts takes ages.\nNobody knows what is where.',
  proposal: 'Put a label on every shelf.',
  benefit: '',
  area: 'Time',
  stage: 'Submitted',
  reviewNote: '',
  author: MEGAN,
  created: '2026-10-01T09:00:00Z',
  ...patch
});

/* A board's worth: open, done and stopped, from me and from Alex. */
export const BOARD_IDEAS: IIdea[] = [
  idea(),
  idea({
    id: 2, title: 'Shorter stand-up', problem: 'Meetings run long', proposal: 'Stand up for ten minutes',
    area: 'Time', stage: 'Under review', author: ALEX, created: '2026-10-03T09:00:00Z'
  }),
  idea({
    id: 3, title: 'Anti-slip mats', problem: 'Wet floor by the door', proposal: 'Mats at the door',
    area: 'Safety', stage: 'In progress', author: ALEX, created: '2026-10-02T09:00:00Z'
  }),
  idea({
    id: 4, title: 'Recycle toner', problem: 'Toner goes in the bin', proposal: 'Send it back',
    area: 'Cost', stage: 'Done', author: MEGAN, created: '2026-09-01T09:00:00Z'
  }),
  idea({
    id: 5, title: 'Four-day week', problem: 'Everyone is tired', proposal: 'Fridays off',
    area: 'Workplace', stage: 'Not going ahead', author: ALEX, created: '2026-09-02T09:00:00Z'
  })
];

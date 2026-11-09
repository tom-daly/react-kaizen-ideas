import { AREA_MAX, IAreas, areaCounts, areaNameProblem, changedAreas, sameAreas } from './areas';
import { BOARD_IDEAS } from './__fixtures__/ideas';
import { AREAS_PAGE } from '../strings/areas';

const START: IAreas = { choices: ['Safety', 'Quality', 'Other'], byDefault: 'Other', colors: { Safety: 'Coral' } };
const NONE = {};

describe('areaNameProblem', () => {
  it('wants a name, not too long, and not one there already in any capitals', () => {
    expect(areaNameProblem('  ', START.choices)).toBe(AREAS_PAGE.nameNeeded);
    expect(areaNameProblem('x'.repeat(AREA_MAX + 1), START.choices)).toBe(AREAS_PAGE.nameTooLong(AREA_MAX));
    expect(areaNameProblem('safety', START.choices)).toBe(AREAS_PAGE.nameTaken('Safety'));
    expect(areaNameProblem(' Engineering ', START.choices)).toBeUndefined();
  });

  it('lets a rename change only the capitals', () => {
    expect(areaNameProblem('SAFETY', START.choices, 'Safety')).toBeUndefined();
    expect(areaNameProblem('quality', START.choices, 'Safety')).toBe(AREAS_PAGE.nameTaken('Quality'));
  });
});

describe('changedAreas', () => {
  it('adds a new area just before Other, tidied', () => {
    expect(changedAreas(START, { kind: 'add', name: ' Engineering ' }).choices)
      .toEqual(['Safety', 'Quality', 'Engineering', 'Other']);
  });

  it('adds at the end when Other isn\'t last', () => {
    expect(changedAreas({ choices: ['Other', 'Safety'], byDefault: 'Other', colors: NONE }, { kind: 'add', name: 'Cost' }).choices)
      .toEqual(['Other', 'Safety', 'Cost']);
  });

  it('won\'t add one someone else added in the meantime', () => {
    expect(() => changedAreas(START, { kind: 'add', name: 'quality' })).toThrow(AREAS_PAGE.nameTaken('Quality'));
  });

  it('renames in place, and new ideas and its colour follow it', () => {
    expect(changedAreas(START, { kind: 'rename', from: 'Other', to: 'Anything else' }))
      .toEqual({ choices: ['Safety', 'Quality', 'Anything else'], byDefault: 'Anything else', colors: START.colors });
    expect(changedAreas(START, { kind: 'rename', from: 'Safety', to: 'Health and safety' }).colors)
      .toEqual({ 'Health and safety': 'Coral' });
  });

  it('won\'t rename one that has gone since the page opened', () => {
    expect(() => changedAreas(START, { kind: 'rename', from: 'Cost', to: 'Money' })).toThrow(AREAS_PAGE.gone('Cost'));
  });

  it('takes one off with its colour, and new ideas start in Other if they started there', () => {
    const safetyFirst = { ...START, byDefault: 'Safety' };
    expect(changedAreas(safetyFirst, { kind: 'remove', name: 'Safety' }))
      .toEqual({ choices: ['Quality', 'Other'], byDefault: 'Other', colors: NONE });
    expect(changedAreas(START, { kind: 'remove', name: 'Other' }))
      .toEqual({ choices: ['Safety', 'Quality'], byDefault: 'Safety', colors: START.colors });
  });

  it('never takes off the last one, and lets one already gone be', () => {
    expect(() => changedAreas({ choices: ['Other'], byDefault: 'Other', colors: NONE }, { kind: 'remove', name: 'Other' }))
      .toThrow(AREAS_PAGE.lastOne);
    expect(changedAreas(START, { kind: 'remove', name: 'Cost' })).toBe(START);
  });

  it('moves one up or down, but not off either end', () => {
    expect(changedAreas(START, { kind: 'move', name: 'Quality', by: -1 }).choices).toEqual(['Quality', 'Safety', 'Other']);
    expect(changedAreas(START, { kind: 'move', name: 'Quality', by: 1 }).choices).toEqual(['Safety', 'Other', 'Quality']);
    expect(changedAreas(START, { kind: 'move', name: 'Safety', by: -1 })).toBe(START);
    expect(changedAreas(START, { kind: 'move', name: 'Other', by: 1 })).toBe(START);
  });

  it('picks where new ideas start, only from the areas there are', () => {
    expect(changedAreas(START, { kind: 'byDefault', name: 'Safety' }).byDefault).toBe('Safety');
    expect(() => changedAreas(START, { kind: 'byDefault', name: 'Cost' })).toThrow(AREAS_PAGE.gone('Cost'));
  });

  it('gives an area a colour, changes it, or takes it off', () => {
    expect(changedAreas(START, { kind: 'color', name: 'Quality', color: 'Gold' }).colors)
      .toEqual({ Safety: 'Coral', Quality: 'Gold' });
    expect(changedAreas(START, { kind: 'color', name: 'Safety', color: 'Cyan' }).colors).toEqual({ Safety: 'Cyan' });
    expect(changedAreas(START, { kind: 'color', name: 'Safety', color: '' }).colors).toEqual(NONE);
    expect(() => changedAreas(START, { kind: 'color', name: 'Cost', color: 'Gold' })).toThrow(AREAS_PAGE.gone('Cost'));
  });
});

describe('areaCounts', () => {
  it('counts the ideas in each area', () => {
    expect(areaCounts(BOARD_IDEAS)).toEqual({ Time: 2, Safety: 1, Cost: 1, Workplace: 1 });
  });
});

describe('sameAreas', () => {
  it('needs the same order and the same starting area', () => {
    expect(sameAreas(START, { choices: ['Safety', 'Quality', 'Other'], byDefault: 'Other', colors: { Safety: 'Coral' } }))
      .toBe(true);
    expect(sameAreas(START, { ...START, choices: ['Quality', 'Safety', 'Other'] })).toBe(false);
    expect(sameAreas(START, { ...START, byDefault: 'Safety' })).toBe(false);
    expect(sameAreas(START, { ...START, colors: { Safety: 'Gold' } })).toBe(false);
    expect(sameAreas(START, { ...START, colors: NONE })).toBe(false);
  });
});

import { canChangeOwn, canVote, isOpen, stageChoices, stageTone } from './stages';
import { ALEX, ME, idea } from './__fixtures__/ideas';

describe('stages', () => {
  it('counts every stage but Done and Not going ahead as still going', () => {
    expect(['Submitted', 'Under review', 'In progress', 'On hold'].every(isOpen)).toBe(true);
    expect(isOpen('Done')).toBe(false);
    expect(isOpen('Not going ahead')).toBe(false);
  });

  it('closes voting once an idea has finished', () => {
    expect(canVote('In progress')).toBe(true);
    expect(canVote('Done')).toBe(false);
  });

  it('lets only the sharer change their idea, and only while it is Submitted', () => {
    expect(canChangeOwn(idea(), ME)).toBe(true);
    expect(canChangeOwn(idea({ stage: 'Under review' }), ME)).toBe(false);
    expect(canChangeOwn(idea({ author: ALEX }), ME)).toBe(false);
  });

  it('gives each stage its look, and one added by hand a plain one', () => {
    expect(stageTone('Done')).toBe('done');
    expect(stageTone('Not going ahead')).toBe('stopped');
    expect(stageTone('On hold')).toBe('other');
  });

  it('offers the tool\'s stages, then any added by hand, then the idea\'s own', () => {
    expect(stageChoices(['Submitted', 'On hold', 'Done'], 'Parked')).toEqual(
      ['Submitted', 'Under review', 'In progress', 'Done', 'Not going ahead', 'On hold', 'Parked']);
    expect(stageChoices([], 'Done')).toHaveLength(5);
  });
});

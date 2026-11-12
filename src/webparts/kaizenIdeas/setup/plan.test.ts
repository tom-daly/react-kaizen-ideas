import { IStep, Unmade, mergeChoices, planSetup, skipReason } from './plan';
import { EVERYONE, LIMITED_REVIEWERS, OWNERS, STAFF, healthy, empty, change, oldStageColumn } from './__fixtures__/states';

describe('planSetup', () => {
  it('spells out every step on a fresh site, in the order they run', () => {
    expect(planSetup(empty(), EVERYONE).map(s => s.label)).toEqual([
      'Make the Kaizen ideas list',
      'Add 7 columns to Kaizen ideas',
      'Set up the "All ideas" and "Open" views',
      'Kaizen ideas: let each person change only their own rows',
      'Let staff add their own rows to Kaizen ideas',

      'Make the Kaizen votes list',
      'Add the Idea column to Kaizen votes',
      'Set up the "All votes" view',
      'Kaizen votes: hide it from the site contents, keep it out of search, stop keeping old copies ' +
        'and let each person change only their own rows',
      'Let staff add their own rows to Kaizen votes',

      'Make the Reviewers group',
      'Let reviewers change Kaizen ideas'
    ]);
  });

  it('starts every step as waiting, with an id the page can key on', () => {
    const steps = planSetup(empty(), EVERYONE);
    expect(steps.every(s => s.state === 'waiting')).toBe(true);
    expect(new Set(steps.map(s => s.id)).size).toBe(steps.length);
  });

  it('lets everyone see every row while each changes only their own', () => {
    const steps = planSetup(empty(), EVERYONE).filter(s => s.kind === 'settings');
    steps.forEach(s => expect(s.settings).toEqual(expect.objectContaining({ ReadSecurity: 1, WriteSecurity: 2 })));
  });

  it('has nothing to do on a site exactly as setup leaves it', () => {
    expect(planSetup(healthy(), EVERYONE)).toEqual([]);
  });

  it('adds only the one missing column, by the name people see', () => {
    const fields = healthy().ideas.fields?.filter(f => f !== 'IdeaOwner');
    const steps = planSetup(change(healthy(), 'ideas', { fields }), EVERYONE);
    expect(steps.map(s => s.label)).toEqual(['Add the Owner column to Kaizen ideas']);
    expect(steps[0].fields).toEqual(['IdeaOwner']);
  });

  it('leaves views alone on a list that already exists', () => {
    const steps = planSetup(change(healthy(), 'votes', { hidden: false }), EVERYONE);
    expect(steps.map(s => s.kind)).toEqual(['settings']);
    expect(steps[0].settings).toEqual({ Hidden: true });
  });

  it('plans nothing for a list the person looking can\'t change — that is IT\'s job', () => {
    expect(planSetup(change(healthy(), 'votes', { canManage: false, fields: ['Title'] }), EVERYONE)).toEqual([]);
  });

  it('lets staff back into a list that lost its own permissions', () => {
    const steps = planSetup(change(healthy(), 'votes', { uniquePermissions: false }), EVERYONE);
    expect(steps.map(s => s.kind)).toEqual(['staffAccess']);
  });

  it('adds a missing stage to the Stage column, keeping one added by hand', () => {
    const steps = planSetup(oldStageColumn(), EVERYONE);
    expect(steps.map(s => s.label)).toEqual(['Add In progress to the Stage column in Kaizen ideas']);
    expect(steps[0].choices).toEqual({
      field: 'IdeaStatus',
      all: ['Submitted', 'Under review', 'In progress', 'Done', 'Not going ahead', 'On hold']
    });
  });

  it('makes the Reviewers group and lets it in when it isn\'t there', () => {
    const state = { ...healthy(), reviewers: { exists: false } };
    const steps = planSetup(change(state, 'ideas', { access: [OWNERS, STAFF] }), EVERYONE);
    expect(steps.map(s => s.label)).toEqual(['Make the Reviewers group', 'Let reviewers change Kaizen ideas']);
  });

  it('lets reviewers into a list they only have Limited Access to', () => {
    const state = change(healthy(), 'ideas', { access: [OWNERS, STAFF, LIMITED_REVIEWERS] });
    const steps = planSetup(state, EVERYONE);
    expect(steps.map(s => s.label)).toEqual(['Let reviewers change Kaizen ideas']);
    expect(steps[0].list).toBe('ideas');
  });

  it('leaves the reviewers alone when the full check didn\'t look at them', () => {
    const steps = planSetup({ ...oldStageColumn(), reviewers: undefined }, EVERYONE);
    expect(steps.map(s => s.kind)).toEqual(['addChoices']);
  });
});

describe('skipReason', () => {
  const step = (patch: Partial<IStep>): IStep =>
    ({ id: 'x', kind: 'reviewersAccess', label: 'x', state: 'waiting', ...patch });

  it('skips a list\'s steps when the list wasn\'t made, the reviewers\' one included', () => {
    const unmade = new Set<Unmade>(['ideas']);
    expect(skipReason(step({ list: 'ideas' }), unmade)).toBe('Skipped because Kaizen ideas wasn\'t made.');
    expect(skipReason(step({ kind: 'addColumns', list: 'votes' }), unmade)).toBeUndefined();
  });

  it('skips every reviewers step when the group couldn\'t be made', () => {
    const unmade = new Set<Unmade>(['reviewers']);
    expect(skipReason(step({ list: 'ideas' }), unmade)).toBe('Skipped because the Reviewers group couldn\'t be made.');
    expect(skipReason(step({ kind: 'addColumns', list: 'ideas' }), unmade)).toBeUndefined();
  });
});

describe('mergeChoices', () => {
  it('puts each new choice in after the one before it, keeping choices added by hand', () => {
    expect(mergeChoices(['Submitted', 'Done', 'On hold'], ['Submitted', 'Under review', 'Done']))
      .toEqual(['Submitted', 'Under review', 'Done', 'On hold']);
  });

  it('puts a new first choice first', () => {
    expect(mergeChoices(['B'], ['A', 'B'])).toEqual(['A', 'B']);
  });
});

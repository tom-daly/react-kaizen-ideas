import { findProblems, allListsExist, listIds } from './problems';
import { RoleType } from './permissions';
import {
  EVERYONE, LIMITED_REVIEWERS, OWNERS, REVIEWERS, STAFF, healthy, empty, change, oldStageColumn
} from './__fixtures__/states';

describe('findProblems', () => {
  it('finds nothing wrong with a site exactly as setup leaves it', () => {
    expect(findProblems(healthy(), EVERYONE)).toEqual([]);
  });

  it('says both lists and the Reviewers group are still to make on an empty site, and the owner can do it', () => {
    const problems = findProblems(empty(), EVERYONE);
    expect(problems.map(p => p.list)).toEqual(['ideas', 'votes', undefined]);
    expect(problems[2].text).toBe('The Reviewers group hasn\'t been made yet.');
    expect(problems.every(p => p.fixable)).toBe(true);
    expect(allListsExist(empty())).toBe(false);
  });

  it('names a missing column by the name people see', () => {
    const state = change(healthy(), 'ideas', { fields: ['Title', 'Problem', 'Proposal', 'Benefit', 'IdeaArea'] });
    const [first] = findProblems(state, EVERYONE);
    expect(first.text).toBe('Kaizen ideas is missing 3 columns: Stage, Owner, Note from the reviewers.');
    expect(first.fixable).toBe(true);
  });

  it('hands a problem the person looking can\'t change to IT', () => {
    const state = change(healthy(), 'votes', { canManage: false, hidden: false });
    const problems = findProblems(state, EVERYONE);
    expect(problems.map(p => p.text)).toEqual(['Kaizen votes still shows in the site contents.']);
    expect(problems[0].fixable).toBe(false);
  });

  it('catches staff able to change each other\'s ideas, or only able to see their own', () => {
    expect(findProblems(change(healthy(), 'ideas', { writeSecurity: 1 }), EVERYONE).map(p => p.text))
      .toEqual(["Staff could change each other's rows in Kaizen ideas."]);
    expect(findProblems(change(healthy(), 'votes', { readSecurity: 2 }), EVERYONE).map(p => p.text))
      .toEqual(['Staff can only see their own rows in Kaizen votes.']);
  });

  it('catches a list that still follows the site, so staff cannot add to it', () => {
    const state = change(healthy(), 'votes', { uniquePermissions: false });
    expect(findProblems(state, EVERYONE).map(p => p.text)).toEqual(["Staff can't add to Kaizen votes yet."]);
  });

  it('doesn\'t count staff who can only read as able to add', () => {
    const readers = { ...STAFF, roles: [RoleType.reader] };
    const state = change(healthy(), 'ideas', { access: [OWNERS, readers, REVIEWERS] });
    expect(findProblems(state, EVERYONE).map(p => p.text)).toEqual(["Staff can't add to Kaizen ideas yet."]);
  });

  it('catches a votes list that shows up, can be searched or keeps old copies', () => {
    const state = change(healthy(), 'votes', { hidden: false, noCrawl: false, versioning: true });
    expect(findProblems(state, EVERYONE).map(p => p.text)).toEqual([
      'Kaizen votes still shows in the site contents.',
      'Kaizen votes still shows up in search.',
      'Kaizen votes keeps old copies of every change.'
    ]);
  });

  it('notices a Stage column that lacks a newer stage', () => {
    expect(findProblems(oldStageColumn(), EVERYONE).map(p => p.text))
      .toEqual(['The Stage column in Kaizen ideas is missing 1 choice: In progress.']);
  });

  it('never minds the areas a site owner changed by hand', () => {
    const state = change(healthy(), 'ideas', { choices: { ...healthy().ideas.choices, IdeaArea: ['Packing'] } });
    expect(findProblems(state, EVERYONE)).toEqual([]);
  });

  it('catches reviewers who can\'t change the ideas, counting Limited Access as no way in', () => {
    const state = change(healthy(), 'ideas', { access: [OWNERS, STAFF, LIMITED_REVIEWERS] });
    expect(findProblems(state, EVERYONE).map(p => p.text)).toEqual(['Reviewers can\'t change Kaizen ideas yet.']);
  });

  it('finds the group by its ID, so renaming it by hand changes nothing', () => {
    const renamed = { ...REVIEWERS, loginName: 'Improvement team' };
    expect(findProblems(change(healthy(), 'ideas', { access: [OWNERS, STAFF, renamed] }), EVERYONE)).toEqual([]);
  });

  it('leaves the reviewers alone when the check didn\'t look at them', () => {
    expect(findProblems({ ...empty(), reviewers: undefined }, EVERYONE).map(p => p.list)).toEqual(['ideas', 'votes']);
  });
});

describe('listIds', () => {
  it('keeps the IDs of the lists that exist', () => {
    expect(listIds(healthy())).toEqual({ ideas: 'ideas', votes: 'votes' });
    expect(listIds(change(healthy(), 'votes', { exists: false, id: undefined }))).toEqual({ ideas: 'ideas' });
  });
});

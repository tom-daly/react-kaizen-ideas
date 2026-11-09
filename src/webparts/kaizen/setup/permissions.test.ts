import { hasLevel, hasStaff, RoleType, CAN_CHANGE_LIST, CAN_ADD } from './permissions';
import { REVIEWERS_GROUP } from './schema';
import { EVERYONE } from './__fixtures__/states';

describe('hasLevel', () => {
  const access = [
    { principalId: 20, loginName: 'Renamed by hand', roles: [RoleType.editor] },
    { principalId: 21, loginName: REVIEWERS_GROUP, roles: [RoleType.guest] }
  ];

  it('finds a group by its ID, not its name', () => {
    expect(hasLevel(access, 20, CAN_CHANGE_LIST)).toBe(true);
    expect(hasLevel(access, 21, CAN_CHANGE_LIST)).toBe(false);
  });

  it('doesn\'t count the Limited Access SharePoint hands out on its own', () => {
    expect(hasLevel(access, 21, CAN_ADD)).toBe(false);
  });

  it('counts Contribute as enough to add, but not to look after a list', () => {
    const contributor = [{ principalId: 20, loginName: 'x', roles: [RoleType.contributor] }];
    expect(hasLevel(contributor, 20, CAN_ADD)).toBe(true);
    expect(hasLevel(contributor, 20, CAN_CHANGE_LIST)).toBe(false);
  });
});

describe('hasStaff', () => {
  it('finds everyone in the organisation whatever the case of the claim, if they can add', () => {
    expect(hasStaff([{ principalId: 9, loginName: EVERYONE.toUpperCase(), roles: [RoleType.contributor] }], EVERYONE))
      .toBe(true);
    expect(hasStaff([{ principalId: 9, loginName: EVERYONE, roles: [RoleType.reader] }], EVERYONE)).toBe(false);
    expect(hasStaff([{ principalId: 3, loginName: 'Owners', roles: [RoleType.administrator] }], EVERYONE)).toBe(false);
  });
});

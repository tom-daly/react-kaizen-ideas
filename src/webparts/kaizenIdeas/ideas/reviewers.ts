import type { SPFI } from '../sp';
import { PrincipalSource, PrincipalType } from '@pnp/sp';
import { findReviewersGroup } from '../setup/toolState';

/*
 * The people in the Reviewers group, who look after the ideas without being
 * site owners. Site owners add and remove them from the Reviewers page. Also
 * the people search, for that page and for picking an idea's owner.
 */

export interface IReviewer {
  /** Their ID on this site. */
  id: number;
  name: string;
  email: string;
  /** How SharePoint knows them, like i:0#.f|membership|megan@example.com. */
  login: string;
}

/** Someone the people search found. */
export interface IPersonFound {
  login: string;
  name: string;
  email: string;
}

export interface IReviewers {
  groupId: number;
  people: IReviewer[];
}

interface IRawUser {
  Id: number;
  Title: string;
  Email?: string;
  LoginName: string;
}

const toReviewer = (u: IRawUser): IReviewer => ({ id: u.Id, name: u.Title, email: u.Email || '', login: u.LoginName });

export const byName = (people: IReviewer[]): IReviewer[] =>
  people.slice().sort((a, b) => a.name.localeCompare(b.name));

/** The reviewers, or undefined when setup hasn't made the group yet. */
export async function loadReviewers(sp: SPFI): Promise<IReviewers | undefined> {
  const groupId = await findReviewersGroup(sp);
  if (groupId === undefined) return undefined;
  const users: IRawUser[] = await sp.web.siteGroups.getById(groupId).users
    .select('Id', 'Title', 'Email', 'LoginName')();
  return { groupId, people: byName(users.map(toReviewer)) };
}

/** People in the organisation whose name or email starts with what was typed. */
export async function searchPeople(sp: SPFI, text: string): Promise<IPersonFound[]> {
  const found = await sp.profiles.clientPeoplePickerSearchUser({
    QueryString: text,
    MaximumEntitySuggestions: 8,
    PrincipalType: PrincipalType.User,
    PrincipalSource: PrincipalSource.All,
    AllowEmailAddresses: true,
    AllowMultipleEntities: false,
    AllUrlZones: false
  });
  return found
    .filter(e => !!e.Key)
    .map(e => {
      // The description is usually their sign-in name, which is their email; a claim like i:0#… is no use to show.
      const said = e.Description && e.Description.indexOf('|') < 0 ? e.Description : '';
      return { login: e.Key, name: e.DisplayText, email: (e.EntityData && e.EntityData.Email) || said };
    });
}

/** Makes sure the person is known to the site, then puts them in the group. */
export async function addReviewer(sp: SPFI, groupId: number, login: string): Promise<IReviewer> {
  const user = await sp.web.ensureUser(login);
  await sp.web.siteGroups.getById(groupId).users.add(user.LoginName);
  return toReviewer(user);
}

export async function removeReviewer(sp: SPFI, groupId: number, userId: number): Promise<void> {
  await sp.web.siteGroups.getById(groupId).users.removeById(userId);
}

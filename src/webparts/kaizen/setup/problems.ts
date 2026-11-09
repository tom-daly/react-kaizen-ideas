import { TOOL_LISTS, IFieldDef, IListDef, ListIds, ListKey, writesOwnRows } from './schema';
import { CAN_CHANGE_LIST, IAssignment, hasLevel, hasStaff } from './permissions';
import { SETUP_PROBLEMS } from '../strings/setup';

/* What the tool needs to know about the site and the person looking at it. */
export interface ISiteInfo {
  webUrl: string;
  webServerRelativeUrl: string;
  everyoneLogin: string;
  /** The person looking, by their ID on this site: the ideas and votes they added carry it. */
  currentUserId: number;
  user: { name: string; email: string };
  /** Can make lists and change who sees them — so can run setup. */
  isOwner: boolean;
}

export const listServerUrl = (site: ISiteInfo, def: IListDef): string =>
  `${site.webServerRelativeUrl.replace(/\/$/, '')}/Lists/${def.urlName}`;

export const listWebUrl = (site: ISiteInfo, def: IListDef): string =>
  `${site.webUrl.replace(/\/$/, '')}/Lists/${def.urlName}`;

export interface IListState {
  exists: boolean;
  id?: string;
  hidden?: boolean;
  noCrawl?: boolean;
  versioning?: boolean;
  readSecurity?: number;
  writeSecurity?: number;
  uniquePermissions?: boolean;
  /** The person looking can change this list's columns and settings. */
  canManage?: boolean;
  fields?: string[];
  /** The choices each choice column has now, by internal name. */
  choices?: Record<string, string[]>;
  /** Who has a way in. Missing when the person looking is not allowed to see that. */
  access?: IAssignment[];
}

/** The Kaizen reviewers group. */
export interface IGroupState {
  exists: boolean;
  id?: number;
}

/**
 * The tool's lists, by key. The full check for site owners also reads the
 * reviewers group; for everyone else that is missing.
 */
export type ToolState = Record<ListKey, IListState> & {
  reviewers?: IGroupState;
};

export interface IProblem {
  /** The list it is about. Missing for the reviewers group. */
  list?: ListKey;
  text: string;
  /** The person looking can fix it. If not, it needs IT (a site collection admin). */
  fixable: boolean;
}

/* Item-level permission settings: 1 = every row, 2 = only the rows they created. */
export const ALL_ROWS = 1;
export const OWN_ROWS = 2;

/** Everything about the site that does not match the schema, in plain words. */
export function findProblems(state: ToolState, everyoneLogin: string): IProblem[] {
  const out: IProblem[] = [];

  for (const def of TOOL_LISTS) {
    const s = state[def.key];
    if (!s || !s.exists) {
      out.push({ list: def.key, text: SETUP_PROBLEMS.listMissing(def.title), fixable: true });
      continue;
    }
    const add = (text: string): void => { out.push({ list: def.key, text, fixable: !!s.canManage }); };

    const missing = missingFields(def, s);
    if (missing.length) add(SETUP_PROBLEMS.columnsMissing(def.title, missing.map(f => f.title)));
    missingChoices(def, s).forEach(m => {
      add(SETUP_PROBLEMS.choicesMissing(m.title, def.title, m.choices));
    });
    if (s.hidden !== undefined && s.hidden !== def.hidden) {
      add(def.hidden ? SETUP_PROBLEMS.stillShows(def.title) : SETUP_PROBLEMS.hidden(def.title));
    }
    if (!def.searchable && s.noCrawl === false) add(SETUP_PROBLEMS.inSearch(def.title));
    if (!def.keepVersions && s.versioning) add(SETUP_PROBLEMS.keepsVersions(def.title));

    if (def.access === 'site') continue;

    if (staffLetIn(s, everyoneLogin) === false) add(SETUP_PROBLEMS.staffCantAdd(def.title));
    if (writesOwnRows(def)) {
      if (s.readSecurity !== undefined && s.readSecurity !== ALL_ROWS) add(SETUP_PROBLEMS.staffSeeOwnOnly(def.title));
      if (s.writeSecurity !== undefined && s.writeSecurity !== OWN_ROWS) add(SETUP_PROBLEMS.staffChangeOthers(def.title));
    }
  }

  // Reviewers, once the full check has looked. Until the group is made, that one line says it all.
  if (!state.reviewers) return out;
  const groupId = reviewersGroupId(state);
  if (groupId === undefined) {
    out.push({ text: SETUP_PROBLEMS.noReviewersGroup, fixable: true });
    return out;
  }
  for (const def of TOOL_LISTS) {
    const s = state[def.key];
    if (def.reviewers && s && s.exists && reviewersCanChange(s, groupId) === false) {
      out.push({ list: def.key, text: SETUP_PROBLEMS.reviewersCantChange(def.title), fixable: !!s.canManage });
    }
  }
  return out;
}

/** The reviewers group's ID, when it is there. */
export function reviewersGroupId(state: ToolState): number | undefined {
  return state.reviewers && state.reviewers.exists ? state.reviewers.id : undefined;
}

/**
 * Whether reviewers can change every row of a list. Undefined when the person
 * looking can't see who has access. Limited Access doesn't count.
 */
export function reviewersCanChange(s: IListState, groupId: number): boolean | undefined {
  return s.access ? hasLevel(s.access, groupId, CAN_CHANGE_LIST) : undefined;
}

/** Columns the list should have but doesn't. All of them for a list about to be made (`s` undefined). */
export function missingFields(def: IListDef, s: IListState | undefined): IFieldDef[] {
  const have = (s && s.fields) || [];
  return def.fields.filter(f => have.indexOf(f.name) < 0);
}

/**
 * Whether staff can add to a list: it has permissions of its own, with
 * everyone in the organisation on it at Contribute or more. Undefined when the
 * person looking can't see who has access.
 */
export function staffLetIn(s: IListState, everyoneLogin: string): boolean | undefined {
  if (!s.uniquePermissions) return false;
  return s.access ? hasStaff(s.access, everyoneLogin) : undefined;
}

/** Choice columns that are there but lack choices a newer version of the tool brings. */
export function missingChoices(def: IListDef, s: IListState): { name: string; title: string; choices: string[] }[] {
  const have = s.fields || [];
  const out: { name: string; title: string; choices: string[] }[] = [];
  def.fields.forEach(f => {
    if (!f.choices || have.indexOf(f.name) < 0 || !s.choices || !s.choices[f.name]) return;
    const now = s.choices[f.name];
    const lacking = f.choices.filter(c => now.indexOf(c) < 0);
    if (lacking.length) out.push({ name: f.name, title: f.title, choices: lacking });
  });
  return out;
}

/** True when every list exists — enough for staff to use the tool. */
export const allListsExist = (state: ToolState): boolean =>
  TOOL_LISTS.every(def => state[def.key] && state[def.key].exists);

/** The IDs of the lists that exist, for reading and writing rows. */
export function listIds(state: ToolState): ListIds {
  const ids: ListIds = {};
  TOOL_LISTS.forEach(def => { if (state[def.key] && state[def.key].id) ids[def.key] = state[def.key].id; });
  return ids;
}

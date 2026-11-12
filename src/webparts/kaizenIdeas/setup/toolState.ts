import type { SPFI } from '../sp';
import type { IList } from '@pnp/sp/lists';
import { PermissionKind } from '@pnp/sp/security';
import { TOOL_LISTS, IListDef, REVIEWERS_GROUP } from './schema';
import { IAssignment } from './permissions';
import { ISiteInfo, IListState, IGroupState, ToolState, listServerUrl } from './problems';
import { isDenied } from './errors';

/**
 * One call finds which of the tool's lists exist. Lists are trimmed to what
 * the person looking may see, so for staff "missing" and "not allowed" look
 * the same — either way the tool is not ready for them.
 *
 * `detail` adds settings, columns and who has access, for the owner's check,
 * along with the reviewers group.
 */
export async function readToolState(sp: SPFI, site: ISiteInfo, detail: boolean): Promise<ToolState> {
  const all = await sp.web.lists.select('Id', 'RootFolder/ServerRelativeUrl').expand('RootFolder').top(5000)();
  const byUrl: Record<string, string> = {};
  all.forEach(l => { byUrl[l.RootFolder.ServerRelativeUrl.toLowerCase()] = l.Id; });

  const state = {} as ToolState;
  await Promise.all(TOOL_LISTS.map(async def => {
    const id = byUrl[listServerUrl(site, def).toLowerCase()];
    state[def.key] = !id ? { exists: false }
      : detail ? await readList(sp.web.lists.getById(id), def, id)
      : { exists: true, id };
  }));
  if (!detail) return state;

  return { ...state, reviewers: await readGroup(sp) };
}

async function readList(list: IList, def: IListDef, id: string): Promise<IListState> {
  const [info, fields, access] = await Promise.all([
    list.select('Hidden', 'NoCrawl', 'EnableVersioning', 'ReadSecurity', 'WriteSecurity',
      'HasUniqueRoleAssignments', 'EffectiveBasePermissions')(),
    list.fields.select('InternalName')(),
    def.access === 'site' && !def.reviewers ? Promise.resolve(undefined) : readAccess(list)
  ]);
  // Each tracked choice column's choices, so a column made by an older version can get any new ones.
  const choiceFields = def.fields.filter(f => !!f.choices && fields.some(x => x.InternalName === f.name));
  const read = await Promise.all(choiceFields.map(async (f): Promise<[string, string[]]> => {
    const got = await list.fields.getByInternalNameOrTitle(f.name).select('Choices')();
    return [f.name, choicesOf(got)];
  }));
  const choices: Record<string, string[]> = {};
  read.forEach(([name, list]) => { choices[name] = list; });
  return {
    exists: true,
    id,
    choices,
    hidden: info.Hidden,
    noCrawl: info.NoCrawl,
    versioning: info.EnableVersioning,
    readSecurity: info.ReadSecurity,
    writeSecurity: info.WriteSecurity,
    uniquePermissions: (info as unknown as { HasUniqueRoleAssignments: boolean }).HasUniqueRoleAssignments,
    canManage: list.hasPermissions(info.EffectiveBasePermissions, PermissionKind.ManageLists),
    fields: fields.map(f => f.InternalName),
    access
  };
}

/** A choice column's choices as REST hands them back, which can be either of two shapes. */
export function choicesOf(got: unknown): string[] {
  const raw = (got as { Choices?: string[] | { results?: string[] } }).Choices;
  return Array.isArray(raw) ? raw : raw && raw.results ? raw.results : [];
}

/** The reviewers group's ID, found by its name, or undefined if it hasn't been made. */
export async function findReviewersGroup(sp: SPFI): Promise<number | undefined> {
  const found = await sp.web.siteGroups
    .filter(`Title eq '${REVIEWERS_GROUP.replace(/'/g, "''")}'`)
    .select('Id')();
  return found.length ? found[0].Id : undefined;
}

async function readGroup(sp: SPFI): Promise<IGroupState> {
  const id = await findReviewersGroup(sp);
  return id === undefined ? { exists: false } : { exists: true, id };
}

interface IRawBinding {
  RoleTypeKind: number;
}

interface IRawAssignment {
  PrincipalId: number;
  Member: { LoginName: string };
  RoleDefinitionBindings?: IRawBinding[] | { results?: IRawBinding[] };
}

const levelsOf = (raw: IRawAssignment['RoleDefinitionBindings']): number[] => {
  const list = Array.isArray(raw) ? raw : raw && raw.results ? raw.results : [];
  return list.map(b => b.RoleTypeKind);
};

/**
 * Whether the person looking can review ideas: anyone who can change the
 * ideas list can move any idea along. Site owners can, and so can the
 * reviewers once setup has let them in.
 */
export async function canReviewIdeas(sp: SPFI, ideasListId: string): Promise<boolean> {
  const list = sp.web.lists.getById(ideasListId);
  const info = await list.select('EffectiveBasePermissions')();
  return list.hasPermissions(info.EffectiveBasePermissions, PermissionKind.ManageLists);
}

/**
 * Who has a way into a list, with their permission levels, or undefined if
 * the person looking may not see that.
 */
export async function readAccess(target: Pick<IList, 'roleAssignments'>): Promise<IAssignment[] | undefined> {
  try {
    const raw = await target.roleAssignments.expand('Member', 'RoleDefinitionBindings')
      .select('PrincipalId', 'Member/LoginName', 'RoleDefinitionBindings/RoleTypeKind')();
    return (raw as unknown as IRawAssignment[]).map(a => ({
      principalId: a.PrincipalId,
      loginName: a.Member.LoginName,
      roles: levelsOf(a.RoleDefinitionBindings)
    }));
  } catch (e) {
    if (isDenied(e)) return undefined;
    throw e;
  }
}

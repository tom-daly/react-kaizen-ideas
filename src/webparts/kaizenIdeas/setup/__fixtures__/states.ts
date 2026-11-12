import { TOOL_LISTS, ListKey, REVIEWERS_GROUP, STAGES } from '../schema';
import { RoleType, everyoneClaim } from '../permissions';
import { IListState, ToolState, ALL_ROWS, OWN_ROWS } from '../problems';

export const EVERYONE = everyoneClaim('tenant');
export const OWNERS = { principalId: 3, loginName: 'Kaizen Owners', roles: [RoleType.administrator] };
export const STAFF = { principalId: 9, loginName: EVERYONE, roles: [RoleType.contributor] };
export const REVIEWERS = { principalId: 20, loginName: REVIEWERS_GROUP, roles: [RoleType.editor] };

/* Reviewers with only the Limited Access SharePoint hands out on its own, which opens nothing. */
export const LIMITED_REVIEWERS = { ...REVIEWERS, roles: [RoleType.guest] };

/* A site exactly as setup leaves it, seen by a site owner. */
export function healthy(): ToolState {
  const state = {} as ToolState;
  for (const def of TOOL_LISTS) {
    const s: IListState = {
      exists: true,
      id: def.key,
      hidden: def.hidden,
      noCrawl: !def.searchable,
      versioning: def.keepVersions,
      readSecurity: ALL_ROWS,
      writeSecurity: def.access === 'addOwn' ? OWN_ROWS : ALL_ROWS,
      uniquePermissions: def.access !== 'site' || def.reviewers,
      canManage: true,
      fields: def.fields.map(f => f.name),
      choices: def.fields.reduce<Record<string, string[]>>((all, f) => {
        if (f.choices) all[f.name] = f.choices;
        return all;
      }, {}),
      access: [OWNERS, ...(def.access === 'site' ? [] : [STAFF]), ...(def.reviewers ? [REVIEWERS] : [])]
    };
    state[def.key] = s;
  }
  state.reviewers = { exists: true, id: REVIEWERS.principalId };
  return state;
}

export function empty(): ToolState {
  const state = {} as ToolState;
  TOOL_LISTS.forEach(def => { state[def.key] = { exists: false }; });
  state.reviewers = { exists: false };
  return state;
}

export const change = (state: ToolState, key: ListKey, patch: Partial<IListState>): ToolState =>
  ({ ...state, [key]: { ...state[key], ...patch } });

/* A healthy site whose Stage column was made without In progress, with a stage added by hand. */
export function oldStageColumn(): ToolState {
  const before = healthy().ideas.choices || {};
  const had = STAGES.filter(s => s !== 'In progress').concat('On hold');
  return change(healthy(), 'ideas', { choices: { ...before, IdeaStatus: had } });
}

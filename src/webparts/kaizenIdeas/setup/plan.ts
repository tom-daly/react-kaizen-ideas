import { TOOL_LISTS, IListDef, ListKey, listDef, writesOwnRows } from './schema';
import {
  IListState, ToolState, ALL_ROWS, OWN_ROWS, missingChoices, missingFields, reviewersCanChange, reviewersGroupId,
  staffLetIn
} from './problems';
import { inWords } from '../strings/plural';
import { SETUP_ERRORS, SETUP_STEPS } from '../strings/setup';

/*
 * Setup as a list of named steps, worked out before anything runs, so the page
 * can show the whole list up front and tick each one off as it goes.
 *
 * Only what is missing or wrong makes it into the plan: on a fresh site that is
 * everything; on a site that drifted it is just the fix.
 */

export type StepKind =
  | 'makeList' | 'addColumns' | 'addChoices' | 'views' | 'settings' | 'staffAccess'
  | 'makeGroup' | 'reviewersAccess';
export type StepState = 'waiting' | 'running' | 'done' | 'failed' | 'skipped';

/* Steps that let the reviewers group in somewhere, so can't run without it. */
const NEEDS_GROUP: StepKind[] = ['reviewersAccess'];

/** What a failed step can leave unmade: a list, or the reviewers group. */
export type Unmade = ListKey | 'reviewers';

export interface IListSettings {
  Hidden?: boolean;
  NoCrawl?: boolean;
  EnableVersioning?: boolean;
  ReadSecurity?: number;
  WriteSecurity?: number;
}

export interface IStep {
  id: string;
  kind: StepKind;
  /** The list it works on. Missing for the reviewers group. */
  list?: ListKey;
  label: string;
  /** addColumns: the internal names to add. */
  fields?: string[];
  /** settings: what to change. */
  settings?: IListSettings;
  /** addChoices: the column, and every choice it should end up with (what it has, then the new ones). */
  choices?: { field: string; all: string[] };
  state: StepState;
  error?: string;
}

/** List settings that differ from the schema. `now` is undefined for a list about to be made. */
function settingsToChange(def: IListDef, now: IListState | undefined): IListSettings {
  const s: IListSettings = {};
  if (now ? now.hidden !== def.hidden : def.hidden) s.Hidden = def.hidden;
  if (!def.searchable && (!now || now.noCrawl !== true)) s.NoCrawl = true;
  if (!def.keepVersions && (!now || now.versioning)) s.EnableVersioning = false;
  if (writesOwnRows(def) && (!now || now.readSecurity !== ALL_ROWS || now.writeSecurity !== OWN_ROWS)) {
    s.ReadSecurity = ALL_ROWS;
    s.WriteSecurity = OWN_ROWS;
  }
  return s;
}

function describeSettings(def: IListDef, s: IListSettings): string {
  const parts: string[] = [];
  if (s.Hidden === true) parts.push(SETUP_STEPS.hide);
  if (s.Hidden === false) parts.push(SETUP_STEPS.show);
  if (s.NoCrawl) parts.push(SETUP_STEPS.noSearch);
  if (s.EnableVersioning === false) parts.push(SETUP_STEPS.noVersions);
  if (s.WriteSecurity === OWN_ROWS) parts.push(SETUP_STEPS.ownRows);
  return SETUP_STEPS.settings(def.title, inWords(parts));
}

/**
 * Every choice a column should end up with: all it has, in its own order,
 * with each new one put in after the one the tool lists before it. So
 * Under review goes in after Submitted, not at the bottom.
 */
export function mergeChoices(have: string[], want: string[]): string[] {
  const out = have.slice();
  want.forEach((c, i) => {
    if (out.indexOf(c) > -1) return;
    let at = 0;
    for (let j = i - 1; j >= 0; j--) {
      const k = out.indexOf(want[j]);
      if (k > -1) {
        at = k + 1;
        break;
      }
    }
    out.splice(at, 0, c);
  });
  return out;
}

export function planSetup(state: ToolState, everyoneLogin: string): IStep[] {
  const steps: IStep[] = [];
  const add = (def: IListDef, kind: StepKind, label: string, extra: Partial<IStep> = {}): void => {
    steps.push({ id: `${def.key}:${kind}`, kind, list: def.key, label, state: 'waiting', ...extra });
  };

  for (const def of TOOL_LISTS) {
    const now = state[def.key];
    const isNew = !now || !now.exists;

    // A list the person looking can't change is for IT to fix.
    if (!isNew && !now.canManage) continue;

    if (isNew) add(def, 'makeList', SETUP_STEPS.makeList(def.title));

    const missing = missingFields(def, isNew ? undefined : now);
    if (missing.length === 1) {
      add(def, 'addColumns', SETUP_STEPS.addColumn(missing[0].title, def.title), { fields: [missing[0].name] });
    } else if (missing.length > 1) {
      add(def, 'addColumns', SETUP_STEPS.addColumns(missing.length, def.title), { fields: missing.map(f => f.name) });
    }

    if (!isNew) {
      missingChoices(def, now).forEach(m => {
        const have = (now.choices && now.choices[m.name]) || [];
        const want = def.fields.filter(f => f.name === m.name)[0].choices || [];
        add(def, 'addChoices', SETUP_STEPS.addChoices(inWords(m.choices), m.title, def.title),
          { choices: { field: m.name, all: mergeChoices(have, want) } });
      });
    }

    // Views only on the first run, so changes made by hand afterwards stay put.
    if (isNew) add(def, 'views', SETUP_STEPS.setUpViews(def.views.map(v => v.title)));

    const settings = settingsToChange(def, isNew ? undefined : now);
    if (Object.keys(settings).length) add(def, 'settings', describeSettings(def, settings), { settings });

    if (def.access === 'site') continue;

    // Goes in unless the check is sure it isn't needed.
    if (isNew || staffLetIn(now, everyoneLogin) !== true) {
      add(def, 'staffAccess', SETUP_STEPS.staffAddOwn(def.title));
    }
  }

  // Reviewers come last, once every list is right.
  if (!state.reviewers) return steps;
  const groupId = reviewersGroupId(state);
  if (groupId === undefined) {
    steps.push({ id: 'reviewers:makeGroup', kind: 'makeGroup', label: SETUP_STEPS.makeGroup, state: 'waiting' });
  }
  for (const def of TOOL_LISTS) {
    if (!def.reviewers) continue;
    const now = state[def.key];
    const isNew = !now || !now.exists;
    if (!isNew && !now.canManage) continue;
    if (isNew || groupId === undefined || reviewersCanChange(now, groupId) !== true) {
      add(def, 'reviewersAccess', SETUP_STEPS.reviewersAccess(def.title));
    }
  }
  return steps;
}

/**
 * Why a step can't run, when an earlier one failed to make what it needs:
 * the list it works on, or the reviewers group.
 */
export function skipReason(step: IStep, unmade: Set<Unmade>): string | undefined {
  if (step.list && unmade.has(step.list)) return SETUP_ERRORS.skippedNoList(listDef(step.list).title);
  if (NEEDS_GROUP.indexOf(step.kind) > -1 && unmade.has('reviewers')) return SETUP_ERRORS.skippedNoGroup;
  return undefined;
}

/*
 * Changing the areas an idea can be in: adding one, renaming one, taking one
 * off, putting them in order, giving one a colour and picking where new ideas
 * start. Nothing in here talks to the site.
 */
import { DEFAULT_AREA } from '../setup/schema';
import { IIdea } from './types';
import { AreaColors } from './areaColors';
import { AREAS_PAGE } from '../strings/areas';

/** The areas an idea can be in, as the column has them now, and the one a new idea starts with. */
export interface IAreas {
  choices: string[];
  byDefault: string;
  /** Each area's pill colour. Areas with none aren't in it. */
  colors: AreaColors;
}

/** The longest an area's name can be: SharePoint's limit for a choice. */
export const AREA_MAX = 255;

export type AreaChange =
  | { kind: 'add'; name: string }
  | { kind: 'rename'; from: string; to: string }
  | { kind: 'remove'; name: string }
  | { kind: 'move'; name: string; by: -1 | 1 }
  | { kind: 'byDefault'; name: string }
  /** An empty colour takes it off. */
  | { kind: 'color'; name: string; color: string };

const same = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

/**
 * What's wrong with a name for an area, or undefined when it will do. When
 * renaming, `was` is the area's name now, so changing only its capitals is fine.
 */
export function areaNameProblem(name: string, choices: string[], was?: string): string | undefined {
  const t = name.trim();
  if (!t) return AREAS_PAGE.nameNeeded;
  if (t.length > AREA_MAX) return AREAS_PAGE.nameTooLong(AREA_MAX);
  const clash = choices.filter(c => same(c, t) && c !== was)[0];
  return clash ? AREAS_PAGE.nameTaken(clash) : undefined;
}

/* The colours with one area's taken off, or moved to its new name. */
function colorsWithout(colors: AreaColors, name: string, movedTo?: string): AreaColors {
  const out: AreaColors = {};
  Object.keys(colors).forEach(a => {
    if (a !== name) out[a] = colors[a];
    else if (movedTo) out[movedTo] = colors[a];
  });
  return out;
}

/* A new area goes last, or just before Other when that's last, so Other stays at the end. */
function withAdded(choices: string[], name: string): string[] {
  const last = choices.length - 1;
  return last >= 0 && choices[last] === DEFAULT_AREA
    ? choices.slice(0, last).concat(name, DEFAULT_AREA)
    : choices.concat(name);
}

/**
 * The areas after one change. It's made to the areas as the column has them
 * at the time, which may not be what the page showed, so someone else's
 * change made in between isn't lost.
 */
export function changedAreas(now: IAreas, change: AreaChange): IAreas {
  const { choices, byDefault, colors } = now;
  switch (change.kind) {
    case 'add': {
      const name = change.name.trim();
      const problem = areaNameProblem(name, choices);
      if (problem) throw new Error(problem);
      return { choices: withAdded(choices, name), byDefault, colors };
    }
    case 'rename': {
      const to = change.to.trim();
      if (choices.indexOf(change.from) < 0) throw new Error(AREAS_PAGE.gone(change.from));
      const problem = areaNameProblem(to, choices, change.from);
      if (problem) throw new Error(problem);
      return {
        choices: choices.map(c => (c === change.from ? to : c)),
        byDefault: byDefault === change.from ? to : byDefault,
        colors: colorsWithout(colors, change.from, to)
      };
    }
    case 'remove': {
      if (choices.indexOf(change.name) < 0) return now;
      const left = choices.filter(c => c !== change.name);
      if (!left.length) throw new Error(AREAS_PAGE.lastOne);
      const keep = left.indexOf(byDefault) > -1 ? byDefault : left.indexOf(DEFAULT_AREA) > -1 ? DEFAULT_AREA : left[0];
      return { choices: left, byDefault: keep, colors: colorsWithout(colors, change.name) };
    }
    case 'move': {
      const from = choices.indexOf(change.name);
      const to = from + change.by;
      if (from < 0 || to < 0 || to >= choices.length) return now;
      const moved = choices.slice();
      moved[from] = moved[to];
      moved[to] = change.name;
      return { choices: moved, byDefault, colors };
    }
    case 'byDefault':
      if (choices.indexOf(change.name) < 0) throw new Error(AREAS_PAGE.gone(change.name));
      return { choices, byDefault: change.name, colors };
    case 'color': {
      if (choices.indexOf(change.name) < 0) throw new Error(AREAS_PAGE.gone(change.name));
      const next = colorsWithout(colors, change.name);
      if (change.color) next[change.name] = change.color;
      return { choices, byDefault, colors: next };
    }
  }
}

/** The same areas, in the same order and colours, with new ideas starting in the same one. */
export function sameAreas(a: IAreas, b: IAreas): boolean {
  const ac = Object.keys(a.colors);
  return a.byDefault === b.byDefault &&
    a.choices.length === b.choices.length && a.choices.every((c, i) => c === b.choices[i]) &&
    ac.length === Object.keys(b.colors).length && ac.every(k => a.colors[k] === b.colors[k]);
}

/** How many ideas are in each area. */
export function areaCounts(ideas: IIdea[]): Record<string, number> {
  const counts: Record<string, number> = {};
  ideas.forEach(i => { if (i.area) counts[i.area] = (counts[i.area] || 0) + 1; });
  return counts;
}

import * as React from 'react';
import {
  DefaultButton, Dropdown, IContextualMenuItem, ITextField, IconButton, MessageBar, MessageBarType, PrimaryButton, Spinner, SpinnerSize,
  TextField
} from '@fluentui/react';
import styles from '../Kaizen.module.scss';
import type { SPFI } from '../../sp';
import type { ListIds } from '../../setup/schema';
import { AreaChange, IAreas, areaCounts, areaNameProblem, changedAreas, sameAreas } from '../../ideas/areas';
import { changeAreas, ideasInArea, moveIdeas, readAreas } from '../../ideas/ideaStore';
import type { IIdea } from '../../ideas/types';
import { explain } from '../../setup/errors';
import { COMMON } from '../../strings/common';
import { AREAS_PAGE, AREA_COLOR_NAMES } from '../../strings/areas';
import { AREA_COLORS } from '../../ideas/areaColors';
import AreaPill from '../AreaPill';

export interface IAreasPageProps {
  sp: SPFI;
  ids: ListIds;
  areas: IAreas;
  ideas: IIdea[];
  /** The areas as they are after a change. */
  onAreas: (areas: IAreas) => void;
  /** An idea moved to another area, as a rename carries its ideas along. */
  onIdeaMoved: (id: number, area: string) => void;
  /** An area renamed, so anything showing the old name can follow. */
  onRenamed: (from: string, to: string) => void;
  onUnsavedChange: (unsaved: boolean) => void;
}

/* A button the keyboard should be on once the list has redrawn, since a row that moves can lose it. */
interface IFocus {
  area: string;
  act: 'up' | 'down' | 'rename' | 'remove';
}

/* A rename where the column changed but some of its ideas didn't move, for Try again. */
interface IStranded {
  from: string;
  to: string;
}

/*
 * The areas people pick from when they share an idea. Reviewers and site
 * owners add, rename, take off, reorder and colour them here.
 *
 * Each change shows at once and saves in the background, one after another in
 * the order they were made, so clicking Move up three times moves it three
 * places without the page stopping in between. If one doesn't save, the page
 * says so and goes back to what the column really has. Renaming an area moves
 * its ideas too.
 */
const AreasPage: React.FC<IAreasPageProps> = ({
  sp, ids, areas, ideas, onAreas, onIdeaMoved, onRenamed, onUnsavedChange
}) => {
  const [adding, setAdding] = React.useState('');
  const [addError, setAddError] = React.useState<string | undefined>();
  const [renaming, setRenaming] = React.useState<{ from: string; to: string; error?: string } | undefined>();
  // What is being saved, while anything is.
  const [saving, setSaving] = React.useState<string | undefined>();
  // What the last change did, for screen readers and anyone who looked away.
  const [said, setSaid] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const [stranded, setStranded] = React.useState<IStranded | undefined>();
  const rootRef = React.useRef<HTMLElement>(null);
  const addBox = React.useRef<ITextField>(null);
  const refocus = React.useRef<IFocus | 'add' | undefined>();
  const alive = React.useRef(true);
  // The areas as this page last showed them, so changes made in quick succession build on each other.
  const shown = React.useRef(areas);
  shown.current = areas;
  // The saves still to finish, in order, and how many there are.
  const queue = React.useRef<Promise<void>>(Promise.resolve());
  const waiting = React.useRef(0);
  // What the column had after the latest save, to settle on once they've all finished.
  const settled = React.useRef<IAreas | undefined>();

  React.useEffect(() => () => { alive.current = false; }, []);

  const counts = React.useMemo(() => areaCounts(ideas), [ideas]);
  const { choices, byDefault, colors } = areas;

  const unsaved = !!adding.trim() || (!!renaming && renaming.to.trim() !== renaming.from);
  React.useEffect(() => { onUnsavedChange(unsaved); }, [unsaved]);
  React.useEffect(() => () => onUnsavedChange(false), []);

  // After the list redraws: back to the button that was pressed, or the nearest one that can be.
  React.useEffect(() => {
    const want = refocus.current;
    const root = rootRef.current;
    if (!want || !root) return;
    refocus.current = undefined;
    if (want === 'add') {
      if (addBox.current) addBox.current.focus();
      return;
    }
    const buttons = Array.prototype.slice.call(root.querySelectorAll('[data-focus]')) as HTMLElement[];
    const find = (act: string, area: string): HTMLElement | undefined =>
      buttons.filter(b => b.getAttribute('data-focus') === `${act}:${area}` && !b.hasAttribute('disabled'))[0];
    // Moved to the top or bottom, so that way can't be pressed again: the other way instead.
    const other = want.act === 'up' ? 'down' : want.act === 'down' ? 'up' : want.act;
    const target = find(want.act, want.area) || find(other, want.area);
    if (target) {
      if (document.activeElement !== target) target.focus();
    } else if (addBox.current) {
      addBox.current.focus();
    }
  });

  /* After a rename has saved: every idea still in the old area goes to the new one. */
  const carryIdeas = async (from: string, to: string): Promise<void> => {
    const moving = await ideasInArea(sp, ids, from);
    if (!moving.length) return;
    if (alive.current) setSaving(AREAS_PAGE.movingIdeas(moving.length, to));
    try {
      await moveIdeas(sp, ids, moving, to, id => { if (alive.current) onIdeaMoved(id, to); });
      if (alive.current) setSaid(AREAS_PAGE.renamedWithIdeas(from, to, moving.length));
    } finally {
      if (alive.current) setSaving(AREAS_PAGE.saving);
    }
  };

  /* One save done. Once the last has, the page settles on what the column really has. */
  const finished = (): void => {
    waiting.current--;
    if (!alive.current || waiting.current > 0) return;
    setSaving(undefined);
    const last = settled.current;
    settled.current = undefined;
    if (last && !sameAreas(last, shown.current)) onAreas(last);
  };

  const retryCarry = (s: IStranded): void => {
    setError(undefined);
    setStranded(undefined);
    setSaving(AREAS_PAGE.saving);
    waiting.current++;
    queue.current = queue.current.then(async () => {
      try {
        await carryIdeas(s.from, s.to);
      } catch (e) {
        if (alive.current) {
          setStranded(s);
          setError(AREAS_PAGE.ideasLeft(s.from, s.to, explain(e)));
        }
      }
      finished();
    });
  };

  /*
   * Shows a change at once, then saves it behind any still saving. Says what
   * it did once it has. Hands back false, with nothing changed, when the
   * change can't be made to what's showing.
   */
  const apply = (change: AreaChange, message: string, after?: () => Promise<void>): boolean => {
    let next: IAreas;
    try {
      next = changedAreas(shown.current, change);
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
    shown.current = next;
    onAreas(next);
    setError(undefined);
    setStranded(undefined);
    setSaid('');
    setSaving(AREAS_PAGE.saving);
    waiting.current++;
    queue.current = queue.current.then(async () => {
      try {
        settled.current = await changeAreas(sp, ids, change);
        if (alive.current) setSaid(message);
      } catch (e) {
        if (alive.current) setError(AREAS_PAGE.failed(explain(e)));
        // Back to what the column really has.
        settled.current = await readAreas(sp, ids).catch(() => settled.current);
        finished();
        return;
      }
      if (after) {
        try {
          await after();
        } catch (e) {
          if (alive.current && change.kind === 'rename') {
            setStranded({ from: change.from, to: change.to.trim() });
            setError(AREAS_PAGE.ideasLeft(change.from, change.to.trim(), explain(e)));
          }
        }
      }
      finished();
    });
    return true;
  };

  const add = (): void => {
    const name = adding.trim();
    const problem = areaNameProblem(name, shown.current.choices);
    setAddError(problem);
    if (problem) return;
    if (apply({ kind: 'add', name }, AREAS_PAGE.added(name))) setAdding('');
  };

  const rename = (): void => {
    if (!renaming) return;
    const { from } = renaming;
    const to = renaming.to.trim();
    refocus.current = { area: to === from ? from : to, act: 'rename' };
    if (to === from) {
      setRenaming(undefined);
      return;
    }
    const problem = areaNameProblem(to, shown.current.choices, from);
    if (problem) {
      refocus.current = undefined;
      setRenaming({ ...renaming, error: problem });
      return;
    }
    if (!apply({ kind: 'rename', from, to }, AREAS_PAGE.renamed(from, to), () => carryIdeas(from, to))) return;
    setRenaming(undefined);
    onRenamed(from, to);
  };

  const cancelRename = (): void => {
    if (renaming) refocus.current = { area: renaming.from, act: 'rename' };
    setRenaming(undefined);
  };

  const remove = (name: string): void => {
    // Its row goes, so the keyboard goes to the row that takes its place, or the one above at the bottom.
    const at = choices.indexOf(name);
    const near = choices[at + 1] || choices[at - 1];
    refocus.current = near ? { area: near, act: 'remove' } : 'add';
    apply({ kind: 'remove', name }, AREAS_PAGE.removed(name, counts[name] || 0));
  };

  const setColor = (name: string, color: string): void => {
    if ((colors[name] || '') === color) return;
    apply({ kind: 'color', name, color },
      color ? AREAS_PAGE.colored(name, AREA_COLOR_NAMES[color] || color) : AREAS_PAGE.uncolored(name));
  };

  /* The colours to pick from for one area, each with a swatch, the one it has ticked. */
  const colorItems = (name: string): IContextualMenuItem[] => [
    {
      key: '', text: AREAS_PAGE.noColor, canCheck: true, checked: !colors[name],
      onRenderIcon: () => <span className={`${styles.swatch} ${styles.swatchPlain}`} />,
      onClick: () => setColor(name, '')
    },
    ...AREA_COLORS.map((c): IContextualMenuItem => ({
      key: c.key, text: AREA_COLOR_NAMES[c.key] || c.key, canCheck: true, checked: colors[name] === c.key,
      onRenderIcon: () => <span className={styles.swatch} style={{ background: c.background, borderColor: c.text }} />,
      onClick: () => setColor(name, c.key)
    }))
  ];

  const move = (name: string, by: -1 | 1): void => {
    refocus.current = { area: name, act: by < 0 ? 'up' : 'down' };
    apply({ kind: 'move', name, by }, AREAS_PAGE.moved(name));
  };

  return (
    <section ref={rootRef} className={styles.section}>
      <h2>{AREAS_PAGE.title}</h2>
      <p className={styles.intro}>{AREAS_PAGE.intro}</p>

      <ul className={styles.people}>
        {choices.map((a, i) => (
          <li key={a} className={styles.person}>
            {renaming && renaming.from === a ? (
              <form className={styles.areaEdit} noValidate onSubmit={e => { e.preventDefault(); rename(); }}>
                <TextField
                  className={styles.areaBox}
                  ariaLabel={AREAS_PAGE.renameLabel(a)}
                  value={renaming.to}
                  errorMessage={renaming.error}
                  maxLength={255}
                  autoFocus
                  onChange={(_, v) => setRenaming({ from: a, to: v || '' })}
                  onKeyDown={e => { if (e.key === 'Escape') cancelRename(); }}
                />
                <div className={styles.actions}>
                  <PrimaryButton type="submit" text={COMMON.save} />
                  <DefaultButton text={COMMON.cancel} onClick={cancelRename} />
                </div>
              </form>
            ) : (
              <>
                <span className={styles.areaName}>
                  <AreaPill area={a} colors={colors} className={styles.areaPill} />
                  <span className={styles.hint}>
                    {AREAS_PAGE.count(counts[a] || 0)}
                    {a === byDefault && <> · {AREAS_PAGE.startsHere}</>}
                  </span>
                </span>
                <span className={styles.areaActions}>
                  <IconButton
                    iconProps={{ iconName: 'Color' }}
                    ariaLabel={AREAS_PAGE.color(a)} title={AREAS_PAGE.color(a)}
                    menuProps={{ items: colorItems(a) }}
                    onRenderMenuIcon={() => null}
                  />
                  <IconButton
                    data-focus={`up:${a}`} iconProps={{ iconName: 'ChevronUp' }}
                    ariaLabel={AREAS_PAGE.moveUp(a)} title={AREAS_PAGE.moveUp(a)}
                    disabled={i === 0} onClick={() => move(a, -1)}
                  />
                  <IconButton
                    data-focus={`down:${a}`} iconProps={{ iconName: 'ChevronDown' }}
                    ariaLabel={AREAS_PAGE.moveDown(a)} title={AREAS_PAGE.moveDown(a)}
                    disabled={i === choices.length - 1} onClick={() => move(a, 1)}
                  />
                  <IconButton
                    data-focus={`rename:${a}`} iconProps={{ iconName: 'Edit' }}
                    ariaLabel={AREAS_PAGE.rename(a)} title={AREAS_PAGE.rename(a)}
                    disabled={!!renaming} onClick={() => setRenaming({ from: a, to: a })}
                  />
                  <IconButton
                    data-focus={`remove:${a}`} iconProps={{ iconName: 'Cancel' }}
                    ariaLabel={AREAS_PAGE.remove(a)} title={AREAS_PAGE.remove(a)}
                    disabled={choices.length < 2} onClick={() => remove(a)}
                  />
                </span>
              </>
            )}
          </li>
        ))}
      </ul>

      <form className={styles.areaAdd} noValidate onSubmit={e => { e.preventDefault(); add(); }}>
        <TextField
          componentRef={addBox}
          className={styles.areaBox}
          label={AREAS_PAGE.addLabel}
          placeholder={AREAS_PAGE.addPlaceholder}
          value={adding}
          errorMessage={addError}
          maxLength={255}
          onChange={(_, v) => { setAdding(v || ''); setAddError(undefined); }}
        />
        <DefaultButton type="submit" className={styles.areaAddButton} text={AREAS_PAGE.add} />
      </form>

      <Dropdown
        className={styles.areaDefault}
        label={AREAS_PAGE.defaultLabel}
        options={choices.map(a => ({ key: a, text: a }))}
        selectedKey={byDefault}
        onChange={(_, o) => {
          if (!o || o.key === byDefault) return;
          const name = String(o.key);
          apply({ kind: 'byDefault', name }, AREAS_PAGE.startsIn(name));
        }}
      />

      <div className={styles.peopleStatus}>
        {/* Only shows if saving takes a moment, so a quick change doesn't flash it. */}
        {saving && <Spinner className={styles.slowOnly} size={SpinnerSize.small} label={saving} labelPosition="right" />}
        {/* Always there, so screen readers hear it when it changes. */}
        <span className={styles.saved} role="status">{saving ? '' : said}</span>
      </div>

      {error && (
        <MessageBar
          messageBarType={MessageBarType.error} isMultiline
          onDismiss={() => { setError(undefined); setStranded(undefined); }} dismissButtonAriaLabel={COMMON.close}
          actions={stranded && (
            <DefaultButton text={COMMON.tryAgain} onClick={() => retryCarry(stranded)} />
          )}
        >
          {error}
        </MessageBar>
      )}
    </section>
  );
};

export default AreasPage;

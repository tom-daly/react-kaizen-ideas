import * as React from 'react';
import {
  DefaultButton, IBasePicker, IconButton, IPersonaProps, MessageBar, MessageBarType, NormalPeoplePicker, Persona,
  PersonaSize, Spinner, SpinnerSize
} from '@fluentui/react';
import styles from '../Kaizen.module.scss';
import type { SPFI } from '../../sp';
import type { ISiteInfo } from '../../setup/problems';
import { sameLogin } from '../../setup/permissions';
import {
  IReviewer, IPersonFound, addReviewer, byName, loadReviewers, removeReviewer, searchPeople
} from '../../ideas/reviewers';
import { explain } from '../../setup/errors';
import { COMMON } from '../../strings/common';
import { REVIEWERS_PAGE } from '../../strings/reviewers';

export interface IReviewersPageProps {
  sp: SPFI;
  site: ISiteInfo;
}

type Load =
  | { kind: 'loading' }
  | { kind: 'failed'; message: string }
  /** A site where the group has gone since setup. Fix it makes it again. */
  | { kind: 'noGroup' }
  | { kind: 'ready'; groupId: number; people: IReviewer[] };

/* A search result, carrying who it is so picking it can add them. */
interface IFoundPersona extends IPersonaProps {
  person: IPersonFound;
}

/*
 * Who the reviewers are. Site owners add and remove them here, and each
 * change saves straight away. Reviewers see the list but can't change it.
 */
const ReviewersPage: React.FC<IReviewersPageProps> = ({ sp, site }) => {
  const [load, setLoad] = React.useState<Load>({ kind: 'loading' });
  // What is being saved, like "Adding Megan…", while it is.
  const [saving, setSaving] = React.useState<string | undefined>();
  // What the last change did, for screen readers and anyone who looked away.
  const [said, setSaid] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const picker = React.useRef<IBasePicker<IPersonaProps>>(null);
  // Set when a change starts, so the keyboard goes back to the search box once it's done.
  const refocus = React.useRef(false);
  const alive = React.useRef(true);
  const canChange = site.isOwner;

  React.useEffect(() => () => { alive.current = false; }, []);

  const read = React.useCallback(async (): Promise<void> => {
    setLoad({ kind: 'loading' });
    try {
      const got = await loadReviewers(sp);
      if (alive.current) setLoad(got ? { kind: 'ready', ...got } : { kind: 'noGroup' });
    } catch (e) {
      if (alive.current) setLoad({ kind: 'failed', message: explain(e) });
    }
  }, [sp]);

  React.useEffect(() => { read().catch(() => undefined); }, [read]);

  // The search box is switched off while saving, so it can only take focus back afterwards.
  React.useEffect(() => {
    if (saving || !refocus.current) return;
    refocus.current = false;
    if (picker.current) picker.current.focusInput();
  }, [saving]);

  const people = load.kind === 'ready' ? load.people : [];

  const suggest = async (text: string): Promise<IPersonaProps[]> => {
    const typed = text.trim();
    if (typed.length < 2) return [];
    try {
      const found = await searchPeople(sp, typed);
      // Nobody who is a reviewer already.
      const fresh = found.filter(f =>
        !people.some(p => sameLogin(p.login, f.login) || (!!p.email && sameLogin(p.email, f.email))));
      return fresh.map((f): IFoundPersona => ({ key: f.login, text: f.name, secondaryText: f.email, person: f }));
    } catch (e) {
      if (alive.current) setError(REVIEWERS_PAGE.searchFailed(explain(e)));
      return [];
    }
  };

  const add = async (person: IPersonFound): Promise<void> => {
    if (load.kind !== 'ready') return;
    refocus.current = true;
    setSaving(REVIEWERS_PAGE.adding(person.name));
    setSaid('');
    setError(undefined);
    try {
      const added = await addReviewer(sp, load.groupId, person.login);
      if (!alive.current) return;
      setLoad(l => (l.kind === 'ready'
        ? { ...l, people: byName(l.people.filter(p => p.id !== added.id).concat(added)) }
        : l));
      setSaid(REVIEWERS_PAGE.added(added.name));
    } catch (e) {
      if (alive.current) setError(REVIEWERS_PAGE.addFailed(person.name, explain(e)));
    } finally {
      if (alive.current) setSaving(undefined);
    }
  };

  const remove = async (person: IReviewer): Promise<void> => {
    if (load.kind !== 'ready') return;
    // Their button goes with them, so the keyboard goes to the search box.
    refocus.current = true;
    setSaving(REVIEWERS_PAGE.removing(person.name));
    setSaid('');
    setError(undefined);
    try {
      await removeReviewer(sp, load.groupId, person.id);
      if (!alive.current) return;
      setLoad(l => (l.kind === 'ready' ? { ...l, people: l.people.filter(p => p.id !== person.id) } : l));
      setSaid(REVIEWERS_PAGE.removed(person.name));
    } catch (e) {
      if (alive.current) setError(REVIEWERS_PAGE.removeFailed(person.name, explain(e)));
    } finally {
      if (alive.current) setSaving(undefined);
    }
  };

  return (
    <section className={styles.section}>
      <h2>{REVIEWERS_PAGE.title}</h2>
      <p className={styles.intro}>{REVIEWERS_PAGE.intro}</p>

      {load.kind === 'loading' && (
        <Spinner size={SpinnerSize.small} label={REVIEWERS_PAGE.loading} labelPosition="right" />
      )}

      {load.kind === 'failed' && (
        <MessageBar
          messageBarType={MessageBarType.error} isMultiline
          actions={<DefaultButton text={COMMON.tryAgain} onClick={() => { read().catch(() => undefined); }} />}
        >
          {REVIEWERS_PAGE.loadFailed(load.message)}
        </MessageBar>
      )}

      {load.kind === 'noGroup' && (
        <MessageBar messageBarType={MessageBarType.info}>{REVIEWERS_PAGE.noGroup}</MessageBar>
      )}

      {load.kind === 'ready' && (
        <>
          {people.length === 0 ? (
            <p className={styles.hint}>{REVIEWERS_PAGE.none}</p>
          ) : (
            <ul className={styles.people}>
              {people.map(p => (
                <li key={p.id} className={styles.person}>
                  <Persona text={p.name} secondaryText={p.email} size={PersonaSize.size32} />
                  {canChange && (
                    <IconButton
                      iconProps={{ iconName: 'Cancel' }} ariaLabel={REVIEWERS_PAGE.removeLabel(p.name)}
                      title={REVIEWERS_PAGE.removeLabel(p.name)}
                      disabled={!!saving} onClick={() => { remove(p).catch(() => undefined); }}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* The box never holds anyone: picking a person adds them to the group there and then. */}
          {canChange ? (
            <div className={styles.addPerson}>
              <NormalPeoplePicker
                componentRef={picker}
                label={REVIEWERS_PAGE.addLabel}
                selectedItems={[]}
                onResolveSuggestions={suggest}
                onChange={items => {
                  const picked = items && (items[0] as IFoundPersona | undefined);
                  if (picked && picked.person) add(picked.person).catch(() => undefined);
                }}
                resolveDelay={300}
                disabled={!!saving}
                pickerSuggestionsProps={{
                  suggestionsHeaderText: REVIEWERS_PAGE.pickerHeader,
                  noResultsFoundText: REVIEWERS_PAGE.pickerNoResults,
                  loadingText: REVIEWERS_PAGE.pickerSearching
                }}
              />
            </div>
          ) : (
            <p className={styles.hint}>{REVIEWERS_PAGE.askOwner}</p>
          )}

          <div className={styles.peopleStatus}>
            {saving && <Spinner size={SpinnerSize.small} label={saving} labelPosition="right" />}
            {/* Always there, so screen readers hear it when it changes. */}
            <span className={styles.saved} role="status">{saving ? '' : said}</span>
          </div>

          {error && (
            <MessageBar
              messageBarType={MessageBarType.error} isMultiline
              onDismiss={() => setError(undefined)} dismissButtonAriaLabel={COMMON.close}
            >
              {error}
            </MessageBar>
          )}
        </>
      )}
    </section>
  );
};

export default ReviewersPage;

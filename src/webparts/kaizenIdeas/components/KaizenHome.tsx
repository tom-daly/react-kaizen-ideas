import * as React from 'react';
import { MessageBar, MessageBarType, Spinner, SpinnerSize } from '@fluentui/react';
import styles from './KaizenIdeas.module.scss';
import type { SPFI } from '../sp';
import type { ListIds } from '../setup/schema';
import type { ISiteInfo, IProblem } from '../setup/problems';
import { IBoardData, addVote, loadBoard, removeVotes } from '../ideas/ideaStore';
import { DEFAULT_QUERY, IBoardQuery } from '../ideas/board';
import { tallyVotes, votesFor } from '../ideas/votes';
import type { IIdea } from '../ideas/types';
import { explain } from '../setup/errors';
import { useLoad } from './useLoad';
import Nav, { Tab } from './Nav';
import Board from './board/Board';
import IdeaPage from './idea/IdeaPage';
import IdeaForm from './form/IdeaForm';
import ReviewersPage from './reviewers/ReviewersPage';
import AreasPage from './areas/AreasPage';
import UnsavedBar from './UnsavedBar';
import LoadFailed from './LoadFailed';
import type { INotice } from './notice';
import { scrollToTopIfPast } from './scrollToTopIfPast';
import { BOARD, VOTE } from '../strings/board';
import { HOME } from '../strings/home';

export interface IKaizenHomeProps {
  sp: SPFI;
  site: ISiteInfo;
  ids: ListIds;
  /** Reviewers and site owners: they get the review panel and the Areas and Reviewers pages. */
  canReview: boolean;
  /** Only ever has anything for site owners. */
  needsIT: IProblem[];
  /** Shown once, straight after setup. */
  notice?: string;
}

/* The pages. Staff get the board, an idea, and the form. */
type View =
  | { page: 'board' }
  | { page: 'idea'; id: number }
  | { page: 'share' }
  | { page: 'edit'; id: number }
  | { page: 'areas' }
  | { page: 'reviewers' };

/* A page somebody asked to go to while something on this one wasn't saved. */
interface ILeave {
  view: View;
  fromNav: boolean;
}

const tabOf = (view: View): Tab => (view.page === 'reviewers' || view.page === 'areas' ? view.page : 'ideas');

const samePage = (a: View, b: View): boolean =>
  a.page === b.page && ('id' in a ? 'id' in b && a.id === b.id : true);

/* Changes whenever a different page shows, for the effect that brings it into view. */
const pageKey = (view: View): string => ('id' in view ? `${view.page}-${view.id}` : view.page);

/* The ideas as they are after one changes: put in place of the old one, or at the front if it's new. */
const withIdea = (ideas: IIdea[], idea: IIdea): IIdea[] =>
  ideas.some(i => i.id === idea.id) ? ideas.map(i => (i.id === idea.id ? idea : i)) : [idea, ...ideas];

/*
 * Everything once the lists are there. Everyone gets the board, each idea's
 * own page and the form to share one. Reviewers and site owners also get a row
 * of pages along the top, with the Areas and Reviewers pages.
 */
const KaizenHome: React.FC<IKaizenHomeProps> = ({ sp, site, ids, canReview, needsIT, notice }) => {
  const [view, setView] = React.useState<View>({ page: 'board' });
  const [query, setQuery] = React.useState<IBoardQuery>(DEFAULT_QUERY);
  // The ideas whose vote is being saved, so their button can't be pressed twice.
  const [voting, setVoting] = React.useState<number[]>([]);
  const [unsaved, setUnsaved] = React.useState(false);
  const [leaving, setLeaving] = React.useState<ILeave | undefined>();
  const [message, setMessage] = React.useState<INotice | undefined>(
    notice ? { type: MessageBarType.success, text: notice } : undefined);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const focusContent = React.useRef(false);
  const myId = site.currentUserId;

  const load = React.useCallback(() => loadBoard(sp, ids), [sp, ids]);
  const { data, error, setData, reload } = useLoad<IBoardData>(load);
  const tally = React.useMemo(() => tallyVotes(data ? data.votes : [], myId), [data, myId]);

  // Saved after all, so there's nothing left to ask about.
  React.useEffect(() => { if (!unsaved) setLeaving(undefined); }, [unsaved]);

  /* A new page starts at its top if the page had been scrolled past it. When it
     opened from anywhere but the row of pages, the button pressed has gone, so
     focus moves to the new page instead of getting lost. */
  const key = pageKey(view);
  React.useEffect(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content) return;
    scrollToTopIfPast(root);
    if (!focusContent.current) return;
    focusContent.current = false;
    // Unless the new page already put focus somewhere of its own, like its first box.
    const active = document.activeElement;
    const placed = active instanceof HTMLElement && active !== content && content.contains(active) &&
      active.offsetParent !== null;
    if (!placed) content.focus({ preventScroll: true });
  }, [key]);

  /* Straight to a page, with nothing to ask. */
  const show = (next: View, fromNav: boolean): void => {
    focusContent.current = !fromNav;
    setLeaving(undefined);
    setMessage(undefined);
    setView(next);
  };

  /* To a page because somebody asked to go there; checks first if something isn't saved. */
  const go = (next: View, fromNav = false): void => {
    if (samePage(next, view)) return;
    if (unsaved) setLeaving({ view: next, fromNav });
    else show(next, fromNav);
  };

  const goTab = (tab: Tab): void => go(tab === 'ideas' ? { page: 'board' } : { page: tab }, true);

  /* Changes the ideas held here, once the board has loaded. */
  const changeData = (change: (d: IBoardData) => IBoardData): void => {
    setData(d => (d ? change(d) : d));
  };

  const toggleVote = async (idea: IIdea): Promise<void> => {
    if (voting.indexOf(idea.id) > -1) return;
    setVoting(v => v.concat(idea.id));
    try {
      const mine = votesFor(tally, idea.id).mine;
      if (mine.length) {
        await removeVotes(sp, ids, mine);
        changeData(d => ({ ...d, votes: d.votes.filter(v => mine.indexOf(v.id) < 0) }));
      } else {
        const added = await addVote(sp, ids, idea, myId);
        changeData(d => ({ ...d, votes: d.votes.concat(added) }));
      }
    } catch (e) {
      setMessage({ type: MessageBarType.error, text: VOTE.failed(explain(e)) });
    } finally {
      setVoting(v => v.filter(id => id !== idea.id));
    }
  };

  const onVote = (idea: IIdea): void => { toggleVote(idea).catch(() => undefined); };

  const page = (d: IBoardData): JSX.Element | undefined => {
    switch (view.page) {
      case 'board':
        return (
          <Board
            data={d} tally={tally} myId={myId} query={query} onQuery={setQuery} voting={voting}
            onOpen={id => go({ page: 'idea', id })}
            onShare={() => go({ page: 'share' })}
            onVote={onVote}
          />
        );
      case 'idea': {
        const idea = d.ideas.filter(i => i.id === view.id)[0];
        return (
          <IdeaPage
            key={view.id}
            sp={sp} ids={ids} idea={idea} votes={idea ? votesFor(tally, idea.id) : undefined}
            voting={!!idea && voting.indexOf(idea.id) > -1}
            myId={myId} canReview={canReview} stages={d.stages} areaColors={d.areas.colors}
            onBack={() => go({ page: 'board' })}
            onVote={onVote}
            onEdit={() => go({ page: 'edit', id: view.id })}
            onDeleted={gone => {
              changeData(x => ({ ...x, ideas: x.ideas.filter(i => i.id !== gone.id) }));
              show({ page: 'board' }, false);
              setMessage({ type: MessageBarType.success, text: HOME.deleted(gone.title) });
            }}
            onReviewed={changed => changeData(x => ({ ...x, ideas: withIdea(x.ideas, changed) }))}
            onUnsavedChange={setUnsaved}
          />
        );
      }
      case 'share':
      case 'edit': {
        const editing = view.page === 'edit' ? d.ideas.filter(i => i.id === view.id)[0] : undefined;
        if (view.page === 'edit' && !editing) {
          // Gone since the board loaded: the idea page says so.
          return (
            <IdeaPage
              sp={sp} ids={ids} idea={undefined} votes={undefined} voting={false} myId={myId} canReview={false}
              stages={d.stages} areaColors={d.areas.colors} onBack={() => go({ page: 'board' })} onVote={onVote}
              onEdit={() => undefined}
              onDeleted={() => undefined} onReviewed={() => undefined} onUnsavedChange={setUnsaved}
            />
          );
        }
        return (
          <IdeaForm
            key={pageKey(view)}
            sp={sp} ids={ids} areas={d.areas} idea={editing}
            onCancel={() => show(editing ? { page: 'idea', id: editing.id } : { page: 'board' }, false)}
            onSaved={saved => {
              changeData(x => ({ ...x, ideas: withIdea(x.ideas, saved) }));
              setUnsaved(false);
              show({ page: 'idea', id: saved.id }, false);
              setMessage({
                type: MessageBarType.success, text: editing ? HOME.saved(saved.title) : HOME.shared(saved.title)
              });
            }}
            onUnsavedChange={setUnsaved}
          />
        );
      }
      case 'areas':
        return (
          <AreasPage
            sp={sp} ids={ids} areas={d.areas} ideas={d.ideas}
            onAreas={areas => changeData(x => ({ ...x, areas }))}
            onIdeaMoved={(id, area) => changeData(x => ({
              ...x, ideas: x.ideas.map(i => (i.id === id ? { ...i, area } : i))
            }))}
            onRenamed={(from, to) => setQuery(q => (q.area === from ? { ...q, area: to } : q))}
            onUnsavedChange={setUnsaved}
          />
        );
      case 'reviewers':
        // Shown without waiting for the ideas; see below.
        return undefined;
    }
  };

  return (
    <div ref={rootRef}>
      {(canReview || site.isOwner) && <Nav current={tabOf(view)} onGo={goTab} />}

      {site.isOwner && needsIT.length > 0 && (
        <MessageBar className={styles.message} messageBarType={MessageBarType.warning} isMultiline>
          <strong>{HOME.needsItLead}</strong>{' '}{HOME.needsItAsk}
          <ul>{needsIT.map((p, i) => <li key={i}>{p.text}</li>)}</ul>
        </MessageBar>
      )}

      {leaving && (
        <UnsavedBar
          onDiscard={() => {
            setUnsaved(false);
            show(leaving.view, leaving.fromNav);
          }}
          onKeep={() => setLeaving(undefined)}
          className={styles.barActions}
        />
      )}

      {message && (
        <MessageBar
          className={styles.message} messageBarType={message.type} isMultiline
          onDismiss={() => setMessage(undefined)}
        >
          {message.text}
        </MessageBar>
      )}

      <div ref={contentRef} tabIndex={-1} className={styles.content}>
        {/* The Reviewers page doesn't need the ideas, so it never waits for them. */}
        {view.page === 'reviewers' && <ReviewersPage sp={sp} site={site} />}
        {view.page !== 'reviewers' && data && page(data)}
        {view.page !== 'reviewers' && !data && !error && <Spinner size={SpinnerSize.large} label={BOARD.loading} />}
        {view.page !== 'reviewers' && !data && error && (
          <LoadFailed
            lead={BOARD.loadFailed} error={error} retryClassName={styles.actions}
            onRetry={() => { reload().catch(() => undefined); }}
          />
        )}
      </div>
    </div>
  );
};

export default KaizenHome;

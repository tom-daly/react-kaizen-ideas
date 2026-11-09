import * as React from 'react';
import { MessageBar, MessageBarType, Spinner, SpinnerSize } from '@fluentui/react';
import styles from './Kaizen.module.scss';
import type { IKaizenProps } from './IKaizenProps';
import { TOOL_LISTS, ListIds } from '../setup/schema';
import { IProblem, allListsExist, findProblems, listIds } from '../setup/problems';
import type { IStep } from '../setup/plan';
import { canReviewIdeas, readToolState } from '../setup/toolState';
import { runSetup } from '../setup/install';
import { explain } from '../setup/errors';
import { TOOL_OPENING } from '../strings/setup';
import SetupScreen from './SetupScreen';
import SetupProgress from './SetupProgress';
import KaizenHome from './KaizenHome';

type Status =
  | { kind: 'checking' }
  | { kind: 'failed'; message: string }
  | { kind: 'notOpen' }
  | { kind: 'setup'; firstTime: boolean; problems: IProblem[] }
  | { kind: 'installing'; steps?: IStep[]; finished: boolean }
  | { kind: 'ready'; ids: ListIds; canReview: boolean; needsIT: IProblem[]; notice?: string };

/*
 * Checks the site every time the page opens. Staff only need to know the lists
 * are there; site owners get the full check, so anything missing or changed by
 * hand shows up as something they can fix with one click.
 */
const Kaizen: React.FC<IKaizenProps> = ({ sp, site, padded }) => {
  const [status, setStatus] = React.useState<Status>({ kind: 'checking' });

  const check = React.useCallback(async (notice?: string): Promise<void> => {
    setStatus({ kind: 'checking' });
    try {
      const state = await readToolState(sp, site, site.isOwner);
      if (!site.isOwner) {
        if (!allListsExist(state)) {
          setStatus({ kind: 'notOpen' });
          return;
        }
        // Reviewers get the review panel and the Reviewers page; everyone else gets the board.
        const canReview = await canReviewIdeas(sp, state.ideas.id || '').catch(() => false);
        setStatus({ kind: 'ready', ids: listIds(state), canReview, needsIT: [] });
        return;
      }
      const problems = findProblems(state, site.everyoneLogin);
      if (problems.some(p => p.fixable)) {
        const firstTime = !TOOL_LISTS.some(def => state[def.key].exists);
        setStatus({ kind: 'setup', firstTime, problems });
      } else {
        setStatus({ kind: 'ready', ids: listIds(state), canReview: true, needsIT: problems, notice });
      }
    } catch (e) {
      setStatus({ kind: 'failed', message: explain(e) });
    }
  }, [sp, site]);

  React.useEffect(() => { check().catch(() => undefined); }, [check]);

  const setUp = async (): Promise<void> => {
    setStatus({ kind: 'installing', finished: false });
    try {
      const steps = await runSetup(sp, site, s => setStatus({ kind: 'installing', steps: s, finished: false }));
      if (steps.every(s => s.state === 'done')) {
        // A moment to see the last tick, then on to the board.
        await new Promise(resolve => setTimeout(resolve, 900));
        await check(TOOL_OPENING.setUpNotice);
        return;
      }
      setStatus({ kind: 'installing', steps, finished: true });
    } catch (e) {
      setStatus({ kind: 'failed', message: explain(e) });
    }
  };

  return (
    <section className={padded ? `${styles.kaizen} ${styles.padded}` : styles.kaizen}>
      {status.kind === 'checking' && <Spinner size={SpinnerSize.large} label={TOOL_OPENING.opening} />}

      {status.kind === 'failed' && (
        <MessageBar messageBarType={MessageBarType.error}>{TOOL_OPENING.couldNotOpen(status.message)}</MessageBar>
      )}

      {status.kind === 'notOpen' && (
        <div className={styles.notice}>
          <h2>{TOOL_OPENING.notOpenTitle}</h2>
          <p>{TOOL_OPENING.checkBackSoon}</p>
        </div>
      )}

      {status.kind === 'setup' && (
        <SetupScreen
          firstTime={status.firstTime}
          problems={status.problems}
          onRun={() => { setUp().catch(() => undefined); }}
        />
      )}

      {status.kind === 'installing' && (
        <SetupProgress
          steps={status.steps}
          finished={status.finished}
          onDone={() => { check().catch(() => undefined); }}
          onRetry={() => { setUp().catch(() => undefined); }}
        />
      )}

      {status.kind === 'ready' && (
        <KaizenHome
          sp={sp} site={site}
          ids={status.ids} canReview={status.canReview} needsIT={status.needsIT} notice={status.notice}
        />
      )}
    </section>
  );
};

export default Kaizen;

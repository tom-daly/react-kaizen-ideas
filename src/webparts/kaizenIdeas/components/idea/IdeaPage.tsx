import * as React from 'react';
import { DefaultButton, Link, MessageBar, MessageBarType, PrimaryButton } from '@fluentui/react';
import styles from './Idea.module.scss';
import type { SPFI } from '../../sp';
import type { ListIds } from '../../setup/schema';
import type { IIdea } from '../../ideas/types';
import type { IIdeaVotes } from '../../ideas/votes';
import { canChangeOwn } from '../../ideas/stages';
import { deleteIdea } from '../../ideas/ideaStore';
import { sharedOn } from '../../ideas/dates';
import { explain } from '../../setup/errors';
import VoteButton from '../board/VoteButton';
import StageBadge from '../board/StageBadge';
import AreaPill from '../AreaPill';
import type { AreaColors } from '../../ideas/areaColors';
import BackArrow from '../BackArrow';
import ReviewPanel from './ReviewPanel';
import { COMMON } from '../../strings/common';
import { CARD } from '../../strings/board';
import { IDEA_PAGE } from '../../strings/idea';

export interface IIdeaPageProps {
  sp: SPFI;
  ids: ListIds;
  /** Undefined when it has gone since the board loaded. */
  idea: IIdea | undefined;
  votes: IIdeaVotes | undefined;
  voting: boolean;
  myId: number;
  /** Reviewers and site owners get the review panel. */
  canReview: boolean;
  /** The stages the column has now. */
  stages: string[];
  /** Each area's pill colour. */
  areaColors: AreaColors;
  onBack: () => void;
  onVote: (idea: IIdea) => void;
  onEdit: () => void;
  onDeleted: (idea: IIdea) => void;
  onReviewed: (idea: IIdea) => void;
  onUnsavedChange: (unsaved: boolean) => void;
}

/* A part of the idea under its heading, line breaks kept. */
const Part: React.FC<{ heading: string; text: string; empty?: string }> = ({ heading, text, empty }) => (
  <section className={styles.part}>
    <h3>{heading}</h3>
    {text ? <p className={styles.text}>{text}</p> : <p className={styles.none}>{empty}</p>}
  </section>
);

/*
 * One idea in full, with its vote button. The person who shared it can change
 * or delete it until a reviewer picks it up; reviewers get the panel to move it on.
 */
const IdeaPage: React.FC<IIdeaPageProps> = ({
  sp, ids, idea, votes, voting, myId, canReview, stages, areaColors, onBack, onVote, onEdit, onDeleted, onReviewed,
  onUnsavedChange
}) => {
  const [confirming, setConfirming] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const alive = React.useRef(true);

  React.useEffect(() => () => { alive.current = false; }, []);

  const back = (
    <Link className={styles.back} onClick={onBack}><BackArrow />{COMMON.allIdeas}</Link>
  );

  if (!idea || !votes) {
    return (
      <div className={styles.page}>
        {back}
        <h2>{IDEA_PAGE.goneTitle}</h2>
        <p>{IDEA_PAGE.goneBody}</p>
      </div>
    );
  }

  const mine = canChangeOwn(idea, myId);

  const remove = async (): Promise<void> => {
    setDeleting(true);
    setError(undefined);
    try {
      await deleteIdea(sp, ids, idea.id);
      if (alive.current) onDeleted(idea);
    } catch (e) {
      if (!alive.current) return;
      setError(IDEA_PAGE.deleteFailed(explain(e)));
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div className={styles.page}>
      {back}

      <div className={styles.top}>
        <div className={styles.heading}>
          <h2>{idea.title}</h2>
          <div className={styles.meta}>
            <StageBadge stage={idea.stage} />
            {idea.area && <AreaPill area={idea.area} colors={areaColors} className={styles.area} />}
            <span>{CARD.sharedBy(idea.author.name || CARD.someone, sharedOn(idea.created))}</span>
            <span>{idea.owner ? CARD.owner(idea.owner.name) : CARD.noOwner}</span>
          </div>
        </div>
        <VoteButton idea={idea} votes={votes} busy={voting} onVote={onVote} look="page" />
      </div>

      {idea.reviewNote && (
        <section className={styles.note}>
          <h3>{IDEA_PAGE.reviewNote}</h3>
          <p className={styles.text}>{idea.reviewNote}</p>
        </section>
      )}

      <div className={styles.body}>
        <Part heading={IDEA_PAGE.problem} text={idea.problem} />
        <Part heading={IDEA_PAGE.proposal} text={idea.proposal} empty={IDEA_PAGE.noProposal} />
        {idea.benefit && <Part heading={IDEA_PAGE.benefit} text={idea.benefit} />}
      </div>

      {mine && !confirming && (
        <div className={styles.own}>
          <p className={styles.hint}>{IDEA_PAGE.canChangeHint}</p>
          <div className={styles.actions}>
            <DefaultButton iconProps={{ iconName: 'Edit' }} text={IDEA_PAGE.change} onClick={onEdit} />
            <DefaultButton iconProps={{ iconName: 'Delete' }} text={IDEA_PAGE.delete} onClick={() => setConfirming(true)} />
          </div>
        </div>
      )}

      {mine && confirming && (
        <MessageBar
          className={styles.message}
          messageBarType={MessageBarType.warning}
          isMultiline
          actions={
            <div className={styles.actions}>
              <PrimaryButton
                className={styles.danger} text={deleting ? IDEA_PAGE.deleting : COMMON.delete} disabled={deleting}
                onClick={() => { remove().catch(() => undefined); }}
              />
              <DefaultButton text={IDEA_PAGE.keep} disabled={deleting} onClick={() => setConfirming(false)} />
            </div>
          }
        >
          {IDEA_PAGE.confirmDelete}
        </MessageBar>
      )}

      {error && (
        <MessageBar
          className={styles.message} messageBarType={MessageBarType.error} isMultiline
          onDismiss={() => setError(undefined)} dismissButtonAriaLabel={COMMON.close}
        >
          {error}
        </MessageBar>
      )}

      {canReview && (
        <ReviewPanel
          sp={sp} ids={ids} idea={idea} stages={stages} onSaved={onReviewed} onUnsavedChange={onUnsavedChange}
        />
      )}
    </div>
  );
};

export default IdeaPage;

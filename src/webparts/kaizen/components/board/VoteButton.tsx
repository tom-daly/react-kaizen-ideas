import * as React from 'react';
import { Icon, Spinner, SpinnerSize } from '@fluentui/react';
import styles from './Board.module.scss';
import type { IIdea } from '../../ideas/types';
import type { IIdeaVotes } from '../../ideas/votes';
import { canVote } from '../../ideas/stages';
import { VOTE } from '../../strings/board';

export interface IVoteButtonProps {
  idea: IIdea;
  votes: IIdeaVotes;
  /** Saving a vote for this idea right now. */
  busy: boolean;
  onVote: (idea: IIdea) => void;
  /** The tall box on a card, or a wide button on the idea's own page. */
  look?: 'card' | 'page';
}

/*
 * The count of votes, as a button that adds the person's vote or takes it
 * back. Pressed in once they've voted. Once the idea has finished it only
 * shows the count.
 */
const VoteButton: React.FC<IVoteButtonProps> = ({ idea, votes, busy, onVote, look = 'card' }) => {
  const voted = votes.mine.length > 0;
  const open = canVote(idea.stage);
  const label = !open ? VOTE.closed : voted ? VOTE.takeBack(idea.title) : VOTE.voteFor(idea.title);
  const classes = [styles.vote, look === 'page' ? styles.votePage : '', voted ? styles.voted : ''].join(' ');

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={open ? voted : undefined}
      aria-label={`${label} (${VOTE.count(votes.count)})`}
      title={label}
      disabled={!open || busy}
      onClick={() => onVote(idea)}
    >
      <span className={styles.voteMark} aria-hidden="true">
        {busy ? <Spinner size={SpinnerSize.xSmall} /> : <Icon iconName={voted ? 'LikeSolid' : 'Like'} />}
      </span>
      <span className={styles.voteCount} aria-hidden="true">{votes.count}</span>
      {look === 'page' && open && (
        <span className={styles.voteWord} aria-hidden="true">{voted ? VOTE.voted : VOTE.vote}</span>
      )}
    </button>
  );
};

export default VoteButton;

import * as React from 'react';
import styles from './Board.module.scss';
import type { IIdea } from '../../ideas/types';
import type { IIdeaVotes } from '../../ideas/votes';
import { firstLine } from '../../ideas/board';
import { sharedOn } from '../../ideas/dates';
import VoteButton from './VoteButton';
import AreaPill from '../AreaPill';
import type { AreaColors } from '../../ideas/areaColors';
import StageBadge from './StageBadge';
import { CARD } from '../../strings/board';

export interface IIdeaCardProps {
  idea: IIdea;
  votes: IIdeaVotes;
  voting: boolean;
  areaColors: AreaColors;
  onOpen: (id: number) => void;
  onVote: (idea: IIdea) => void;
}

/* One idea on the board: its votes, its name (which opens it), the first line of the problem, and who and where. */
const IdeaCard: React.FC<IIdeaCardProps> = ({ idea, votes, voting, areaColors, onOpen, onVote }) => {
  const problem = firstLine(idea.problem);
  return (
    <article className={styles.card}>
      <VoteButton idea={idea} votes={votes} busy={voting} onVote={onVote} />
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>
          <button type="button" className={styles.titleLink} onClick={() => onOpen(idea.id)}>{idea.title}</button>
        </h3>
        {problem && <p className={styles.cardProblem}>{problem}</p>}
        <div className={styles.meta}>
          <StageBadge stage={idea.stage} />
          {idea.area && <AreaPill area={idea.area} colors={areaColors} className={styles.area} />}
          <span>{CARD.sharedBy(idea.author.name || CARD.someone, sharedOn(idea.created))}</span>
          {idea.owner && <span>{CARD.owner(idea.owner.name)}</span>}
        </div>
      </div>
    </article>
  );
};

export default IdeaCard;

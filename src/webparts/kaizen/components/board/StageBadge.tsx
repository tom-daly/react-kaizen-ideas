import * as React from 'react';
import styles from './Board.module.scss';
import { stageTone } from '../../ideas/stages';

/* An idea's stage, in a coloured pill. */
const StageBadge: React.FC<{ stage: string }> = ({ stage }) => (
  <span className={`${styles.stage} ${styles[stageTone(stage)]}`}>{stage}</span>
);

export default StageBadge;

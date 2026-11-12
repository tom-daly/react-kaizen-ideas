import * as React from 'react';
import styles from './KaizenIdeas.module.scss';
import { NAV } from '../strings/home';

export type Tab = 'ideas' | 'areas' | 'reviewers';

export interface INavProps {
  /** The page showing now. */
  current: Tab;
  onGo: (tab: Tab) => void;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'ideas', label: NAV.ideas },
  { key: 'areas', label: NAV.areas },
  { key: 'reviewers', label: NAV.reviewers }
];

/* The row of pages reviewers and site owners see along the top. Staff never see it. */
const Nav: React.FC<INavProps> = ({ current, onGo }) => (
  <nav className={styles.nav} aria-label={NAV.label}>
    {TABS.map(t => (
      <button
        key={t.key}
        type="button"
        className={styles.tab}
        data-label={t.label}
        aria-current={t.key === current ? 'page' : undefined}
        onClick={() => onGo(t.key)}
      >
        {t.label}
      </button>
    ))}
  </nav>
);

export default Nav;

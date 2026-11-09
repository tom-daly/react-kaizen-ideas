import * as React from 'react';
import { Dropdown, IDropdownOption, Icon, Link, PrimaryButton } from '@fluentui/react';
import styles from './Board.module.scss';
import type { IBoardData } from '../../ideas/ideaStore';
import type { IIdea } from '../../ideas/types';
import { Tally, votesFor } from '../../ideas/votes';
import {
  BOARD_FILTERS, BoardSort, IBoardQuery, areaOptions, boardIdeas, filterCounts
} from '../../ideas/board';
import IdeaCard from './IdeaCard';
import { BOARD, FILTER_LABELS, SORT_LABELS } from '../../strings/board';

export interface IBoardProps {
  data: IBoardData;
  tally: Tally;
  myId: number;
  /** The pill, search, area and sort, kept by the page above so they're as left when someone comes back. */
  query: IBoardQuery;
  onQuery: (query: IBoardQuery) => void;
  /** Ideas whose vote is saving. */
  voting: number[];
  onOpen: (id: number) => void;
  onShare: () => void;
  onVote: (idea: IIdea) => void;
}

const SORTS: BoardSort[] = ['votes', 'newest'];

/* The picker's "All areas", which no real area can be called. */
const ALL_AREAS = '__all__';

/* Every idea, a pill for each kind, a search box, an area picker and a sort. */
const Board: React.FC<IBoardProps> = ({ data, tally, myId, query, onQuery, voting, onOpen, onShare, onVote }) => {
  const counts = filterCounts(data.ideas, query, myId);
  const shown = boardIdeas(data.ideas, tally, query, myId);
  const narrowed = !!query.search.trim() || !!query.area;

  const areaChoices: IDropdownOption[] = [{ key: ALL_AREAS, text: BOARD.allAreas }]
    .concat(areaOptions(data.areas.choices, data.ideas).map(a => ({ key: a, text: a })));
  const sortChoices: IDropdownOption[] = SORTS.map(s => ({ key: s, text: SORT_LABELS[s] }));

  const set = (patch: Partial<IBoardQuery>): void => onQuery({ ...query, ...patch });

  const empty = (): JSX.Element => {
    if (!data.ideas.length) {
      return (
        <div className={styles.empty}>
          <h3>{BOARD.noIdeasTitle}</h3>
          <p>{BOARD.noIdeasBody}</p>
          <PrimaryButton text={BOARD.share} onClick={onShare} />
        </div>
      );
    }
    return (
      <div className={styles.empty}>
        <p>{query.filter === 'mine' && !narrowed ? BOARD.noneOfMine : BOARD.nothingHere}</p>
        {narrowed && <Link onClick={() => set({ search: '', area: '' })}>{BOARD.clearSearch}</Link>}
      </div>
    );
  };

  return (
    <div className={styles.board}>
      <div className={styles.head}>
        <div>
          <h2>{BOARD.title}</h2>
          <p className={styles.intro}>{BOARD.intro}</p>
        </div>
        <PrimaryButton iconProps={{ iconName: 'Lightbulb' }} text={BOARD.share} onClick={onShare} />
      </div>

      <div className={styles.filters} role="group" aria-label={BOARD.filtersLabel}>
        {BOARD_FILTERS.map(f => (
          <button
            key={f}
            type="button"
            className={query.filter === f ? `${styles.filter} ${styles.on}` : styles.filter}
            aria-pressed={query.filter === f}
            onClick={() => set({ filter: f })}
          >
            {FILTER_LABELS[f]}
            <span className={styles.count}>{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className={styles.bar}>
        <div className={styles.search}>
          <Icon iconName="Search" className={styles.searchMark} aria-hidden="true" />
          <input
            type="search"
            placeholder={BOARD.searchPlaceholder}
            aria-label={BOARD.searchLabel}
            value={query.search}
            onChange={e => set({ search: e.target.value })}
          />
        </div>
        <Dropdown
          className={styles.picker}
          ariaLabel={BOARD.areaLabel}
          options={areaChoices}
          selectedKey={query.area || ALL_AREAS}
          onChange={(_, o) => set({ area: !o || o.key === ALL_AREAS ? '' : String(o.key) })}
        />
        <Dropdown
          className={styles.picker}
          ariaLabel={BOARD.sortLabel}
          options={sortChoices}
          selectedKey={query.sort}
          onRenderTitle={items => <span>{`${BOARD.sortLabel}: ${items && items[0] ? items[0].text : ''}`}</span>}
          onChange={(_, o) => { if (o) set({ sort: o.key as BoardSort }); }}
        />
      </div>

      <span className={styles.srOnly} role="status">{BOARD.showing(shown.length)}</span>

      {shown.length === 0 ? empty() : (
        <ul className={styles.cards}>
          {shown.map(idea => (
            <li key={idea.id}>
              <IdeaCard
                idea={idea} votes={votesFor(tally, idea.id)} voting={voting.indexOf(idea.id) > -1}
                areaColors={data.areas.colors} onOpen={onOpen} onVote={onVote}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Board;

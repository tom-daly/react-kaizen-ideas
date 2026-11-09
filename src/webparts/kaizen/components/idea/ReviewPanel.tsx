import * as React from 'react';
import {
  Dropdown, IPersonaProps, getId, MessageBar, MessageBarType, NormalPeoplePicker, PrimaryButton, Spinner, SpinnerSize,
  TextField
} from '@fluentui/react';
import styles from './Idea.module.scss';
import type { SPFI } from '../../sp';
import type { ListIds } from '../../setup/schema';
import type { IIdea } from '../../ideas/types';
import { IOwnerPick, IReviewDraft, reviewChanged, reviewFromIdea, withReview } from '../../ideas/ideaForm';
import { saveReview } from '../../ideas/ideaStore';
import { searchPeople } from '../../ideas/reviewers';
import { stageChoices } from '../../ideas/stages';
import { explain } from '../../setup/errors';
import { COMMON } from '../../strings/common';
import { REVIEW_PANEL } from '../../strings/idea';

export interface IReviewPanelProps {
  sp: SPFI;
  ids: ListIds;
  idea: IIdea;
  /** The stages the column has now. */
  stages: string[];
  onSaved: (idea: IIdea) => void;
  /** True while something here isn't saved, so the page can ask before leaving. */
  onUnsavedChange: (unsaved: boolean) => void;
}

/* A person in the owner box, carrying who they are. */
interface IOwnerPersona extends IPersonaProps {
  pick: IOwnerPick;
}

const toPersona = (pick: IOwnerPick): IOwnerPersona =>
  ({ key: pick.id !== undefined ? String(pick.id) : pick.login || pick.name, text: pick.name,
    secondaryText: pick.email, pick });

/*
 * For reviewers and site owners, under an idea: its stage, who owns it and a
 * note everyone can read. Saves with its own button.
 */
const ReviewPanel: React.FC<IReviewPanelProps> = ({ sp, ids, idea, stages, onSaved, onUnsavedChange }) => {
  const [draft, setDraft] = React.useState<IReviewDraft>(() => reviewFromIdea(idea));
  const [saving, setSaving] = React.useState(false);
  const [said, setSaid] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const alive = React.useRef(true);
  // Unique on the page, in case it holds more than one of these web parts.
  const titleId = React.useRef(getId('kaizen-review')).current;
  const ownerId = React.useRef(getId('kaizen-owner')).current;

  React.useEffect(() => () => { alive.current = false; }, []);

  // Saved, here or elsewhere: start again from the idea as it now is.
  React.useEffect(() => { setDraft(reviewFromIdea(idea)); }, [idea]);

  const changed = reviewChanged(draft, reviewFromIdea(idea));
  React.useEffect(() => { onUnsavedChange(changed); }, [changed, onUnsavedChange]);
  React.useEffect(() => () => onUnsavedChange(false), [onUnsavedChange]);

  const suggest = async (text: string): Promise<IPersonaProps[]> => {
    const typed = text.trim();
    if (typed.length < 2) return [];
    try {
      const found = await searchPeople(sp, typed);
      return found.map(f => toPersona({ login: f.login, name: f.name, email: f.email }));
    } catch (e) {
      if (alive.current) setError(REVIEW_PANEL.searchFailed(explain(e)));
      return [];
    }
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    setSaid('');
    setError(undefined);
    try {
      const owner = await saveReview(sp, ids, idea.id, draft);
      if (!alive.current) return;
      setSaid(REVIEW_PANEL.saved);
      onSaved(withReview(idea, draft, owner));
    } catch (e) {
      if (alive.current) setError(REVIEW_PANEL.saveFailed(explain(e)));
    } finally {
      if (alive.current) setSaving(false);
    }
  };

  const set = (patch: Partial<IReviewDraft>): void => {
    setSaid('');
    setDraft(d => ({ ...d, ...patch }));
  };

  return (
    <section className={styles.review} aria-labelledby={titleId}>
      <h3 id={titleId}>{REVIEW_PANEL.title}</h3>
      <p className={styles.hint}>{REVIEW_PANEL.intro}</p>

      <div className={styles.fields}>
        <Dropdown
          label={REVIEW_PANEL.stageLabel}
          options={stageChoices(stages, idea.stage).map(s => ({ key: s, text: s }))}
          selectedKey={draft.stage}
          disabled={saving}
          onChange={(_, o) => { if (o) set({ stage: String(o.key) }); }}
        />

        <div>
          <label className={styles.label} htmlFor={ownerId}>{REVIEW_PANEL.ownerLabel}</label>
          <NormalPeoplePicker
            inputProps={{ id: ownerId }}
            itemLimit={1}
            selectedItems={draft.owner ? [toPersona(draft.owner)] : []}
            onResolveSuggestions={suggest}
            onChange={items => {
              const picked = items && (items[0] as IOwnerPersona | undefined);
              set({ owner: picked && picked.pick ? picked.pick : undefined });
            }}
            resolveDelay={300}
            disabled={saving}
            removeButtonAriaLabel={draft.owner ? REVIEW_PANEL.removeOwner(draft.owner.name) : undefined}
            pickerSuggestionsProps={{
              suggestionsHeaderText: REVIEW_PANEL.pickerHeader,
              noResultsFoundText: REVIEW_PANEL.pickerNoResults,
              loadingText: REVIEW_PANEL.pickerSearching
            }}
          />
          <span className={styles.hint}>{REVIEW_PANEL.ownerHint}</span>
        </div>

        <TextField
          label={REVIEW_PANEL.noteLabel}
          description={REVIEW_PANEL.noteHint}
          multiline autoAdjustHeight rows={3}
          value={draft.note}
          disabled={saving}
          onChange={(_, v) => set({ note: v || '' })}
        />
      </div>

      <div className={styles.actions}>
        <PrimaryButton
          text={saving ? COMMON.saving : COMMON.save}
          disabled={saving || !changed}
          onClick={() => { save().catch(() => undefined); }}
        />
        {saving && <Spinner size={SpinnerSize.small} />}
        {/* Always there, so screen readers hear it when it changes. */}
        <span className={styles.saved} role="status">{said}</span>
      </div>

      {error && (
        <MessageBar
          className={styles.message} messageBarType={MessageBarType.error} isMultiline
          onDismiss={() => setError(undefined)} dismissButtonAriaLabel={COMMON.close}
        >
          {error}
        </MessageBar>
      )}
    </section>
  );
};

export default ReviewPanel;

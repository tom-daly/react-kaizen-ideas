import * as React from 'react';
import {
  DefaultButton, Dropdown, Link, MessageBar, MessageBarType, PrimaryButton, Spinner, SpinnerSize, TextField
} from '@fluentui/react';
import styles from '../idea/Idea.module.scss';
import type { SPFI } from '../../sp';
import type { ListIds } from '../../setup/schema';
import type { IIdea } from '../../ideas/types';
import { addIdea, saveIdea } from '../../ideas/ideaStore';
import type { IAreas } from '../../ideas/areas';
import {
  IIdeaDraft, blankDraft, draftChanged, draftErrors, draftFromIdea, hasErrors
} from '../../ideas/ideaForm';
import { explain } from '../../setup/errors';
import BackArrow from '../BackArrow';
import UnsavedBar from '../UnsavedBar';
import { COMMON } from '../../strings/common';
import { IDEA_FORM } from '../../strings/form';

export interface IIdeaFormProps {
  sp: SPFI;
  ids: ListIds;
  areas: IAreas;
  /** The idea being changed. Missing when sharing a new one. */
  idea?: IIdea;
  onCancel: () => void;
  onSaved: (idea: IIdea) => void;
  /** True while something here isn't saved, so the page can ask before leaving. */
  onUnsavedChange: (unsaved: boolean) => void;
}

/* Sharing a new idea, or changing one before a reviewer picks it up. */
const IdeaForm: React.FC<IIdeaFormProps> = ({ sp, ids, areas, idea, onCancel, onSaved, onUnsavedChange }) => {
  const start = React.useMemo(() => (idea ? draftFromIdea(idea) : blankDraft(areas.byDefault)), [idea, areas]);
  const [draft, setDraft] = React.useState<IIdeaDraft>(start);
  // Mistakes only show once someone has tried to save.
  const [tried, setTried] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [asking, setAsking] = React.useState(false);
  const alive = React.useRef(true);

  React.useEffect(() => () => { alive.current = false; }, []);

  const changed = draftChanged(draft, start);
  React.useEffect(() => { onUnsavedChange(changed); }, [changed, onUnsavedChange]);
  React.useEffect(() => () => onUnsavedChange(false), [onUnsavedChange]);

  const errors = tried ? draftErrors(draft) : {};

  // The idea's own area stays on offer even if it has since been taken off the column.
  const areaChoices = areas.choices.indexOf(draft.area) < 0 && draft.area
    ? areas.choices.concat(draft.area) : areas.choices;

  const set = (patch: Partial<IIdeaDraft>): void => setDraft(d => ({ ...d, ...patch }));

  const save = async (): Promise<void> => {
    setTried(true);
    if (hasErrors(draftErrors(draft))) return;
    setSaving(true);
    setError(undefined);
    try {
      const saved = idea ? await saveIdea(sp, ids, idea.id, draft) : await addIdea(sp, ids, draft);
      if (alive.current) onSaved(saved);
    } catch (e) {
      if (!alive.current) return;
      setError(IDEA_FORM.saveFailed(explain(e)));
      setSaving(false);
    }
  };

  const cancel = (): void => {
    if (changed) setAsking(true);
    else onCancel();
  };

  return (
    <div className={styles.page}>
      <Link className={styles.back} onClick={cancel}><BackArrow />{COMMON.allIdeas}</Link>

      <h2>{idea ? IDEA_FORM.editTitle : IDEA_FORM.newTitle}</h2>
      <p className={styles.intro}>{idea ? IDEA_FORM.editIntro : IDEA_FORM.newIntro}</p>

      <form
        className={styles.form}
        noValidate
        onSubmit={e => {
          e.preventDefault();
          save().catch(() => undefined);
        }}
      >
        <TextField
          label={IDEA_FORM.titleLabel}
          placeholder={IDEA_FORM.titlePlaceholder}
          required
          autoFocus
          value={draft.title}
          errorMessage={errors.title}
          disabled={saving}
          onChange={(_, v) => set({ title: v || '' })}
        />
        <TextField
          label={IDEA_FORM.problemLabel}
          description={IDEA_FORM.problemHint}
          required
          multiline autoAdjustHeight rows={4}
          value={draft.problem}
          errorMessage={errors.problem}
          disabled={saving}
          onChange={(_, v) => set({ problem: v || '' })}
        />
        <TextField
          label={IDEA_FORM.proposalLabel}
          description={IDEA_FORM.proposalHint}
          multiline autoAdjustHeight rows={4}
          value={draft.proposal}
          disabled={saving}
          onChange={(_, v) => set({ proposal: v || '' })}
        />
        <TextField
          label={IDEA_FORM.benefitLabel}
          description={IDEA_FORM.benefitHint}
          multiline autoAdjustHeight rows={2}
          value={draft.benefit}
          disabled={saving}
          onChange={(_, v) => set({ benefit: v || '' })}
        />
        <Dropdown
          className={styles.areaPicker}
          label={IDEA_FORM.areaLabel}
          options={areaChoices.map(a => ({ key: a, text: a }))}
          selectedKey={draft.area || null}
          disabled={saving}
          onChange={(_, o) => { if (o) set({ area: String(o.key) }); }}
        />

        {tried && hasErrors(errors) && (
          <MessageBar messageBarType={MessageBarType.error}>{IDEA_FORM.fixFirst}</MessageBar>
        )}

        {error && (
          <MessageBar
            messageBarType={MessageBarType.error} isMultiline
            onDismiss={() => setError(undefined)} dismissButtonAriaLabel={COMMON.close}
          >
            {error}
          </MessageBar>
        )}

        {asking && (
          <UnsavedBar onDiscard={onCancel} onKeep={() => setAsking(false)} className={styles.actions} />
        )}

        <div className={styles.actions}>
          <PrimaryButton
            type="submit"
            text={saving ? (idea ? COMMON.saving : IDEA_FORM.sharing) : (idea ? COMMON.save : IDEA_FORM.share)}
            disabled={saving}
          />
          <DefaultButton text={COMMON.cancel} disabled={saving} onClick={cancel} />
          {saving && <Spinner size={SpinnerSize.small} />}
        </div>
      </form>
    </div>
  );
};

export default IdeaForm;

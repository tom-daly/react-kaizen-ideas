import {
  TITLE_MAX, blankDraft, draftChanged, draftErrors, draftFromIdea, hasErrors, ideaRow, reviewChanged, reviewFromIdea,
  reviewRow, withReview
} from './ideaForm';
import { ALEX, idea } from './__fixtures__/ideas';

describe('the idea form', () => {
  it('needs a name and a problem, and nothing else', () => {
    const errors = draftErrors(blankDraft('Other'));
    expect(Object.keys(errors).sort()).toEqual(['problem', 'title']);
    expect(hasErrors(draftErrors({ ...blankDraft('Other'), title: 'x', problem: 'y' }))).toBe(false);
  });

  it('doesn\'t count spaces as an answer', () => {
    expect(draftErrors({ ...blankDraft('Other'), title: '   ', problem: 'y' }).title).toBeDefined();
  });

  it('keeps the name within SharePoint\'s limit', () => {
    const long = { ...blankDraft('Other'), title: 'x'.repeat(TITLE_MAX + 1), problem: 'y' };
    expect(draftErrors(long).title).toContain(String(TITLE_MAX));
  });

  it('sees no change in spaces added round the answers', () => {
    const d = draftFromIdea(idea());
    expect(draftChanged(d, { ...d, title: ` ${d.title} ` })).toBe(false);
    expect(draftChanged(d, { ...d, area: 'Safety' })).toBe(true);
  });

  it('writes the tidied answers to the right columns', () => {
    expect(ideaRow({ title: ' A ', problem: 'B', proposal: '', benefit: ' C', area: 'Time' })).toEqual(
      { Title: 'A', Problem: 'B', Proposal: '', Benefit: 'C', IdeaArea: 'Time' });
  });
});

describe('the review', () => {
  it('starts from the idea as it is, with no changes', () => {
    const r = reviewFromIdea(idea({ owner: ALEX, reviewNote: 'Looks good' }));
    expect(r).toEqual({ stage: 'Submitted', owner: ALEX, note: 'Looks good' });
    expect(reviewChanged(r, reviewFromIdea(idea({ owner: ALEX, reviewNote: 'Looks good ' })))).toBe(false);
  });

  it('sees a new owner, a cleared owner and a new stage as changes', () => {
    const r = reviewFromIdea(idea({ owner: ALEX }));
    expect(reviewChanged(r, { ...r, owner: undefined })).toBe(true);
    expect(reviewChanged(r, { ...r, owner: { login: 'i:0#.f|membership|x@example.com', name: 'X', email: '' } }))
      .toBe(true);
    expect(reviewChanged(r, { ...r, stage: 'Done' })).toBe(true);
  });

  it('clears the owner column when nobody is picked', () => {
    expect(reviewRow({ stage: 'Done', note: ' Thanks ' }, undefined))
      .toEqual({ IdeaStatus: 'Done', IdeaOwnerId: null, ReviewNote: 'Thanks' });
    expect(reviewRow({ stage: 'Done', note: '' }, 8).IdeaOwnerId).toBe(8);
  });

  it('shows the idea as the review left it', () => {
    const after = withReview(idea(), { stage: 'In progress', note: ' On it ' }, ALEX);
    expect(after.stage).toBe('In progress');
    expect(after.owner).toEqual(ALEX);
    expect(after.reviewNote).toBe('On it');
  });
});

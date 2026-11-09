import type { SPFI } from '../sp';
import type { IField } from '@pnp/sp/fields';
import { AREAS, DEFAULT_AREA, ListIds, STAGES } from '../setup/schema';
import { choicesOf } from '../setup/toolState';
import { IIdea, IPerson, IVote } from './types';
import { IDEA_EXPAND, IDEA_SELECT, Row, VOTE_SELECT, ideaFrom, voteFrom } from './rows';
import { IIdeaDraft, IOwnerPick, IReviewDraft, ideaRow, reviewRow } from './ideaForm';
import { listOf, readAll } from './lists';
import { KAIZEN_DATA } from '../strings/data';
import { AreaChange, IAreas, changedAreas } from './areas';
import { colorsFromFormat, formatFromColors } from './areaColors';

/*
 * Reading and writing ideas and votes. Who may do what is down to the lists'
 * own permissions: anyone can add, each person can change only their own, and
 * reviewers can change any idea.
 */

/** Everything the board needs, read at once. */
export interface IBoardData {
  ideas: IIdea[];
  votes: IVote[];
  areas: IAreas;
  /** The stages the column has now, any added by hand included. */
  stages: string[];
}

export async function loadBoard(sp: SPFI, ids: ListIds): Promise<IBoardData> {
  const ideas = listOf(sp, ids, 'ideas');
  const [ideaRows, voteRows, areas, stage] = await Promise.all([
    readAll<Row & { Id: number }>(ideas.items, IDEA_SELECT, IDEA_EXPAND),
    readAll<Row & { Id: number }>(listOf(sp, ids, 'votes').items, VOTE_SELECT),
    readAreas(sp, ids),
    ideas.fields.getByInternalNameOrTitle('IdeaStatus').select('Choices')()
  ]);
  return {
    ideas: ideaRows.map(ideaFrom),
    votes: voteRows.map(voteFrom).filter((v): v is IVote => !!v),
    areas,
    stages: choicesOf(stage)
  };
}

/* ------------------------------------------------------------------ areas */

const AREA_COLUMN = 'IdeaArea';

const areaColumn = (sp: SPFI, ids: ListIds): IField =>
  listOf(sp, ids, 'ideas').fields.getByInternalNameOrTitle(AREA_COLUMN);

/** The areas as the column has them now, with their colours from its formatting. */
export async function readAreas(sp: SPFI, ids: ListIds): Promise<IAreas> {
  const got = await areaColumn(sp, ids).select('Choices', 'DefaultValue', 'CustomFormatter')();
  const choices = choicesOf(got);
  const raw = got as { DefaultValue?: string; CustomFormatter?: string };
  const byDefault = raw.DefaultValue || '';
  return {
    choices: choices.length ? choices : AREAS,
    byDefault: choices.indexOf(byDefault) > -1 ? byDefault : choices.length ? choices[0] : DEFAULT_AREA,
    colors: colorsFromFormat(raw.CustomFormatter, AREA_COLUMN)
  };
}

/**
 * Makes one change to the areas, starting from what the column has now so a
 * change someone else made since the page loaded isn't lost. Hands back the
 * areas as they are afterwards. Needs the right to manage the ideas list,
 * which reviewers and site owners have.
 *
 * The column's formatting is only written when there are colours to keep or
 * one is being changed, so formatting someone made by hand, without
 * SharePoint's pill colours, is left alone until somebody picks a colour here.
 */
export async function changeAreas(sp: SPFI, ids: ListIds, change: AreaChange): Promise<IAreas> {
  const now = await readAreas(sp, ids);
  const next = changedAreas(now, change);
  const props: Record<string, unknown> = { Choices: next.choices, DefaultValue: next.byDefault };
  if (change.kind === 'color' || Object.keys(now.colors).length) {
    props.CustomFormatter = formatFromColors(next.colors, next.choices, AREA_COLUMN);
  }
  await areaColumn(sp, ids).update(props, 'SP.FieldChoice');
  return next;
}

/** The ideas in an area, read fresh from the list, so ones shared since the page loaded are there too. */
export async function ideasInArea(sp: SPFI, ids: ListIds, area: string): Promise<number[]> {
  const rows = await readAll<{ Id: number; IdeaArea?: string }>(listOf(sp, ids, 'ideas').items, ['Id', 'IdeaArea']);
  return rows.filter(r => r.IdeaArea === area).map(r => r.Id);
}

/** Puts ideas in another area, one at a time. onMoved hears about each as it saves. */
export async function moveIdeas(
  sp: SPFI, ids: ListIds, ideaIds: number[], area: string, onMoved: (id: number) => void
): Promise<void> {
  const items = listOf(sp, ids, 'ideas').items;
  for (const id of ideaIds) {
    await items.getById(id).update({ IdeaArea: area });
    onMoved(id);
  }
}

export async function loadIdea(sp: SPFI, ids: ListIds, id: number): Promise<IIdea> {
  const row: Row = await listOf(sp, ids, 'ideas').items.getById(id).select(...IDEA_SELECT).expand(...IDEA_EXPAND)();
  return ideaFrom(row);
}

/** Shares a new idea, and hands it back as it now is. */
export async function addIdea(sp: SPFI, ids: ListIds, draft: IIdeaDraft): Promise<IIdea> {
  const added = await listOf(sp, ids, 'ideas').items.add({ ...ideaRow(draft), IdeaStatus: STAGES[0] });
  const id = (added as { Id?: number; ID?: number }).Id || (added as { ID?: number }).ID;
  if (!id) throw new Error(KAIZEN_DATA.noNewId);
  return loadIdea(sp, ids, id);
}

/*
 * The person who shared an idea can change it only while it's still
 * Submitted. A reviewer may have picked it up since the page loaded, so this
 * checks again first.
 */
async function stillSubmitted(sp: SPFI, ids: ListIds, id: number): Promise<void> {
  const now = await loadIdea(sp, ids, id);
  if (now.stage !== STAGES[0]) throw new Error(KAIZEN_DATA.movedOn(now.stage));
}

/** The person who shared it saves their changes, and gets the idea back as it now is. */
export async function saveIdea(sp: SPFI, ids: ListIds, id: number, draft: IIdeaDraft): Promise<IIdea> {
  await stillSubmitted(sp, ids, id);
  await listOf(sp, ids, 'ideas').items.getById(id).update(ideaRow(draft));
  return loadIdea(sp, ids, id);
}

/** Moves the idea to the site's recycle bin, so a site owner can bring it back. */
export async function deleteIdea(sp: SPFI, ids: ListIds, id: number): Promise<void> {
  await stillSubmitted(sp, ids, id);
  await listOf(sp, ids, 'ideas').items.getById(id).recycle();
}

/** The person picked as owner, added to the site first if they've never been on it. */
async function ownerOnSite(sp: SPFI, pick: IOwnerPick | undefined): Promise<IPerson | undefined> {
  if (!pick) return undefined;
  if (pick.id !== undefined) return { id: pick.id, name: pick.name, email: pick.email };
  if (!pick.login) throw new Error(KAIZEN_DATA.ownerUnknown(pick.name));
  const user = await sp.web.ensureUser(pick.login);
  return { id: user.Id, name: user.Title || pick.name, email: user.Email || pick.email };
}

/** A reviewer's stage, owner and note. Hands back the owner as the site knows them. */
export async function saveReview(
  sp: SPFI, ids: ListIds, id: number, review: IReviewDraft
): Promise<IPerson | undefined> {
  const owner = await ownerOnSite(sp, review.owner);
  await listOf(sp, ids, 'ideas').items.getById(id).update(reviewRow(review, owner && owner.id));
  return owner;
}

/** Backs an idea. The row's title is the idea's name, so the votes list reads sensibly in SharePoint. */
export async function addVote(sp: SPFI, ids: ListIds, idea: IIdea, myId: number): Promise<IVote> {
  const added = await listOf(sp, ids, 'votes').items.add({ Title: idea.title.slice(0, 255), VoteIdeaId: idea.id });
  const id = (added as { Id?: number; ID?: number }).Id || (added as { ID?: number }).ID || 0;
  return { id, ideaId: idea.id, voterId: myId };
}

/** Takes a vote back: every row the person has for that idea. */
export async function removeVotes(sp: SPFI, ids: ListIds, rowIds: number[]): Promise<void> {
  const votes = listOf(sp, ids, 'votes');
  for (const id of rowIds) await votes.items.getById(id).delete();
}

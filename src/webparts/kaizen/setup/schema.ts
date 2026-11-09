/*
 * The lists the tool keeps its data in, written down once. Setup builds them
 * from this; the health check compares the site against it.
 *
 * Lists are found by their web address (Lists/KaizenIdeas), never by their
 * title, so they can be renamed without breaking anything.
 *
 * Column internal names never change once shipped. Titles, descriptions and
 * views are only applied when a list is first created, so anything adjusted by
 * hand afterwards is left alone.
 */
import { SETUP_ERRORS } from '../strings/setup';

export type ListKey = 'ideas' | 'votes';

/**
 * Who can do what in a list.
 *  site   - follows the site: staff read, owners edit.
 *  addOwn - any staff member can add rows and see every row, but can change
 *           or delete only the rows they added.
 *
 * On top of that, a list marked `reviewers` lets the Kaizen reviewers group
 * change every row, so the people a site owner picks can look after the ideas.
 */
export type Access = 'site' | 'addOwn';

export type ListIds = Partial<Record<ListKey, string>>;

export interface IFieldDef {
  name: string;
  title: string;
  inDefaultView: boolean;
  xml: (ids: ListIds) => string;
  /** A choice column's choices, so setup can add any a newer version brings. */
  choices?: string[];
}

export interface IViewDef {
  title: string;
  fields: string[];
  query: string;
  rowLimit: number;
}

export interface IListDef {
  key: ListKey;
  urlName: string;
  title: string;
  description: string;
  titleColumn: string;
  hidden: boolean;
  searchable: boolean;
  keepVersions: boolean;
  access: Access;
  /** Reviewers can change every row (Edit), so they can look after the ideas without being site owners. */
  reviewers: boolean;
  fields: IFieldDef[];
  /** The first view is applied to the list's own default view. */
  views: IViewDef[];
}

/* ------------------------------------------------------------ column XML */

export const xmlEscape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface IFieldOptions {
  hint?: string;
  required?: boolean;
  inDefaultView?: boolean;
  hidden?: boolean;
}

interface IChoiceOptions extends IFieldOptions {
  /**
   * The site owns the choices: setup only writes them when it makes the
   * column, the health check never looks at them, and the page reads them
   * from the column. For choices a site owner can change by hand.
   */
  siteOwned?: boolean;
}

function field(
  name: string, title: string, type: string, extra: string, inner: string, o: IFieldOptions
): IFieldDef {
  const attrs =
    `Type="${type}" Name="${name}" StaticName="${name}" DisplayName="${xmlEscape(title)}"` +
    (o.hint ? ` Description="${xmlEscape(o.hint)}"` : '') +
    (o.required ? ' Required="TRUE"' : '') +
    (o.hidden ? ' Hidden="TRUE"' : '') +
    extra;
  const xml = `<Field ${attrs}${inner ? `>${inner}</Field>` : ' />'}`;
  return { name, title, inDefaultView: o.inDefaultView !== false && !o.hidden, xml: () => xml };
}

const note = (name: string, title: string, lines: number, o: IFieldOptions = {}): IFieldDef =>
  field(name, title, 'Note', ` NumLines="${lines}" RichText="FALSE"`, '', o);

/* One person in the organisation, picked from the directory. */
const person = (name: string, title: string, o: IFieldOptions = {}): IFieldDef =>
  field(name, title, 'User', ' List="UserInfo" ShowField="ImnName" UserSelectionMode="PeopleOnly" ' +
    'UserSelectionScope="0" Mult="FALSE"', '', o);

function choice(name: string, title: string, choices: string[], byDefault: string, o: IChoiceOptions = {}): IFieldDef {
  const list = choices.map(c => `<CHOICE>${xmlEscape(c)}</CHOICE>`).join('');
  const made = field(name, title, 'Choice', ' Format="Dropdown"',
    `<CHOICES>${list}</CHOICES><Default>${xmlEscape(byDefault)}</Default>`, o);
  return o.siteOwned ? made : { ...made, choices };
}

/* A lookup has to name the list it points at by its ID, which only exists once
   that list has been made — so its XML is built at install time. */
function lookup(name: string, title: string, to: ListKey, o: IFieldOptions = {}): IFieldDef {
  const base = field(name, title, 'Lookup', '', '', o);
  return {
    ...base,
    xml: (ids) => {
      const id = ids[to];
      if (!id) throw new Error(SETUP_ERRORS.lookupBeforeList(to, name));
      return base.xml(ids).replace(' />', ` List="{${id}}" ShowField="Title" />`);
    }
  };
}

/* ------------------------------------------------------------------ lists */

/** The stages an idea goes through, in order. The last two are where it ends. */
export const STAGES = ['Submitted', 'Under review', 'In progress', 'Done', 'Not going ahead'];

/** What an idea can be about, to start with. Site owners can change these in the list itself. */
export const AREAS = ['Safety', 'Quality', 'Cost', 'Time', 'Customers', 'Workplace', 'Other'];
export const DEFAULT_AREA = 'Other';

/** The SharePoint group whose people look after the ideas. Site owners add and remove them from the page. */
export const REVIEWERS_GROUP = 'Kaizen Reviewers';

/** What the reviewers group says it is for, in SharePoint's own group pages. */
export const REVIEWERS_DESCRIPTION = 'People who look after kaizen ideas: they move each one through its ' +
  'stages, give it an owner and leave notes. Site owners add people from the Reviewers page.';

export const TOOL_LISTS: IListDef[] = [
  {
    key: 'ideas',
    urlName: 'KaizenIdeas',
    title: 'Kaizen ideas',
    description: 'One row per idea for making work better. Everyone sees every idea; each person changes only ' +
      'their own. Reviewers move them through their stages.',
    titleColumn: 'Idea',
    hidden: false,
    searchable: true,
    keepVersions: true,
    access: 'addOwn',
    reviewers: true,
    fields: [
      note('Problem', 'What\'s the problem today', 6),
      note('Proposal', 'What would you change', 6),
      note('Benefit', 'What it would improve', 4, { inDefaultView: false }),
      choice('IdeaArea', 'Area', AREAS, DEFAULT_AREA, { siteOwned: true }),
      choice('IdeaStatus', 'Stage', STAGES, STAGES[0]),
      person('IdeaOwner', 'Owner', { hint: 'Who is seeing the idea through.' }),
      note('ReviewNote', 'Note from the reviewers', 4, { inDefaultView: false })
    ],
    views: [
      {
        title: 'All ideas',
        fields: ['LinkTitle', 'IdeaArea', 'IdeaStatus', 'IdeaOwner', 'Author', 'Created'],
        query: '<OrderBy><FieldRef Name="ID" Ascending="FALSE" /></OrderBy>',
        rowLimit: 100
      },
      {
        title: 'Open',
        fields: ['LinkTitle', 'Problem', 'Proposal', 'IdeaArea', 'IdeaStatus', 'IdeaOwner', 'Author', 'Created'],
        query:
          '<Where><And>' +
          '<Neq><FieldRef Name="IdeaStatus" /><Value Type="Choice">Done</Value></Neq>' +
          '<Neq><FieldRef Name="IdeaStatus" /><Value Type="Choice">Not going ahead</Value></Neq>' +
          '</And></Where>' +
          '<OrderBy><FieldRef Name="ID" /></OrderBy>',
        rowLimit: 100
      }
    ]
  },
  {
    key: 'votes',
    urlName: 'KaizenVotes',
    title: 'Kaizen votes',
    description: 'One row per vote. Everyone can vote, and take back their own vote.',
    titleColumn: 'Vote',
    hidden: true,
    searchable: false,
    // A vote taken back has no need of a history.
    keepVersions: false,
    access: 'addOwn',
    reviewers: false,
    fields: [
      lookup('VoteIdea', 'Idea', 'ideas', { required: true })
    ],
    views: [{
      title: 'All votes',
      fields: ['VoteIdea', 'Author', 'Created'],
      query: '<OrderBy><FieldRef Name="ID" Ascending="FALSE" /></OrderBy>',
      rowLimit: 100
    }]
  }
];

export const listDef = (key: ListKey): IListDef => {
  const def = TOOL_LISTS.find(l => l.key === key);
  if (!def) throw new Error(`No list called ${key}`);
  return def;
};

/** Each person can change only the rows they added in this list. */
export const writesOwnRows = (def: IListDef): boolean => def.access === 'addOwn';

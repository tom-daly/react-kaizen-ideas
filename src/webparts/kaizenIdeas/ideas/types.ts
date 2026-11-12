/*
 * An idea and a vote as the page works with them, read from their list rows.
 */

/** Someone on the site: who shared an idea, or who owns it. */
export interface IPerson {
  /** Their ID on this site. */
  id: number;
  name: string;
  email: string;
}

export interface IIdea {
  id: number;
  title: string;
  problem: string;
  proposal: string;
  benefit: string;
  area: string;
  /** One of the stages in the schema, or one a site owner added to the column by hand. */
  stage: string;
  /** Who is seeing it through, once a reviewer has picked someone. */
  owner?: IPerson;
  reviewNote: string;
  /** Who shared it. */
  author: IPerson;
  /** When it was shared, as SharePoint wrote it (ISO). */
  created: string;
}

/** One vote: one person backing one idea. */
export interface IVote {
  /** Its row in the votes list, for taking it back. */
  id: number;
  ideaId: number;
  voterId: number;
}

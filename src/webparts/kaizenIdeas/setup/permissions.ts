/** Everyone in the organisation, guests left out. */
export const everyoneClaim = (tenantId: string): string =>
  `c:0-.f|rolemanager|spo-grid-all-users/${tenantId}`;

/* SharePoint's built-in permission levels, by type. */
export const RoleType = {
  /**
   * "Limited Access": SharePoint gives it on its own to the site (and anything
   * in between) when someone is let into one list or folder. Opens nothing by itself.
   */
  guest: 1,
  reader: 2,
  contributor: 3,
  /** "Design". */
  designer: 4,
  /** "Full Control". */
  administrator: 5,
  /** "Edit": change every row and the list's own settings, but not who gets in. */
  editor: 6
} as const;

export type RoleTypeValue = typeof RoleType[keyof typeof RoleType];

export interface IAssignment {
  principalId: number;
  loginName: string;
  /** Its permission levels here, by type. A level made by hand comes out as 0. */
  roles?: number[];
}

/* Levels that can change every row and the list itself: Edit, Design and Full Control. */
export const CAN_CHANGE_LIST: number[] = [RoleType.editor, RoleType.designer, RoleType.administrator];

/* Levels that can add rows: Contribute and up. */
export const CAN_ADD: number[] = [RoleType.contributor, ...CAN_CHANGE_LIST];

export const sameLogin = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

/** Whether staff can add rows: "everyone" has Contribute or more. Limited Access doesn't count. */
export const hasStaff = (access: IAssignment[], everyoneLogin: string): boolean =>
  access.some(a => sameLogin(a.loginName, everyoneLogin) && (a.roles || []).some(r => CAN_ADD.indexOf(r) > -1));

/**
 * Whether a person or group has one of these levels here. Found by its ID,
 * never its name, so a group renamed by hand still counts.
 */
export const hasLevel = (access: IAssignment[], principalId: number, levels: number[]): boolean =>
  access.some(a => a.principalId === principalId && (a.roles || []).some(r => levels.indexOf(r) > -1));

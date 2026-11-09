/*
 * When something happened, in words, in the viewer's own time zone.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "4 Oct 2026". */
export const dateText = (d: Date): string => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/** A date SharePoint wrote, like 2026-10-04T14:30:00Z, as "4 Oct 2026". Empty if it can't be read. */
export function sharedOn(iso: string): string {
  const d = new Date(iso);
  return iso && !isNaN(d.getTime()) ? dateText(d) : '';
}

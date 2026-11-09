import type { SPFI } from '../sp';
import type { IList } from '@pnp/sp/lists';
import type { IItems } from '@pnp/sp/items';
import type { ListIds } from '../setup/schema';
import { KAIZEN_DATA } from '../strings/data';

/** One of the tool's lists, found by the ID setup recorded. */
export const listOf = (sp: SPFI, ids: ListIds, key: keyof ListIds): IList => {
  const id = ids[key];
  if (!id) throw new Error(KAIZEN_DATA.listsNotSetUp);
  return sp.web.lists.getById(id);
};

/* As many rows as SharePoint hands over in one go. */
const PAGE = 5000;

/**
 * Every row, however many there are, a page at a time. Each page starts after
 * the last row of the one before, by row number, which SharePoint can always
 * do quickly, even on a list too big to sort any other way.
 */
export async function readAll<T extends { Id: number }>(
  items: IItems, select: string[], expand: string[] = []
): Promise<T[]> {
  const all: T[] = [];
  let after = 0;
  for (;;) {
    let q = items.select(...select).filter(`Id gt ${after}`).orderBy('Id', true).top(PAGE);
    if (expand.length) q = q.expand(...expand);
    const page: T[] = await q();
    all.push(...page);
    if (page.length < PAGE) return all;
    after = page[page.length - 1].Id;
  }
}

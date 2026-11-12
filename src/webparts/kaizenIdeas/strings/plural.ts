/*
 * Counting words: "1 idea", "3 ideas". Both forms are written out, so every
 * word sits with the other wording and nothing guesses at English spelling.
 * And joining a list of things into one phrase: "a, b and c".
 */
export interface IPlural {
  /** For exactly 1, like "idea". */
  one: string;
  /** For any other number, 0 included, like "ideas". */
  other: string;
}

/** The right form for the number: plural(3, IDEAS) is "ideas". */
export const plural = (n: number, forms: IPlural): string => (n === 1 ? forms.one : forms.other);

/** The number and its word: countText(3, IDEAS) is "3 ideas". */
export const countText = (n: number, forms: IPlural): string => `${n} ${plural(n, forms)}`;

// How the last two things in a list are joined, and the ones before them.
export const LIST_WORDS = {
  between: ', ',
  and: (rest: string, last: string): string => `${rest} and ${last}`
};

/** "a", "a and b", "a, b and c". */
export function inWords(items: string[]): string {
  if (items.length < 2) return items.join('');
  return LIST_WORDS.and(items.slice(0, -1).join(LIST_WORDS.between), items[items.length - 1]);
}

/*
 * Colours for the area pills. They're kept on the ideas list's Area column as
 * its column formatting, written the way SharePoint writes it when someone
 * picks pill colours for a choice column. So the list shows the same colours,
 * and colours picked in the list show on the page. Nothing in here talks to
 * the site.
 */

export interface IAreaColor {
  key: string;
  /** SharePoint's own classes for this pill colour, as its column formatting uses them. */
  spClass: string;
  /** For the page's pills: SharePoint's colours, near enough. */
  background: string;
  text: string;
}

/** SharePoint's pill colours for a choice column, in the order it offers them. */
export const AREA_COLORS: IAreaColor[] = [
  { key: 'CornflowerBlue', background: '#cfe4fa', text: '#0f4a85' },
  { key: 'MintGreen', background: '#d5f2d1', text: '#0b5a08' },
  { key: 'Gold', background: '#fdf0bf', text: '#6b4c00' },
  { key: 'Peach', background: '#fde1cc', text: '#8a3707' },
  { key: 'Coral', background: '#fcd9d4', text: '#8e2216' },
  { key: 'DustRose', background: '#f5dbe5', text: '#7a2449' },
  { key: 'Lavender', background: '#e6defa', text: '#4b2c87' },
  { key: 'Cyan', background: '#cdf0f2', text: '#00585e' }
].map(c => ({ ...c, spClass: `sp-css-backgroundColor-Bg${c.key} sp-css-color-${c.key}Font` }));

export const areaColor = (key: string | undefined): IAreaColor | undefined =>
  key ? AREA_COLORS.filter(c => c.key === key)[0] : undefined;

/** Which colour each area has, by its name. Areas with no colour aren't in it. */
export type AreaColors = Record<string, string>;

/* The pill for an area with no colour: SharePoint's plain grey one. */
const PLAIN = 'sp-field-borderAllRegular sp-field-borderAllSolid sp-css-borderColor-neutralSecondary';

const SCHEMA = 'https://developer.microsoft.com/json-schemas/sp/v2/column-formatting.schema.json';

/* The colour a set of classes stands for, if it's one of SharePoint's pill colours. */
const colorOfClasses = (classes: unknown): string | undefined => {
  if (typeof classes !== 'string') return undefined;
  const found = AREA_COLORS.filter(c => classes.indexOf(`backgroundColor-Bg${c.key}`) > -1)[0];
  return found && found.key;
};

interface IExpr {
  operator?: string;
  operands?: unknown[];
}

/*
 * Walks "if the area is X then these classes, otherwise …" down to the end,
 * noting each area's colour. Anything shaped otherwise is skipped.
 */
function readChain(node: unknown, column: string, into: AreaColors): void {
  const e = node as IExpr;
  if (!e || typeof e !== 'object' || e.operator !== ':' || !e.operands || e.operands.length !== 3) return;
  const [test, then, otherwise] = e.operands;
  const t = test as IExpr;
  if (t && t.operator === '==' && t.operands && t.operands[0] === `[$${column}]` && typeof t.operands[1] === 'string') {
    const color = colorOfClasses(then);
    const area = t.operands[1] as string;
    if (color && !(area in into)) into[area] = color;
  }
  readChain(otherwise, column, into);
}

/* Every class rule in the formatting, wherever it sits. */
function eachClassRule(node: unknown, found: unknown[]): unknown[] {
  if (!node || typeof node !== 'object') return found;
  const n = node as { attributes?: { class?: unknown }; children?: unknown[] };
  if (n.attributes && n.attributes.class !== undefined) found.push(n.attributes.class);
  if (Array.isArray(n.children)) n.children.forEach(c => eachClassRule(c, found));
  return found;
}

/**
 * The colours in a column's formatting. Empty when it has none, or has
 * formatting SharePoint's pill colours aren't part of.
 */
export function colorsFromFormat(format: string | undefined, column: string): AreaColors {
  const colors: AreaColors = {};
  if (!format) return colors;
  try {
    eachClassRule(JSON.parse(format), []).forEach(rule => readChain(rule, column, colors));
  } catch {
    // Not JSON: someone wrote it by hand. It has no colours the page can use.
  }
  return colors;
}

/**
 * The column formatting for these colours, laid out as SharePoint lays out
 * its own pills. Empty when no area has a colour, which takes the formatting off.
 */
export function formatFromColors(colors: AreaColors, choices: string[], column: string): string {
  const colored = choices.filter(c => !!areaColor(colors[c]));
  if (!colored.length) return '';
  const classes = colored.reduceRight<unknown>((otherwise, area) => ({
    operator: ':',
    operands: [{ operator: '==', operands: [`[$${column}]`, area] }, (areaColor(colors[area]) as IAreaColor).spClass, otherwise]
  }), PLAIN);
  return JSON.stringify({
    $schema: SCHEMA,
    elmType: 'div',
    style: { 'flex-wrap': 'wrap', display: 'flex' },
    children: [{
      elmType: 'div',
      style: {
        'box-sizing': 'border-box', padding: '4px 8px 5px 8px', overflow: 'hidden', 'text-overflow': 'ellipsis',
        display: 'flex', 'border-radius': '16px', height: '24px', 'align-items': 'center', 'white-space': 'nowrap',
        margin: '4px 4px 4px 4px'
      },
      attributes: { class: classes },
      txtContent: `[$${column}]`
    }]
  });
}

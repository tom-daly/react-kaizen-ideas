import { AREA_COLORS, colorsFromFormat, formatFromColors } from './areaColors';

const COLUMN = 'IdeaArea';
const CHOICES = ['Safety', 'Quality', 'Other'];

describe('area colours on the column', () => {
  it('reads back what it writes, in the order of the areas', () => {
    const colors = { Quality: 'Gold', Safety: 'Coral' };
    const format = formatFromColors(colors, CHOICES, COLUMN);
    expect(colorsFromFormat(format, COLUMN)).toEqual(colors);
    expect(format.indexOf('"Safety"')).toBeLessThan(format.indexOf('"Quality"'));
  });

  it('writes SharePoint\'s own pill classes, so the list shows the same colours', () => {
    const format = formatFromColors({ Safety: 'MintGreen' }, CHOICES, COLUMN);
    expect(format).toContain('sp-css-backgroundColor-BgMintGreen sp-css-color-MintGreenFont');
    expect(format).toContain('"txtContent":"[$IdeaArea]"');
  });

  it('writes nothing when no area has a colour, or only areas that have gone do', () => {
    expect(formatFromColors({}, CHOICES, COLUMN)).toBe('');
    expect(formatFromColors({ Cost: 'Gold' }, CHOICES, COLUMN)).toBe('');
  });

  it('reads colours picked in the list itself, wherever SharePoint puts the rule', () => {
    const made = JSON.stringify({
      elmType: 'div',
      children: [{
        elmType: 'div',
        attributes: {
          class: {
            operator: ':',
            operands: [
              { operator: '==', operands: ['[$IdeaArea]', 'Safety'] },
              'sp-css-backgroundColor-BgCoral sp-css-color-CoralFont',
              {
                operator: ':',
                operands: [
                  { operator: '==', operands: ['[$IdeaArea]', 'Time'] },
                  'sp-css-backgroundColor-BgSomethingNew',
                  'sp-field-borderAllRegular'
                ]
              }
            ]
          }
        }
      }]
    });
    expect(colorsFromFormat(made, COLUMN)).toEqual({ Safety: 'Coral' });
  });

  it('finds no colours in formatting it doesn\'t know, or none at all', () => {
    expect(colorsFromFormat(undefined, COLUMN)).toEqual({});
    expect(colorsFromFormat('', COLUMN)).toEqual({});
    expect(colorsFromFormat('not json', COLUMN)).toEqual({});
    expect(colorsFromFormat('{"elmType":"span","txtContent":"@currentField"}', COLUMN)).toEqual({});
  });

  it('has a colour for every key, with SharePoint\'s class names', () => {
    AREA_COLORS.forEach(c => expect(c.spClass).toBe(`sp-css-backgroundColor-Bg${c.key} sp-css-color-${c.key}Font`));
  });
});

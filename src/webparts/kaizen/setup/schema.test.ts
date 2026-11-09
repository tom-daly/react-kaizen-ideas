import { AREAS, STAGES, TOOL_LISTS, listDef, writesOwnRows, xmlEscape } from './schema';

const IDS = { ideas: '11111111-2222-3333-4444-555555555555' };
const BUILT_IN = ['LinkTitle', 'Title', 'Author', 'Created', 'ID'];

describe('the list definitions', () => {
  it('give every column XML SharePoint can read, under the name the tool expects', () => {
    for (const def of TOOL_LISTS) {
      for (const f of def.fields) {
        const doc = new DOMParser().parseFromString(f.xml(IDS), 'application/xml');
        expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
        const el = doc.documentElement;
        expect(el.getAttribute('Name')).toBe(f.name);
        expect(el.getAttribute('StaticName')).toBe(f.name);
        expect(el.getAttribute('DisplayName')).toBe(f.title);
      }
    }
  });

  it('never repeat a column name within a list', () => {
    for (const def of TOOL_LISTS) {
      const names = def.fields.map(f => f.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('only show columns in views that exist', () => {
    for (const def of TOOL_LISTS) {
      const known = [...BUILT_IN, ...def.fields.map(f => f.name)];
      for (const v of def.views) {
        for (const f of v.fields) expect(known).toContain(f);
      }
    }
  });

  it('point each vote at its idea by the ideas list\'s ID', () => {
    const idea = listDef('votes').fields.find(f => f.name === 'VoteIdea');
    expect(idea?.xml(IDS)).toContain(`List="{${IDS.ideas}}"`);
    expect(() => idea?.xml({})).toThrow();
  });

  it('track the stages, starting at Submitted, but leave the areas to the site', () => {
    const fields = listDef('ideas').fields;
    const stage = fields.find(f => f.name === 'IdeaStatus');
    expect(stage?.choices).toEqual(STAGES);
    expect(stage?.xml(IDS)).toContain('<Default>Submitted</Default>');
    const area = fields.find(f => f.name === 'IdeaArea');
    expect(area?.choices).toBeUndefined();
    // Still made with the starting areas.
    AREAS.forEach(a => expect(area?.xml(IDS)).toContain(`<CHOICE>${a}</CHOICE>`));
  });

  it('make the owner a single person', () => {
    const owner = listDef('ideas').fields.find(f => f.name === 'IdeaOwner');
    expect(owner?.xml(IDS)).toContain('Type="User"');
    expect(owner?.xml(IDS)).toContain('Mult="FALSE"');
  });

  it('let reviewers into the ideas but not the votes', () => {
    expect(TOOL_LISTS.filter(def => def.reviewers).map(def => def.key)).toEqual(['ideas']);
  });

  it('keep each person to changing their own ideas and votes', () => {
    expect(TOOL_LISTS.filter(writesOwnRows).map(def => def.key)).toEqual(['ideas', 'votes']);
  });

  it('escape characters that would break the XML', () => {
    expect(xmlEscape('Fish & "chips" <hot>')).toBe('Fish &amp; &quot;chips&quot; &lt;hot&gt;');
  });
});

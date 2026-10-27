import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import jQuery from 'jquery';

let $;

beforeAll(async () => {
  // Summernote checks which fonts are installed with a canvas as it loads;
  // jsdom has no canvas, so it gets one that measures every font the same.
  HTMLCanvasElement.prototype.getContext = () => ({
    font: '', textAlign: '', textBaseline: '', fillStyle: '',
    fillText() {}, clearRect() {}, measureText: () => ({ width: 10 }),
    getImageData: () => ({ data: [] }),
  });
  // jsdom has no execCommand; Summernote calls it to record an undo step.
  document.execCommand = () => true;
  window.$ = window.jQuery = jQuery;
  $ = jQuery;
  await import('summernote/dist/summernote-lite.js');
  await import('../../src/summernote-ext-tableprops.js');
});

const TABLE = '<table><tbody>' +
  '<tr><td>a</td><td>b</td></tr>' +
  '<tr><td class="x" style="background-color: rgb(255, 0, 0);">c</td><td>d</td></tr>' +
  '</tbody></table>';

const editors = [];

/** An editor with its cursor in the cell `select` names (or nowhere). */
function editor(html, select, extra) {
  const $note = $('<div>').html(html === undefined ? TABLE : html).appendTo(document.body);
  $note.summernote($.extend({
    toolbar: [['table', ['tableprops']]],
    popover: { table: [['props', ['tableprops']]] },
  }, extra || {}));
  editors.push($note);
  const context = $note.data('summernote');
  const $editable = context.layoutInfo.editable;
  const node = select ? $editable.find(select)[0] : null;
  const real = context.invoke.bind(context);
  // The cursor: the range Summernote would have saved when the button was pressed.
  vi.spyOn(context, 'invoke').mockImplementation((name, ...args) => {
    if (name === 'editor.getLastRange') {
      return node ? { commonAncestor: () => node.firstChild || node } : null;
    }
    if (/^editor\.(beforeCommand|afterCommand|restoreRange|saveRange)$/.test(name)) {
      return undefined;
    }
    return real(name, ...args);
  });
  const plugin = context.modules.tableprops;
  return {
    plugin, $editable,
    $d: () => plugin.$dialog,
    set: (key, value) => {
      const $f = plugin.$dialog.find('[data-key="' + key + '"]');
      if ($f.is(':checkbox')) { $f.prop('checked', value); } else { $f.val(value); }
      $f.trigger('change');
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  while (editors.length) {
    const $note = editors.pop();
    $note.summernote('destroy');
    $note.remove();
  }
  $('body').empty();
});

describe('the button', () => {
  it('is offered in the toolbar and the table popover, with its own icon', () => {
    editor(TABLE, 'td');
    expect($('.note-toolbar .note-btn svg.note-tableprops-icon').length).toBe(1);
    expect($('.note-table-popover .note-btn svg.note-tableprops-icon').length).toBe(1);
  });
});

describe('the dialog', () => {
  it('says so outside a table', () => {
    const { plugin, $d } = editor('<p>No table.</p>', 'p');
    plugin.show();
    expect($d().find('.note-tableprops-notable').prop('hidden')).toBe(false);
    expect($d().find('.note-tableprops-form').prop('hidden')).toBe(true);
    expect(plugin.apply()).toBe(false);
  });

  it('reads what the table, row and cell already have', () => {
    const { plugin, $d } = editor(
      '<table style="width: 80%; margin-left: auto; margin-right: auto;"><tbody>' +
      '<tr><th>h</th></tr><tr><td style="text-align: right; vertical-align: top; padding: 6px;">c</td></tr></tbody></table>', 'td');
    plugin.show();
    const val = (k) => $d().find('[data-key="' + k + '"]').val();
    expect(val('t-width')).toBe('80%');
    expect(val('t-align')).toBe('center');
    expect([val('c-align'), val('c-valign'), val('c-padding')]).toEqual(['right', 'top', '6']);
    expect($d().find('[data-key="r-header"]').prop('checked')).toBe(false);
    expect($d().find('[data-group="cell"]').prop('hidden')).toBe(false);
  });

  it('hides the row and cell sections when no single cell is chosen', () => {
    const { plugin, $d } = editor(TABLE, 'table');
    plugin.show();
    expect($d().find('[data-group="row"]').prop('hidden')).toBe(true);
    expect($d().find('[data-group="cell"]').prop('hidden')).toBe(true);
  });

  it('gives each editor its own field ids', () => {
    const a = editor(TABLE, 'td');
    const b = editor(TABLE, 'td');
    const ida = a.$d().find('[data-key="t-width"]').attr('id');
    expect(ida).not.toBe(b.$d().find('[data-key="t-width"]').attr('id'));
    expect(a.$d().find('label[for="' + ida + '"]').length).toBe(1);
  });
});

describe('applying only what changed', () => {
  it('sets a width and touches nothing else', () => {
    const { plugin, $editable, set } = editor(TABLE, 'td');
    const before = $editable.html();
    plugin.show();
    set('t-width', '300');
    plugin.apply();

    const $t = $editable.find('table');
    expect($t.attr('style')).toBe('width: 300px;');
    expect($editable.find('td.x').attr('style')).toBe('background-color: rgb(255, 0, 0);');
    expect($editable.html().replace(' style="width: 300px;"', '')).toBe(before);
  });

  it('applying with nothing changed changes nothing', () => {
    const { plugin, $editable } = editor(TABLE, 'td.x');
    const before = $editable.html();
    plugin.show();
    plugin.apply();
    expect($editable.html()).toBe(before);
  });

  it('a border draws the table and its gridlines; zero takes them away', () => {
    const { plugin, $editable, set } = editor(TABLE, 'td');
    plugin.show();
    set('t-bordercolor', '#336699');
    set('t-border', '2');
    plugin.apply();
    const $t = $editable.find('table');
    expect($t[0].style.border).toBe('2px solid rgb(51, 102, 153)');
    expect($t[0].style.borderCollapse).toBe('collapse');
    expect($editable.find('td').toArray().every((td) => td.style.border === '2px solid rgb(51, 102, 153)')).toBe(true);

    plugin.show();
    set('t-border', '0');
    plugin.apply();
    expect($t[0].style.border).toBe('');
    expect($editable.find('td').toArray().every((td) => td.style.border === '')).toBe(true);
  });

  it('a border color alone recolors and adds no border', () => {
    const { plugin, $editable, set } = editor(TABLE, 'td');
    plugin.show();
    set('t-bordercolor', '#00ff00');
    plugin.apply();
    const td = $editable.find('td')[0];
    expect(td.style.borderColor).toBe('rgb(0, 255, 0)');
    expect(td.style.borderWidth).toBe('');
  });

  it('backgrounds: set, cleared, or left alone', () => {
    const { plugin, $editable, set } = editor(TABLE, 'td.x');
    plugin.show();
    set('t-bg', '#eeeeee');
    plugin.apply();
    expect($editable.find('table')[0].style.backgroundColor).toBe('rgb(238, 238, 238)');
    expect($editable.find('td.x')[0].style.backgroundColor).toBe('rgb(255, 0, 0)');

    plugin.show();
    set('c-nobg', true);
    plugin.apply();
    expect($editable.find('td.x')[0].style.backgroundColor).toBe('');
  });

  it('cell settings go to the cell, or to every cell when asked', () => {
    const { plugin, $editable, set } = editor(TABLE, 'td.x');
    plugin.show();
    set('c-align', 'center');
    set('c-padding', '8');
    plugin.apply();
    expect($editable.find('td.x')[0].style.textAlign).toBe('center');
    expect($editable.find('td.x')[0].style.padding).toBe('8px');
    expect($editable.find('td').first()[0].style.textAlign).toBe('');

    plugin.show();
    set('c-valign', 'bottom');
    set('c-all', true);
    plugin.apply();
    expect($editable.find('td').toArray().every((td) => td.style.verticalAlign === 'bottom')).toBe(true);
  });

  it('a header row becomes th with scope, and back, keeping what the cells hold', () => {
    const { plugin, $editable, set } = editor(TABLE, 'td.x');
    plugin.show();
    set('r-header', true);
    plugin.apply();
    const $row = $editable.find('tr').eq(1);
    expect($row.children('td').length).toBe(0);
    expect($row.children('th').map((i, th) => th.getAttribute('scope')).get()).toEqual(['col', 'col']);
    expect($row.children('th.x').text()).toBe('c');
    expect($row.children('th.x')[0].style.backgroundColor).toBe('rgb(255, 0, 0)');
  });

  it('turns a header row back into data cells', () => {
    const { plugin, $editable, set } = editor('<table><tbody><tr><th scope="col">h</th></tr></tbody></table>', 'th');
    plugin.show();
    expect(plugin.$dialog.find('[data-key="r-header"]').prop('checked')).toBe(true);
    set('r-header', false);
    plugin.apply();
    const $td = $editable.find('tr td');
    expect($td.length).toBe(1);
    expect($td[0].hasAttribute('scope')).toBe(false);
  });

  it('drops a width that is not one', () => {
    const { plugin, $editable, set } = editor('<table style="width: 50%;"><tbody><tr><td>a</td></tr></tbody></table>', 'td');
    plugin.show();
    set('t-width', 'calc(100% + expression)');
    plugin.apply();
    expect($editable.find('table')[0].style.width).toBe('');
  });
});

describe('language and helpers', () => {
  it('takes its words from the editor language', () => {
    $.summernote.lang['fr-FR'] = $.extend(true, {}, $.summernote.lang['en-US'], {
      tableprops: { title: 'Propriétés du tableau', apply: 'Appliquer' },
    });
    const { $d } = editor(TABLE, 'td', { lang: 'fr-FR' });
    expect($d().find('.note-tableprops-apply').text()).toBe('Appliquer');
    expect($d().text()).toContain('Propriétés du tableau');
  });

  it('reads colors and widths', () => {
    const tp = $.summernote.tableprops;
    expect([tp.toHex('rgb(51, 102, 153)'), tp.toHex('rgba(0, 0, 0, 0)'), tp.toHex('#ABC'), tp.toHex('red')]).toEqual(['#336699', '', '#aabbcc', '']);
    expect([tp.cssLength('300'), tp.cssLength(' 80% '), tp.cssLength('12em'), tp.cssLength('1;x')]).toEqual(['300px', '80%', '12em', '']);
  });
});

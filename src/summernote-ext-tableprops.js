/**
 * summernote-ext-tableprops
 *
 * Table, row and cell properties for Summernote: width, border, colors,
 * alignment, padding and a header row, in one dialog.
 *
 * Summernote can insert a table and add or remove rows and columns, but has no
 * way to style one. This adds a button (for the table popover or the toolbar)
 * that opens a dialog for the table the cursor is in, its row and its cell.
 *
 * Only what you change is applied. Opening the dialog to set a width leaves
 * every color, border and alignment as it was.
 *
 *     $('#editor').summernote({
 *       popover: { table: [ ...the defaults..., ['props', ['tableprops']] ] },
 *       toolbar: [['table', ['table', 'tableprops']]]
 *     });
 *
 * Depends on jQuery and Summernote (lite, bs3, bs4 or bs5). MIT licensed.
 * https://github.com/kevinbruce/summernote-ext-tableprops
 */
(function (factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('jquery'));
  } else {
    factory(window.jQuery);
  }
}(function ($) {
  'use strict';

  if (!$ || !$.summernote) {
    return;
  }

  // An icon of its own (a table with a highlighted cell): no icon font needed.
  var ICON = '<svg class="note-tableprops-icon" viewBox="0 0 16 16" width="1em" height="1em" ' +
    'aria-hidden="true" focusable="false"><path fill="currentColor" d="M1.5 2h13a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-13a.5.5 ' +
    '0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5zM2 3v3h3.5V3H2zm4.5 0v3h3V3h-3zm4 0v3H14V3h-3.5zM2 7v3h3.5V7H2zm4.5 0v3h3V7h-3zm4 ' +
    '0v3H14V7h-3.5zM2 11v2h3.5v-2H2zm4.5 0v2h3v-2h-3zm4 0v2H14v-2h-3.5z"/><path fill="currentColor" opacity=".45" ' +
    'd="M6.5 7h3v3h-3z"/></svg>';

  $.extend(true, $.summernote.lang, {
    'en-US': {
      tableprops: {
        tooltip: 'Table properties',
        title: 'Table properties',
        noTable: 'Put the cursor inside a table first.',
        table: 'Table',
        row: 'Row',
        cell: 'Cell',
        width: 'Width',
        widthPlaceholder: '100% or 500px',
        border: 'Border',
        borderColor: 'Border color',
        background: 'Background',
        noBackground: 'No background',
        align: 'Align',
        verticalAlign: 'Vertical align',
        padding: 'Padding',
        headerRow: 'Header row',
        wholeTable: 'Apply the cell settings to every cell',
        alignDefault: 'Default',
        left: 'Left',
        center: 'Center',
        right: 'Right',
        top: 'Top',
        middle: 'Middle',
        bottom: 'Bottom',
        apply: 'Apply'
      }
    }
  });

  var DEFAULTS = {
    icon: ICON   // the button's contents (HTML)
  };

  /** A CSS color to what <input type="color"> takes (#rrggbb), or '' for none. */
  function toHex(value) {
    if (!value) {
      return '';
    }
    var m = String(value).match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
    if (m) {
      if (m[4] !== undefined && parseFloat(m[4]) === 0) {
        return '';
      }
      return '#' + [m[1], m[2], m[3]].map(function (n) {
        return ('0' + parseInt(n, 10).toString(16)).slice(-2);
      }).join('');
    }
    if (/^#[0-9a-f]{3}$/i.test(value)) {
      return '#' + value.slice(1).split('').map(function (c) { return c + c; }).join('').toLowerCase();
    }
    return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : '';
  }

  /** A width a person typed: a number becomes pixels, units are kept, nonsense is dropped. */
  function cssLength(value) {
    var v = $.trim(String(value || ''));
    if (/^\d+(\.\d+)?$/.test(v)) {
      return v + 'px';
    }
    return /^\d+(\.\d+)?(px|%|em|rem|vw|ch)$/i.test(v) ? v : '';
  }

  var counter = 0;

  $.extend($.summernote.plugins, {
    tableprops: function (context) {
      var self = this;
      var ui = $.summernote.ui;
      var options = context.options;
      var settings = $.extend({}, DEFAULTS, options.tableprops || {});
      var lang = $.extend({}, $.summernote.lang['en-US'].tableprops,
        (options.langInfo && options.langInfo.tableprops) || {});
      var id = 'note-tableprops-' + (++counter);

      context.memo('button.tableprops', function () {
        return ui.button({
          contents: settings.icon,
          tooltip: lang.tooltip,
          click: function () {
            context.invoke('editor.saveRange');
            self.show();
          }
        }).render();
      });

      /** The cell and table the cursor is in, from the editor's last range. */
      this.target = function () {
        var rng = context.invoke('editor.getLastRange');
        if (!rng || !rng.commonAncestor) {
          return { $cell: null, $table: null };
        }
        var $node = $(rng.commonAncestor());
        var $cell = $node.closest('td,th');
        var $table = $node.closest('table');
        // Only a table inside this editor.
        if ($table.length && !$.contains(context.layoutInfo.editable[0], $table[0])) {
          return { $cell: null, $table: null };
        }
        return { $cell: $cell.length ? $cell : null, $table: $table.length ? $table : null };
      };

      function field(key, labelText, $input) {
        var fid = id + '-' + key;
        return $('<div class="note-tableprops-field">')
          .append($('<label>').attr('for', fid).text(labelText))
          .append($input.attr('id', fid).attr('data-key', key));
      }

      function check(key, labelText) {
        return $('<label class="note-tableprops-check">')
          .append($('<input type="checkbox">').attr({ id: id + '-' + key, 'data-key': key }))
          .append(document.createTextNode(' ' + labelText));
      }

      function select(pairs) {
        var $s = $('<select class="form-control note-input">');
        $.each(pairs, function (i, p) { $('<option>').attr('value', p[0]).text(p[1]).appendTo($s); });
        return $s;
      }

      var ALIGN = [['', lang.alignDefault], ['left', lang.left], ['center', lang.center], ['right', lang.right]];
      var VALIGN = [['', lang.alignDefault], ['top', lang.top], ['middle', lang.middle], ['bottom', lang.bottom]];

      this.initialize = function () {
        var $container = options.dialogsInBody ? $(document.body) : context.layoutInfo.editor;
        var $body = $('<div class="note-tableprops">');
        $('<p class="note-tableprops-notable" hidden>').text(lang.noTable).appendTo($body);
        var $form = $('<div class="note-tableprops-form">').appendTo($body);

        $('<fieldset class="note-tableprops-group" data-group="table">')
          .append($('<legend>').text(lang.table))
          .append(field('t-width', lang.width, $('<input type="text" class="form-control note-input">').attr('placeholder', lang.widthPlaceholder)))
          .append(field('t-border', lang.border + ' (px)', $('<input type="number" min="0" max="20" class="form-control note-input">')))
          .append(field('t-bordercolor', lang.borderColor, $('<input type="color">')))
          .append(field('t-bg', lang.background, $('<input type="color">')))
          .append(field('t-align', lang.align, select(ALIGN)))
          .append(check('t-nobg', lang.noBackground))
          .appendTo($form);

        $('<fieldset class="note-tableprops-group" data-group="row">')
          .append($('<legend>').text(lang.row))
          .append(field('r-bg', lang.background, $('<input type="color">')))
          .append(field('r-valign', lang.verticalAlign, select(VALIGN)))
          .append(check('r-header', lang.headerRow))
          .append(check('r-nobg', lang.noBackground))
          .appendTo($form);

        $('<fieldset class="note-tableprops-group" data-group="cell">')
          .append($('<legend>').text(lang.cell))
          .append(field('c-bg', lang.background, $('<input type="color">')))
          .append(field('c-bordercolor', lang.borderColor, $('<input type="color">')))
          .append(field('c-padding', lang.padding + ' (px)', $('<input type="number" min="0" max="60" class="form-control note-input">')))
          .append(field('c-align', lang.align, select(ALIGN)))
          .append(field('c-valign', lang.verticalAlign, select(VALIGN)))
          .append(check('c-nobg', lang.noBackground))
          .append(check('c-all', lang.wholeTable))
          .appendTo($form);

        var $footer = $('<div>');
        $('<button type="button" class="btn btn-primary note-btn note-btn-primary note-tableprops-apply">')
          .text(lang.apply).appendTo($footer);

        this.$dialog = ui.dialog({
          className: 'note-tableprops-dialog',
          title: lang.title,
          fade: options.dialogsFade,
          body: $body.prop('outerHTML'),
          footer: $footer.html()
        }).render().appendTo($container);

        // What the person touched is what gets applied.
        this.$dialog.on('input change', '[data-key]', function () {
          $(this).attr('data-dirty', '1');
        });
        this.$dialog.on('click', '.note-tableprops-apply', function () {
          self.apply();
        });
      };

      this.destroy = function () {
        if (this.$dialog) {
          ui.hideDialog(this.$dialog);
          this.$dialog.remove();
          this.$dialog = null;
        }
      };

      this.$field = function (key) {
        return this.$dialog.find('[data-key="' + key + '"]');
      };

      /** The field's value if the person changed it, else undefined. */
      this.changed = function (key) {
        var $f = this.$field(key);
        if ($f.attr('data-dirty') !== '1') {
          return undefined;
        }
        return $f.is(':checkbox') ? $f.is(':checked') : $f.val();
      };

      this.show = function () {
        var $d = this.$dialog;
        var t = this.target();
        var $tbl = t.$table;
        var $cell = t.$cell;
        var $row = $cell ? $cell.closest('tr') : null;

        $d.find('.note-tableprops-notable').prop('hidden', !!$tbl);
        $d.find('.note-tableprops-form, .note-tableprops-apply').prop('hidden', !$tbl);
        $d.find('[data-key]').removeAttr('data-dirty');

        if ($tbl) {
          var tableStyle = $tbl[0].style;
          this.$field('t-width').val(tableStyle.width || '');
          this.$field('t-border').val(parseInt($tbl.css('border-top-width'), 10) || '');
          this.$field('t-bordercolor').val(toHex($tbl.css('border-top-color')) || '#000000');
          this.$field('t-bg').val(toHex($tbl.css('background-color')) || '#ffffff');
          this.$field('t-align').val(tableStyle.marginLeft === 'auto'
            ? (tableStyle.marginRight === 'auto' ? 'center' : 'right') : '');
          this.$field('t-nobg').prop('checked', false);

          this.$field('r-bg').val($row ? (toHex($row.css('background-color')) || '#ffffff') : '#ffffff');
          this.$field('r-valign').val($row ? ($row[0].style.verticalAlign || '') : '');
          this.$field('r-header').prop('checked', !!($row && $row.children('th').length && !$row.children('td').length));
          this.$field('r-nobg').prop('checked', false);

          this.$field('c-bg').val($cell ? (toHex($cell.css('background-color')) || '#ffffff') : '#ffffff');
          this.$field('c-bordercolor').val($cell ? (toHex($cell.css('border-top-color')) || '#000000') : '#000000');
          this.$field('c-padding').val($cell ? (parseInt($cell[0].style.paddingTop, 10) || '') : '');
          this.$field('c-align').val($cell ? ($cell[0].style.textAlign || '') : '');
          this.$field('c-valign').val($cell ? ($cell[0].style.verticalAlign || '') : '');
          this.$field('c-nobg').prop('checked', false);
          this.$field('c-all').prop('checked', false);

          // Row and cell mean nothing without a cell.
          $d.find('[data-group="row"], [data-group="cell"]').prop('hidden', !$cell);
        }

        ui.showDialog($d);
        // Popovers close on this; the table popover would otherwise sit over the dialog.
        context.triggerEvent('dialog.shown');
      };

      this.apply = function () {
        var $d = this.$dialog;
        var t = this.target();

        if (!t.$table) {
          ui.hideDialog($d);
          return false;
        }

        var $tbl = t.$table;
        var $cell = t.$cell;
        var $row = $cell ? $cell.closest('tr') : null;
        var v;

        // One undo step; afterCommand fires the change that syncs a textarea.
        context.invoke('editor.beforeCommand');

        /* table */
        if ((v = this.changed('t-width')) !== undefined) {
          $tbl.css('width', cssLength(v));
        }
        var border = this.changed('t-border');
        var borderColor = this.changed('t-bordercolor');
        if (border === undefined && borderColor !== undefined) {
          // The color alone: recolor the borders there are, add none.
          $tbl.css('border-color', borderColor);
          $tbl.find('td,th').css('border-color', borderColor);
        } else if (border !== undefined) {
          var width = parseInt(border, 10);
          var color = this.$field('t-bordercolor').val();
          if (isNaN(width) || width <= 0) {
            // Zero or empty: no border, on the table or its cells.
            $tbl.css({ border: '', borderCollapse: '' });
            $tbl.find('td,th').css('border', '');
          } else {
            // The table draws the box; the cells draw the gridlines people
            // expect; collapse keeps the two from doubling up.
            var rule = width + 'px solid ' + color;
            $tbl.css({ border: rule, borderCollapse: 'collapse' });
            $tbl.find('td,th').css('border', rule);
          }
        }
        if (this.changed('t-nobg') === true) {
          $tbl.css('background-color', '');
        } else if ((v = this.changed('t-bg')) !== undefined) {
          $tbl.css('background-color', v);
        }
        if ((v = this.changed('t-align')) !== undefined) {
          $tbl.css({
            marginLeft: v === 'center' || v === 'right' ? 'auto' : '',
            marginRight: v === 'center' ? 'auto' : ''
          });
        }

        /* row */
        if ($row) {
          if (this.changed('r-nobg') === true) {
            $row.css('background-color', '');
          } else if ((v = this.changed('r-bg')) !== undefined) {
            $row.css('background-color', v);
          }
          if ((v = this.changed('r-valign')) !== undefined) {
            $row.css('vertical-align', v || '');
          }
          if ((v = this.changed('r-header')) !== undefined) {
            this.setHeaderRow($row, v);
            // The cell element may have been replaced.
            $cell = null;
          }
        }

        /* cell, or every cell */
        var $cells = this.changed('c-all') === true ? $tbl.find('td,th') : ($cell || $());
        if ($cells.length) {
          if (this.changed('c-nobg') === true) {
            $cells.css('background-color', '');
          } else if ((v = this.changed('c-bg')) !== undefined) {
            $cells.css('background-color', v);
          }
          if ((v = this.changed('c-bordercolor')) !== undefined) {
            $cells.css('border-color', v);
          }
          if ((v = this.changed('c-padding')) !== undefined) {
            $cells.css('padding', v === '' ? '' : Math.max(0, parseInt(v, 10) || 0) + 'px');
          }
          if ((v = this.changed('c-align')) !== undefined) {
            $cells.css('text-align', v || '');
          }
          if ((v = this.changed('c-valign')) !== undefined) {
            $cells.css('vertical-align', v || '');
          }
        }

        context.invoke('editor.afterCommand');
        ui.hideDialog($d);
        context.invoke('editor.restoreRange');
        return true;
      };

      /**
       * Make a row header cells (th, scope="col") or data cells (td). There is
       * no renaming an element, so each cell is replaced, its attributes and
       * contents carried across.
       */
      this.setHeaderRow = function ($row, wanted) {
        var from = wanted ? 'td' : 'th';
        var to = wanted ? 'th' : 'td';
        $row.children(from).each(function () {
          var $new = $('<' + to + '>').html($(this).html());
          $.each(this.attributes, function () {
            $new.attr(this.name, this.value);
          });
          if (wanted) {
            $new.attr('scope', 'col');
          } else {
            $new.removeAttr('scope');
          }
          $(this).replaceWith($new);
        });
      };
    }
  });

  $.summernote.tableprops = { defaults: DEFAULTS, toHex: toHex, cssLength: cssLength };
}));

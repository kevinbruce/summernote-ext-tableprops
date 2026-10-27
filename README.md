# summernote-ext-tableprops

Table, row and cell properties for [Summernote](https://summernote.org): width,
borders, colors, alignment, padding and header rows, in one dialog.

Summernote can insert a table and add or remove rows and columns, but has no
way to style one. This adds a button to the table popover (and, if you like,
the toolbar) that opens a dialog for the table the cursor is in, its row and
its cell.

- **Only what you change is applied.** Open it to set a width and every color,
  border and alignment stays as it was.
- **Header rows are real headers**: `th` with `scope="col"`, for screen readers.
- Cell settings can go to one cell or every cell in the table.
- Works with Summernote lite, bs3, bs4 and bs5 (0.8.18 and later), and jQuery 3.
- One script, one stylesheet, no other dependencies. Translatable.

## Install

```bash
npm install summernote-ext-tableprops
```

or from a CDN:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/summernote-ext-tableprops@0.1/src/summernote-ext-tableprops.css">
<script src="https://cdn.jsdelivr.net/npm/summernote-ext-tableprops@0.1/src/summernote-ext-tableprops.js"></script>
```

Load it after Summernote, then put `tableprops` in the table popover:

```js
$('#editor').summernote({
  popover: {
    table: [
      ['add', ['addRowDown', 'addRowUp', 'addColLeft', 'addColRight']],
      ['delete', ['deleteRow', 'deleteCol', 'deleteTable']],
      ['props', ['tableprops']]
    ]
  },
  toolbar: [
    ['table', ['table', 'tableprops']]   // optional: a toolbar button too
  ]
});
```

Why the whole popover list: Summernote builds the table popover from
`popover.table` before any plugin runs, so a plugin cannot add itself to it.
Passing `popover.table` replaces the default, which is why Summernote's own
buttons are listed alongside `tableprops` (as they stand in Summernote 0.9).

## What it sets

| Section | Fields | Written as |
|---|---|---|
| Table | width, border (px), border color, background, align | inline `style` on the `<table>`; a border also draws every cell's gridlines, with `border-collapse: collapse`; a border of 0 removes them |
| Row | background, vertical align, header row | `style` on the `<tr>`; a header row turns its cells into `th scope="col"` (and back) |
| Cell | background, border color, padding (px), align, vertical align | `style` on the cell, or on every cell with "Apply the cell settings to every cell" |

"No background" clears a background rather than setting white. A width is
taken as typed (`80%`, `500px`, `30em`); a bare number means pixels, and
anything else is ignored.

Each Apply is one undo step and fires Summernote's change event, so a textarea
the editor is bound to stays in step.

## Options

Under `tableprops` in Summernote's options.

| Option | Default | What it does |
|---|---|---|
| `icon` | a table icon | The button's contents, as HTML. |

## Translating

The words are in `$.summernote.lang['en-US'].tableprops`. Add a `tableprops`
block to your language; anything left out falls back to English.

```js
$.extend(true, $.summernote.lang, {
  'fr-FR': { tableprops: { tooltip: 'Propriétés du tableau', title: 'Propriétés du tableau', apply: 'Appliquer' } }
});
```

## Styling

Every class is `note-tableprops-` prefixed; colors are custom properties on
`.note-tableprops-dialog`.

## Demo and tests

Open `examples/index.html` (any static server), and `npm test` (vitest, jsdom).

## Related

- [summernote-ext-filemanager](https://github.com/kevinbruce/summernote-ext-filemanager): browse and insert files already on your server.
- [summernote-ext-imagealt](https://github.com/kevinbruce/summernote-ext-imagealt): alt text for images.

## License

MIT © Kevin Bruce. Built for, and released with the permission of, Maryland Sea Grant.

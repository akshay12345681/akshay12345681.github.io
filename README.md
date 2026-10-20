# Akshay Bhandari: landing page

Plain HTML, CSS and JavaScript. No build step, no dependencies besides Google Fonts.

## Run it locally

Open `index.html` in a browser, or serve the folder:

```bash
cd personal-site && python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Files

```
index.html              page content (hero, About, Case files, Contact, footer)
css/tokens.css          colours, fonts, type sizes, spacing, badge size: edit here first
css/base.css            reset and shared helpers (.container, .label)
css/hero.css            corner notes, big name, badge and lanyard
css/sections.css        About, Case files, Contact, footer
css/case.css            case study pages
cases/case-01.html      case study template (example content)
js/lanyard.js           badge physics (no dependencies)
js/main.js              starts the badge and other page scripts
```

## Common edits

- **Text:** everything is in `index.html`. Lines marked "Add your …" are placeholders.
- **Add a case write-up:** copy `cases/case-01.html` to `cases/case-02.html` and replace the content (the comments in the file explain each section). Then, in `index.html`, wrap that case card's title in `<a class="case-link" href="cases/case-02.html">…</a>` so the whole card links to it. For a new card, copy one `<article class="case">` block.
- **Badge text:** the `.badge-card` block in `index.html`.
- **Badge size:** `--badge-w` in `css/tokens.css` (the height follows).
- **Where the lanyard hangs:** `--anchor-x` in `css/tokens.css` (0 = left, 1 = right).
- **Physics feel:** constants at the top of `js/lanyard.js`. `GRAVITY` sets how heavy it feels, `AIR` how long it keeps swinging, and the `TWIST_` values control how much it turns in 3D.

## Colours

The palette is Evidence tape (off-white with evidence-bag red), set in the `:root` block of `css/tokens.css`. It is used in both light and dark mode. The badge card has its own `--card-*` colours, and the lanyard has `--strap` and `--strap-hi`.

## Publishing

The folder is static, so GitHub Pages, Netlify, Vercel or Cloudflare Pages can host it as is.

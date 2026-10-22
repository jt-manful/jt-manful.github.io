# John Terence Manful: portfolio

Personal portfolio site. Plain HTML, CSS and JavaScript, with no build step and no dependencies.
The design is a set of drafting sheets: light mode is drafting paper, dark mode is a blueprint.

## Contents

```
index.html                 Home page (eight sheets, in order)
404.html                   Not found page
notes/index.html           Field notes list
notes/                     One HTML file per note
templates/note-template.html   Copy it for each new note
assets/css/styles.css      All styles, light and dark themes
assets/js/main.js          Theme toggle, menu, scroll spine, robot arm
assets/fonts/              Archivo (variable) and IBM Plex Mono, self hosted, SIL OFL licences included
assets/img/                Favicon, touch icon, social preview image, portrait
assets/media/              Project images and videos
robots.txt, sitemap.xml
.nojekyll                  Tells GitHub Pages to serve the files as they are
```

Sheet order on the home page: Intro, About, Skills, Education, Selected works, Experience, Field notes, Contact.

## Run it locally

Any static server works. From this folder:

```
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening index.html directly from disk also works, except that
absolute paths on the 404 page only resolve on a server.

## Things to fill in

Search for `TODO` in index.html. Each one is a comment next to the thing to change:

- Add your portrait at `assets/img/portrait.jpg` (about 800 by 1000).
- Add project images at `assets/media/` using the file names in the comments (1600 by 1000 works well).
  Until a file exists, the card shows an "Image pending" placeholder.
- Confirm project status labels, the paper type (conference or journal) and its exact title.
- Add the number of trials behind the VLA success rates.
- Decide which email address is public (index.html, contact section, two places).
- Finish the TU Dresden note in `notes/tu-dresden-hackathon.html`.

## Common edits

**Colours.** Both themes are two blocks of variables at the top of `assets/css/styles.css`
(`:root` for light, and the two dark blocks). Change a value there and the whole site follows.

**Add a project.** Copy an `<article class="card">` block in the Selected works sheet.
Give it a unique `id` (the Skills table links to these ids), a status label, and a repository link.
If the repository is not public yet, use `<span class="soon">Repository coming soon</span>` instead of a link.

**Add a note.**
1. Copy `templates/note-template.html` to `notes/your-note.html` and follow the comment at the top.
2. Add an `<li>` for it at the top of the list in `notes/index.html`, and at the top of the list in the
   Field notes sheet in `index.html` (keep three there, newest first).
3. Add the page to `sitemap.xml`.

**Rename the section.** The nav label and the sheet heading both say "Field notes". Change both in index.html.

**Update the revision date.** Each title block says "Oct 2026". Search and replace when you publish a larger update.

## Deploy on GitHub Pages

1. Name the repository `jt-manful.github.io` (it must match your username for the root address).
2. Put these files at the top level of the repository and push to `main`.
3. In the repository, open Settings, then Pages, and set the source to "Deploy from a branch", branch `main`, folder `/ (root)`.
4. After a minute the site is live at https://jt-manful.github.io/.

Nothing needs building. The `.nojekyll` file stops GitHub from processing the folders.

## How the robot arm works

The drawing in the intro is an inline SVG. `assets/js/main.js` solves two link inverse kinematics each frame
and rotates the three joint groups. It follows the mouse pointer while the pointer is over the intro, and otherwise
runs a pick and place loop between marks A and B. It pauses when the intro is off screen or the tab is hidden.
With reduced motion enabled, or with JavaScript off, it is a still drawing.

## Licences

Code: your choice (add a LICENSE file if you want one).
Fonts: Archivo and IBM Plex Mono are open source under the SIL Open Font License. The licence texts are in `assets/fonts/`.

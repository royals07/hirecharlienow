# Hire Charlie Now — Australia edition

The public site is a set of HTML, CSS, JavaScript and asset files in the repository root. GitHub Pages publishes the existing `main` branch to `hirecharlienow.com` using the root `CNAME` file.

## Preview a change

From the repository root, run:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>. No frontend build or npm installation is required. The existing root and `functions/` npm packages belong to the Firebase backend, not the website preview.

Forms and Firebase features connect to the existing live services, including when the HTML is served locally. Submitting a form, chat message, pixel or score writes real data.

## Files to edit

| Content                                   | Files                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Homepage, work and Australia plans        | `index.html`                                                                            |
| Creative, hospitality and IT hiring pages | `work-creative.html`, `work-hospitality.html`, `work-it.html`                           |
| Stray-inspired robot case study           | `project-stray.html`, `project.js`                                                      |
| Main styles and shared controls           | `site.css`, `site.js`, `chapter.css`, `content.js`                                      |
| Availability and Tape Archive entries     | `data/site-content.json`                                                                |
| Tape Archive                              | `archive.html`                                                                          |
| Phone-friendly update desk                | `editor.html`, `editor.js`                                                              |
| Postcard guestbook                        | `guestbook.html`, `postcards.js`                                                        |
| QR contact card and sharing               | `share.html`, `sharing.js`, `assets/hirecharlienow-qr.png`, `assets/charlie-social.jpg` |
| Contact form                              | `contact.html`                                                                          |
| Public chat                               | `chat.html`, `chat.js`                                                                  |
| Game and leaderboards                     | `flappycharlie.html`, `flappycharlie.js`                                                |
| Shared pixel canvas                       | `pixelart.html`                                                                         |
| Game and canvas styling                   | `legacy-refresh.css`                                                                    |
| Printable CV pages                        | `cv-general.html`, `cv-it.html`                                                         |
| Downloadable CVs                          | `assets/charlie-woodhead-general-cv.pdf`, `assets/charlie-woodhead-it-cv.pdf`           |
| Portfolio previews                        | `assets/stray-robot.jpg`, `assets/gremloblin.jpg`, `assets/pyroow.jpg`                  |

Keep the HTML CVs and PDFs in sync when changing experience or qualifications. Asset provenance and the generated sharing-card prompt are recorded in `ASSET_SOURCES.md`.

## Update availability or the archive from your phone

Bookmark <https://hirecharlienow.com/editor.html>. It is deliberately absent from the visitor navigation and marked `noindex`; anyone with its URL can load the editor, but only authorised GitHub users can publish changes.

1. Edit the current location, next stop, work status, start-date note and remote-work note. Add a Tape Archive entry with a title, date, place and short description.
2. Choose **Preview & download update**. Review the content and keep the downloaded filename as `site-content.json`.
3. Choose **Open GitHub upload**, sign in to GitHub if needed, and upload the downloaded file into the `data` folder, replacing the existing file. If your phone adds a suffix such as `(1)`, rename the file first.
4. Confirm the commit to `main` in GitHub. GitHub Pages publishes the update. You can instead choose GitHub's new-branch option to review a change before merging it. The separate private Sites preview does not automatically follow GitHub changes.

Drafts are saved only in the current browser's local storage. The editor neither authenticates to GitHub nor publishes automatically, and it stores no access token. Reload published content before editing on another device so that an old draft does not overwrite newer work.

Availability values update the homepage and work-page status panels. Page introductions, CVs and SEO descriptions are separate copy; revise those too when the Australia plans become a move that has happened.

## Add a film or field note

The archive starts with a Bantham field note. No film has been attached to it. Leave an entry's video field empty for a field note, or add an HTTPS YouTube, Vimeo, MP4 or WebM URL for a film. YouTube/Vimeo players load only when a visitor chooses to watch. Embedded films must allow playback on other websites.

The editor saves links; it does not upload video or poster files. Upload media to your chosen host first, then paste its URL. A poster can also use a path inside `assets/`. Entries are displayed newest first. Invalid dates, duplicate entry IDs and unsupported media URLs are rejected before export.

To update the JSON directly, retain `version: 1`, all availability fields and the `tapes` array. Each entry needs a unique ID, title, `YYYY-MM-DD` date, location, summary, video string and poster string. Use empty strings for unused video and poster fields. Keep dates and availability factual.

## Existing service connections

- **Email:** the contact form posts to the existing Formspree endpoint `https://formspree.io/f/mlgwdzlw`. Check the Formspree dashboard for delivery and recipient settings if an email is missing; the site cannot verify inbox delivery.
- **Firebase:** the project remains `charlie-guestbook`, with the same Realtime Database. Chat uses `chat` and `presence`; postcards use `guestbook`; the game uses `flappyCharlieScores`; the pixel canvas uses `pixelCanvas` and `canvasStats`. Existing content is retained, including older festival guestbook entries.
- **Postcards:** the new guestbook uses the existing message schema, adding an optional tip label inside the message text. It no longer writes visitor counters when someone opens the page. Names are unverified and messages are public. Client-side cooldowns and duplicate-submission prevention do not replace server-side database rules or moderation.
- **Backend:** `firebase.json` points to `functions/`. These frontend changes do not redeploy Functions or modify database rules. The public chat uses visitor-chosen names, not authenticated identities.
- **Domain:** retain the existing `CNAME`, GitHub Pages settings and DNS records.

Do not put private service credentials in HTML or browser JavaScript. Firebase's existing client configuration is public; database access is controlled by the project's rules.

## Automated interaction checks

The isolated `tests/` package has 18 interaction checks using jsdom and mocked Formspree/Firebase services. They cover failed and successful submissions, duplicate-write prevention, chat updates, keyboard controls, motion/sound preferences, hiring-topic selection, shared availability, archive filters and media validation, editor draft/export behavior, postcard compatibility and failure handling, the opt-in 3D viewer and canonical sharing links. No test sends data to live services.

```sh
npm --prefix tests ci
npm --prefix tests test
```

These checks do not render layouts or verify real email delivery, Firebase permissions, game animation or mobile browser behavior. Use the manual review below for those checks.

## Review and publish

1. Review the pull request and private preview. Check the new hiring pages, archive, postcard form, QR card and update desk on desktop and mobile, plus CV downloads, keyboard navigation and Australia copy. The earlier homepage design and email delivery were confirmed by Charlie; the new additions need their own browser review.
2. When ready to perform live checks, send a contact-form message and confirm its arrival in the intended inbox. Check chat, a game score and a pixel placement against the existing services.
3. Merge the reviewed pull request into `main` to publish through the existing GitHub Pages deployment. Check the Pages workflow in GitHub Actions and then the public domain.

To roll back, revert the merge commit and allow GitHub Pages to publish the reverted version. A frontend rollback does not undo messages, scores or pixels written to Firebase.

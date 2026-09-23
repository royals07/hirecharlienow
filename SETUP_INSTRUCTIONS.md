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

| Content                            | Files                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| Homepage, work and Australia plans | `index.html`                                                                  |
| Main styles and shared controls    | `site.css`, `site.js`                                                         |
| Contact form                       | `contact.html`                                                                |
| Public chat                        | `chat.html`, `chat.js`                                                        |
| Game and leaderboards              | `flappycharlie.html`, `flappycharlie.js`                                      |
| Shared pixel canvas                | `pixelart.html`                                                               |
| Game and canvas styling            | `legacy-refresh.css`                                                          |
| Printable CV pages                 | `cv-general.html`, `cv-it.html`                                               |
| Downloadable CVs                   | `assets/charlie-woodhead-general-cv.pdf`, `assets/charlie-woodhead-it-cv.pdf` |
| Portfolio previews                 | `assets/stray-robot.jpg`, `assets/gremloblin.jpg`, `assets/pyroow.jpg`        |

Keep the HTML CVs and PDFs in sync when changing experience or qualifications. Update Australia location and availability copy as plans become confirmed.

## Existing service connections

- **Email:** the contact form posts to the existing Formspree endpoint `https://formspree.io/f/mlgwdzlw`. Check the Formspree dashboard for delivery and recipient settings if an email is missing; the site cannot verify inbox delivery.
- **Firebase:** the project remains `charlie-guestbook`, with the same Realtime Database. Chat uses `chat` and `presence`; the game uses `flappyCharlieScores`; the pixel canvas uses `pixelCanvas` and `canvasStats`. Existing content is retained.
- **Backend:** `firebase.json` points to `functions/`. These frontend changes do not redeploy Functions or modify database rules. The public chat uses visitor-chosen names, not authenticated identities.
- **Domain:** retain the existing `CNAME`, GitHub Pages settings and DNS records.

Do not put private service credentials in HTML or browser JavaScript. Firebase's existing client configuration is public; database access is controlled by the project's rules.

## Automated interaction checks

The isolated `tests/` package exercises the pages with jsdom and mocked Formspree/Firebase services. It covers failed and successful submissions, duplicate-write prevention, chat updates, keyboard controls, and motion/sound preferences without sending data to the live services.

```sh
npm --prefix tests ci
npm --prefix tests test
```

These checks do not render layouts or verify real email delivery, Firebase permissions, game animation or mobile browser behavior. Use the manual review below for those checks.

## Review and publish

1. Review the pull request and preview the branch locally. Check desktop and mobile layouts, CV downloads, keyboard navigation, and the content of the Australia plans.
2. When ready to perform live checks, send a contact-form message and confirm its arrival in the intended inbox. Check chat, a game score and a pixel placement against the existing services.
3. Merge the reviewed pull request into `main` to publish through the existing GitHub Pages deployment. Check the Pages workflow in GitHub Actions and then the public domain.

To roll back, revert the merge commit and allow GitHub Pages to publish the reverted version. A frontend rollback does not undo messages, scores or pixels written to Firebase.

# Stakeholder Website Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the September 2 stakeholder polish requests across the public Pillars of Tech site while preserving every existing registration, volunteer, admin, privacy, and publication boundary.

**Architecture:** Keep the current Next.js App Router and shared family-design primitives. Make visual changes at the presentation layer, retain the existing public data contracts and API routes, and encode each stakeholder request in focused Vitest source/render regressions before changing components. Execute the four tasks sequentially with a fresh `gpt-5.6-luna` worker at `xhigh` reasoning for each task, followed by primary review of that task's diff and focused tests.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, shared CSS in `src/app/globals.css`, Vitest, Testing Library, Supabase-backed server boundaries (unchanged).

## Global Constraints

- Start from branch `andrew/family-full-site-live-chat` at `b3a6e12d4629a59227c541b3ca8ac30878e2ed61`; do not merge, push, deploy, or modify the owner checkout as part of this plan.
- Keep exactly five primary navigation destinations: For Families, Events, Our Work, Volunteer, and Contact. Do not restore Support or Branches to the header.
- Preserve the two real timelapse videos and their posters, silent autoplay fallback, visibility handling, and `prefers-reduced-motion` behavior.
- Preserve event participant registration, volunteer sign-in/registration/withdrawal/check-in, contact submission, admin authentication, staff authorization, Supabase service-role isolation, RLS, and all fail-closed behavior. Do not modify API, auth, repository, Supabase, SQL, middleware, or admin files. Public policy copy must describe what visitors can actually use now; it must not present the deferred Discord bridge or an unavailable public chat widget as active.
- Keep `/ga` unpublished through the existing `notFound()` guard. Do not add Georgia people, programs, photos, links, or claims.
- Discord remains deferred. Do not add Discord packages, credentials, webhooks, UI, public access, or activation claims.
- Use only the existing eight-color token set. For the stakeholder-facing surfaces in this plan, prefer navy, cream/paper, and light blue; do not add a ninth color.
- Remove visible decorative photo-caption/citation overlays, but keep descriptive `alt` text and keep `docs/event-photo-review.json`, its hashes/provenance, and the curation pipeline unchanged. Team-member name/role captions are identity content, not image citations, and remain. The guarded `/ga` implementation remains untouched.
- Keep transparent-finance and Hack Club sponsorship content and links. Hide Total HCB Revenue from the homepage impact cards without deleting its source-backed record or changing impact schemas/repositories.
- All visible multiword navigation and action labels touched by this plan use initial capitals, including short words, following the stakeholder example `Find A Family Event`. Prose, status messages, form labels, and accessible `aria-label` text remain natural sentence case.
- Preserve minimum 44px interactive targets, visible keyboard focus, meaningful heading order, keyboard dialogs, and mobile layouts. No visual acceptance is complete without desktop and mobile browser inspection.

---

## Stakeholder Gap Classification

### Already satisfied and therefore protected

- The homepage already uses real local photography, two real 720p timelapse films, posters, a static fallback, and reduced-motion handling; the scroll-controlled rover is absent.
- The header already has the required five destinations, and secondary/support/legal destinations remain available in the footer.
- Shared `.button` controls are already pill-shaped, but navigation and several route-local controls do not yet use the same outlined treatment.
- The site already contains event and volunteer registration flows, contact delivery, protected admin routes, database-controlled `staff_members` authorization, and fail-closed Supabase behavior.
- Impact records already retain a date, source URL, and methodology note; these provenance fields must remain even as their visible presentation becomes more compact.
- `/ga` is already guarded, and the Georgia homepage card is informational and non-linking.
- The fundraiser already routes checkout through Hack Club and keeps the optional third-party embed opt-in.

### Still requiring implementation

- Enlarge the logo, rebalance header height, outline the five navigation choices, title-case visible actions, and prevent light overscroll/short-page bars below the footer.
- Rework homepage wrapping, core colors, initial-fold behavior, section spacing, photo labels, event audience copy, impact cards, branch emphasis, finance alignment/order, and the two-line contact callout.
- Convert the events archive rows to responsive cards while preserving filters and registration links; polish volunteer and contact heroes without touching their behavior.
- Remove the fundraiser pre-hero strip, tighten wishlist separators/space, distinguish the FAQ callout from the footer, remove remaining decorative photo captions, and give Privacy and Accessibility one consistent, compact visual hierarchy without changing their substantive safety copy.

---

### Task 1: Global Chrome, Logo, Navigation, and Page Edge Contract

**Files:**
- Create: `tests/stakeholder-global-chrome.test.ts`
- Modify: `src/components/site/BrandMark.tsx:4-19`
- Modify: `src/components/Navbar.tsx:10-16,82-130`
- Modify: `src/components/Footer.tsx:7-24,37-87`
- Modify: `src/app/globals.css:40-54,88-166,288-335,1098-1150,1250-1266`
- Modify: `tests/public-events-navigation-regression.test.ts:21-30`
- Modify: `tests/task-1-family-homepage.test.ts:86-108`

**Interfaces:**
- Consumes: `BrandMark({ compact?: boolean })`, the existing five-entry `primaryLinks` array, `#main-content`, and existing CSS color/font tokens.
- Produces: a 240px compact logo on desktop (205px at the mobile breakpoint), 104px desktop/84px mobile header rhythm, five outlined pill navigation links, balanced/pretty text wrapping utilities, and a flex page shell that keeps the navy footer/background at the viewport bottom.

- [ ] **Step 1: Add failing global-chrome contract tests**

  Create four assertions in `tests/stakeholder-global-chrome.test.ts`: extract the five `primaryLinks` labels and require exactly `['For Families', 'Events', 'Our Work', 'Volunteer', 'Contact']`; require compact logo width `240`; require `.site-nav__link` to include a visible border, padding, and `border-radius: 999px`; require the footer to omit `Family-friendly by design.` and the global body/`#main-content` contract to include `min-height: 100svh` and `flex: 1`. Update the two existing navigation tests to the same title-cased labels while retaining the assertions that Support, Branches, and protected-route chrome remain absent.

- [ ] **Step 2: Run the new and affected tests and verify RED**

  Run: `npm test -- --run tests/stakeholder-global-chrome.test.ts tests/public-events-navigation-regression.test.ts tests/task-1-family-homepage.test.ts`

  Expected: FAIL on the old labels (`For families`, `Our work`), compact width `205`, unoutlined navigation, footer tagline, and missing viewport-flex rules; existing protected-route assertions still pass.

- [ ] **Step 3: Implement only the shared chrome changes**

  In `BrandMark.tsx`, use `width={compact ? 240 : 280}` and matching responsive `sizes`; the 1400x250 source asset is large enough, so do not replace it. In `Navbar.tsx`, title-case the two multiword labels and keep the hrefs unchanged; add the existing `site-nav__link` class treatment to desktop only, leaving mobile focus trapping and body-scroll restoration intact. In `globals.css`, make `body` a `min-height: 100svh` flex column with navy fallback background, give `#main-content` `flex: 1` and the paper background, add `text-wrap: balance` to display/family headings and `text-wrap: pretty` to descriptive copy, set desktop/mobile header heights to 104px/84px, and give desktop nav links a 1px cream-visible border, pill radius, and horizontal padding. In `Footer.tsx`, title-case touched multiword links, remove only the final family-friendly tagline, and keep copyright, logo, sponsorship, finance, support, social, legal, and accessibility links.

- [ ] **Step 4: Run focused tests and lint/typecheck**

  Run: `npm test -- --run tests/stakeholder-global-chrome.test.ts tests/public-interactions.test.tsx tests/public-events-navigation-regression.test.ts tests/task-1-family-homepage.test.ts && npm run lint && npm run typecheck`

  Expected: PASS; five desktop/mobile destinations remain, keyboard menu tests pass, and no TypeScript or ESLint errors are reported.

- [ ] **Step 5: Review and commit Task 1**

  Run: `git diff --check && git diff -- src/components/site/BrandMark.tsx src/components/Navbar.tsx src/components/Footer.tsx src/app/globals.css tests/stakeholder-global-chrome.test.ts tests/public-events-navigation-regression.test.ts tests/task-1-family-homepage.test.ts`

  Expected: no whitespace errors; no route, auth, API, Supabase, or admin changes.

  Commit: `git add src/components/site/BrandMark.tsx src/components/Navbar.tsx src/components/Footer.tsx src/app/globals.css tests/stakeholder-global-chrome.test.ts tests/public-events-navigation-regression.test.ts tests/task-1-family-homepage.test.ts && git commit -m "style: polish public navigation and page chrome"`

---

### Task 2: Homepage Hierarchy, Palette, Impact, and Caption Cleanup

**Files:**
- Create: `tests/stakeholder-homepage-polish.test.ts`
- Modify: `src/app/page.tsx:27-39`
- Modify: `src/components/site/TimelapseHero.tsx:152-161`
- Modify: `src/components/site/FamiliesIntro.tsx:3-50`
- Modify: `src/components/site/NextEventSection.tsx:18-60`
- Modify: `src/components/site/EventProof.tsx:7-54`
- Modify: `src/components/site/ImpactSection.tsx:10-45`
- Modify: `src/components/site/BranchesSection.tsx:19-38`
- Modify: `src/components/site/FinanceSection.tsx:10-39`
- Modify: `src/components/site/ContactCta.tsx:7-17`
- Modify: `src/app/globals.css:404-1137,1268-1403`
- Modify: `tests/homepage-visuals.test.ts:9-60`
- Modify: `tests/public-interactions.test.tsx:173-195`
- Modify: `tests/redesign-foundation.test.ts:10-36`
- Modify: `tests/task-1-family-homepage.test.ts:47-71`

**Interfaces:**
- Consumes: `PublicEvent`, `PublicImpactMetric`, `PageShell`, `SectionHeading`, unchanged timelapse constants/playback logic, and the existing California/guarded Georgia content.
- Produces: `visibleMetrics = metrics.filter((metric) => metric.key !== 'hcb_revenue')`; one shared `How We Count Impact` disclosure after the metric grid that renders each visible metric's `methodologyNote` and `sourceUrl`; an exact audience label `8th-12th graders and their families`; caption-free photography with unchanged alt text; and homepage order ending `ContactCta` then `FinanceSection` before the global footer.

- [ ] **Step 1: Add failing homepage stakeholder tests**

  Create four tests in `tests/stakeholder-homepage-polish.test.ts`: require `<ContactCta />` before `<FinanceSection />`; require the exact audience phrase and the absence of `photo-note`, `figcaption`, and `caption:` in `NextEventSection.tsx`/`EventProof.tsx`; require `ImpactSection` to exclude key `hcb_revenue` while retaining `methodologyNote` and `sourceUrl`, render no per-card disclosure, and render exactly one shared `How We Count Impact` disclosure after the metric grid; require CSS to put the hero at least one small viewport tall, use sky rather than sun for `.trust-strip` and `.contact-panel`, use two defined impact columns without a blank third slot, vertically center `.finance-layout`, and use paper/sky/navy rather than coral for the homepage family/Georgia cards. Update existing homepage tests for the new section order and shared `View Source` links.

- [ ] **Step 2: Run homepage tests and verify RED**

  Run: `npm test -- --run tests/stakeholder-homepage-polish.test.ts tests/homepage-visuals.test.ts tests/public-interactions.test.tsx tests/redesign-foundation.test.ts tests/task-1-family-homepage.test.ts`

  Expected: FAIL on current section order, audience copy, visible photo labels, HCB revenue presentation, three-column impact layout, yellow surfaces, and old source label.

- [ ] **Step 3: Implement the homepage presentation changes**

  Keep all media playback code intact. Title-case hero/action links (`Find A Family Event`, `What To Expect`, `Browse All Events`, `See More Photos`, `See Current Events`, `Review HCB Transactions`, `Support The Work`). Make `.hero` at least `100svh` so the following strip is not visible in the initial viewport at 1440x900 or 390x844; recolor the strip to sky. Use one paper-and-navy card treatment for the three family steps, while retaining their numbers, icons, and copy. Remove the visible photo note and proof-photo captions but retain every current alt string. Set the next-event `For` value to exactly `8th-12th graders and their families`.

  In `ImpactSection`, derive `visibleMetrics` by excluding only `hcb_revenue`; map that array into cards containing only the metric title/value/date, with no repeated per-card controls. After the grid, render one `<details className="impact-method impact-method--shared">` whose summary is `How We Count Impact` and whose body lists each visible metric title, `metric.methodologyNote`, and internal external link labelled `View Source`. Use a two-column desktop/one-column mobile grid and stronger 2px card outlines. Do not edit `src/data/impact-snapshot.ts`, schemas, repositories, APIs, or admin impact controls.

  Keep the Georgia card non-linking and change only its surface from coral to paper with a defined outline; increase the California description's font size/line height rather than writing new claims. Split the contact heading into two block lines so `Talk with a real person.` begins its own line, recolor the panel to sky, and retain its contact route. Vertically center the finance columns, use the navy/cream/sky core palette, and move `FinanceSection` after `ContactCta` as the final homepage section.

- [ ] **Step 4: Run focused tests and verify GREEN**

  Run: `npm test -- --run tests/stakeholder-homepage-polish.test.ts tests/homepage-visuals.test.ts tests/public-interactions.test.tsx tests/redesign-foundation.test.ts tests/task-1-family-homepage.test.ts tests/hero-contact-sheet-layout.test.ts tests/public-hero-scale.test.ts`

  Expected: PASS; timelapse/reduced-motion assertions remain green, Georgia remains non-linking, source/method metadata remains rendered on demand, and Total HCB Revenue is absent only from the homepage presentation.

- [ ] **Step 5: Review and commit Task 2**

  Run: `git diff --check && git diff -- src/app/page.tsx src/components/site src/app/globals.css tests/stakeholder-homepage-polish.test.ts tests/homepage-visuals.test.ts tests/public-interactions.test.tsx tests/redesign-foundation.test.ts tests/task-1-family-homepage.test.ts`

  Expected: no whitespace errors; no media asset, data, route, auth, or publication-guard changes.

  Commit: `git add src/app/page.tsx src/components/site/TimelapseHero.tsx src/components/site/FamiliesIntro.tsx src/components/site/NextEventSection.tsx src/components/site/EventProof.tsx src/components/site/ImpactSection.tsx src/components/site/BranchesSection.tsx src/components/site/FinanceSection.tsx src/components/site/ContactCta.tsx src/app/globals.css tests/stakeholder-homepage-polish.test.ts tests/homepage-visuals.test.ts tests/public-interactions.test.tsx tests/redesign-foundation.test.ts tests/task-1-family-homepage.test.ts && git commit -m "style: refine family homepage hierarchy"`

---

### Task 3: Card-Based Events, Team/Volunteer Heroes, and Contact Header

**Files:**
- Create: `tests/stakeholder-interaction-polish.test.ts`
- Modify: `src/app/events/page.tsx:81-239,323-449`
- Modify: `src/app/events/[id]/page.tsx:286-316`
- Modify: `src/app/volunteer/page.tsx:1-30,454-484`
- Modify: `src/components/Team.tsx:33-133`
- Modify: `src/app/contact/page.tsx:10-16`
- Modify: `src/components/Contact.tsx:142-209,375-382`
- Modify: `tests/events-page-rendered.test.tsx:65-121`
- Modify: `tests/event-experience.test.ts:18-49`
- Modify: `tests/action-support-visuals.test.ts:9-73`
- Modify: `tests/task-3-contact.test.ts:230-240`

**Interfaces:**
- Consumes: unchanged `/api/events` payload validated by `publicEventSchema`, `PublicEvent`, `resolveEventImageAlt`, participant/volunteer registration URLs, the existing Team and Volunteer application URLs, `ButtonLink`, `CONTACT_EMAIL`, and the current contact-form state/submit handlers.
- Produces: local `EventCard({ event }: { event: PublicEvent })` with `data-event-card={event.id}`; unchanged status/branch/date/location/registration semantics in a responsive 1/2/3-column grid; caption-free event images; real button-styled application actions on Team and Volunteer; and presentation-only hero/header changes.

- [ ] **Step 1: Add failing interaction-page tests**

  Create four tests in `tests/stakeholder-interaction-polish.test.ts`: require an `EventCard` interface, `data-event-card`, `md:grid-cols-2`, `xl:grid-cols-3`, pill-shaped search/status/branch controls, and no `<figcaption>` in event list/detail; require participant and volunteer href templates to remain; require both Team and Volunteer application links to use the shared outlined pill/button treatment with initial-cap labels, retain the Team route's names/roles and all three `volunteerService` calls, and omit only decorative hero figcaptions; require contact to omit wrapper `pt-16` and `Start a conversation`, use `underline-offset-2`, omit its figcaption, and retain `fetch('/api/contact'`, `contact-form`, live-chat deferral copy, and the existing email. Add rendered assertions to `events-page-rendered.test.tsx` for one card per filtered event and unchanged actionable hrefs.

- [ ] **Step 2: Run interaction tests and verify RED**

  Run: `npm test -- --run tests/stakeholder-interaction-polish.test.ts tests/events-page-rendered.test.tsx tests/event-experience.test.ts tests/action-support-visuals.test.ts tests/task-3-contact.test.ts`

  Expected: FAIL because events are rows, status filters/search are rectangular, photo captions are visible, the volunteer application is styled as an underlined link, and contact has extra top/eyebrow space.

- [ ] **Step 3: Convert the event archive to cards without changing behavior**

  Rename the local `EventRow` to `EventCard` and keep its existing image selection, safe alt resolution, story, branch/status labels, date/location/time, participant-open/full handling, volunteer-open handling, and href construction. Change only its layout to a full-height rounded 2px-outlined article with image on top, content in the middle, and actions at the bottom; add `data-event-card={event.id}`. Wrap each upcoming/completed/cancelled map in `grid gap-6 md:grid-cols-2 xl:grid-cols-3`. Give the archive main a 24px/32px gap below the global navbar, and give the search input and all status/branch filters `rounded-full border-2` treatment with 44px minimum height. Title-case visible action labels. Remove `FeaturedProgram` and event-detail image figcaptions while retaining their `Image alt` values and surrounding visible event headings.

- [ ] **Step 4: Polish volunteer and contact presentation only**

  Import `ButtonLink` in the volunteer page; replace the application underline with `<ButtonLink href={teamJoinUrl} external variant="navy">Join The Team Application</ButtonLink>`, keep the two-column hero vertically centered, round/outline its image, and remove only the decorative figcaption. In `Team.tsx`, convert both existing join-application anchors to the same shared outlined pill/button presentation and title-case their labels, while keeping every approved member name, role, portrait, URL, and identity caption. Do not change session loading, deep links, sign-in, registration, withdrawal, QR, check-in, modal focus, or errors.

  Remove `pt-16` from the contact route wrapper. In `Contact.tsx`, remove the `Start a conversation` eyebrow/icon, tighten header padding, move the mail underline to `underline-offset-2`, remove the photo figcaption, and apply consistent pill/2px-outline treatment and initial capitals to visible multiword action buttons. Do not change form fields, validation, honeypot, API payload, focus movement, privacy warning, or the explicit statement that live chat is not connected yet.

- [ ] **Step 5: Run focused interaction and security regressions**

  Run: `npm test -- --run tests/stakeholder-interaction-polish.test.ts tests/events-page-rendered.test.tsx tests/event-experience.test.ts tests/action-support-visuals.test.ts tests/task-3-contact.test.ts tests/volunteer-editorial.test.ts tests/volunteer-api.test.ts tests/auth-foundation.test.ts tests/request-hardening.test.ts`

  Expected: PASS; filtering and current/completed/cancelled separation work, registration links remain exact, contact submission contracts pass, and volunteer/auth/request-hardening tests remain green.

- [ ] **Step 6: Review and commit Task 3**

  Run: `git diff --check && git diff --name-only b3a6e12d4629a59227c541b3ca8ac30878e2ed61..HEAD && git diff -- src/app/events/page.tsx src/app/events/'[id]'/page.tsx src/app/volunteer/page.tsx src/components/Team.tsx src/app/contact/page.tsx src/components/Contact.tsx`

  Expected: no whitespace errors; no files under `src/app/api`, `src/lib/auth`, `src/lib/supabase`, `src/app/(admin-protected)`, `supabase`, or `src/middleware.ts` appear.

  Commit: `git add src/app/events/page.tsx 'src/app/events/[id]/page.tsx' src/app/volunteer/page.tsx src/components/Team.tsx src/app/contact/page.tsx src/components/Contact.tsx tests/stakeholder-interaction-polish.test.ts tests/events-page-rendered.test.tsx tests/event-experience.test.ts tests/action-support-visuals.test.ts tests/task-3-contact.test.ts && git commit -m "style: turn public event journeys into cards"`

---

### Task 4: Support, FAQ, Policy Pages, Remaining Captions, and Final Acceptance

**Files:**
- Create: `tests/stakeholder-support-policy-polish.test.ts`
- Modify: `src/app/fundraiser/page.tsx:15-104`
- Modify: `src/app/wishlist/page.tsx:82-194`
- Modify: `src/app/faq/page.tsx:131-206`
- Modify: `src/app/privacy/page.tsx:11-85`
- Modify: `src/app/accessibility/page.tsx:11-77`
- Modify: `src/components/About.tsx:44-99,225-253`
- Modify: `src/app/newsletter/page.tsx:23-114`
- Modify: `src/app/globals.css:94-147,1071-1150,1250-1417`
- Modify: `tests/action-support-visuals.test.ts:42-117`
- Modify: `tests/informational-pages.test.ts:20-90`
- Modify: `tests/task-2-public-routes.test.ts:105-133`

**Interfaces:**
- Consumes: unchanged Hack Club `donationUrl`/`ledgerUrl`, `ExternalEmbedOptIn`, wishlist item/group arrays, FAQ content, current contact-form availability, `PageShell`, `SectionHeading`, `FriendlyCard`, and existing real image paths/alt text.
- Produces: an over-image Home pill on Fundraiser; single-separator wishlist groups; a light-blue FAQ callout visibly distinct from the navy footer; shared `policy-page`, `policy-hero`, `policy-section`, and `policy-actions` presentation classes; accurate plain-language policy copy that identifies public live chat and Discord as deferred; and no decorative public photo overlays outside intentional team identity and guarded `/ga` content.

- [ ] **Step 1: Add failing support/policy tests**

  Create four tests in `tests/stakeholder-support-policy-polish.test.ts`: require Fundraiser to omit `Support Pillars of Tech`/`A direct route to the work`, retain both Hack Club URLs and `ExternalEmbedOptIn`, and place a pill-shaped Home link inside the hero; require Wishlist to omit its figcaption, use one separator between `Choose one useful piece.` and each group, reduce section padding, and retain all item/contact routes; require FAQ's final callout to use a sky surface distinct from the footer; require Privacy and Accessibility to use all four shared policy classes, retain their safety/known-limitations/contact guidance, state that the contact form is currently available, and avoid claims that a visitor live-chat widget, Discord staff bridge, office-hours queue, or 30-day chat-retention job is currently active. Add a caption scan over homepage proof/next-event, About, Events, event detail, Volunteer, Contact, Wishlist, and Newsletter that expects no `<figcaption>`, `photo-note`, or decorative `caption` property, while separately asserting that all current alt strings and `docs/event-photo-review.json` provenance records remain.

- [ ] **Step 2: Run support/policy tests and verify RED**

  Run: `npm test -- --run tests/stakeholder-support-policy-polish.test.ts tests/action-support-visuals.test.ts tests/informational-pages.test.ts tests/task-2-public-routes.test.ts`

  Expected: FAIL on the fundraiser strip, wishlist double rules/space, FAQ/footer color collision, old policy structure, and remaining About/Wishlist/Newsletter captions; substantive route-content tests continue to identify protected copy and destinations.

- [ ] **Step 3: Implement support-route and remaining caption changes**

  Delete the Fundraiser pre-hero header only; keep the global navbar. Put the existing Home link at the upper-left of the hero image with `absolute`, `z-10`, 44px minimum height, cream-visible 2px outline, and `rounded-full`. Keep both finance/donation links and embed opt-in, tighten the secure-path grid spacing, and title-case `Open Secure Donation Page`, `View Transparent Finances`, and `Load Secure Checkout`.

  In Wishlist, remove the image figcaption, reduce hero/list/final-callout vertical padding, remove the heading's bottom border plus nested `border-y` combination, and use one top separator per wishlist group plus the existing item dividers. Keep every item and `/contact?reason=wishlist`; title-case its multiword actions. Change the FAQ final callout to a sky background with navy text and an outlined navy pill so it is visually distinct from the navy footer. Remove decorative caption fields/figcaptions from About and Newsletter, retain their images/alts, and title-case their visible multiword actions. Do not remove Team name/role captions and do not touch `src/app/ga/page.tsx`.

- [ ] **Step 4: Restyle Privacy and Accessibility without changing policy meaning**

  Add `policy-page` to both main elements, `policy-hero` to each opening section, `policy-section` to content sections, and `policy-actions` to the single final CTA row. In CSS, cap policy prose at 72ch, use 64-80px responsive section padding rather than the generic 110px, add a 4px sky edge to each hero, use consistent 2px navy outlines/2rem radii on policy cards, and align the final action group in one bordered paper panel that stacks below 720px. Preserve accurate collection, under-13, sensitive-data, keyboard, reduced-motion, third-party, known-limitations, emergency, and contact guidance. Rewrite chat-specific sections to say that public live chat and the Discord reply bridge are not enabled yet, so the contact form/direct email are the supported visitor channels; do not claim an active queue, deployed Discord channel, or operational retention job. Do not modify or activate backend chat/Discord code.

- [ ] **Step 5: Run the complete deterministic acceptance suite**

  Run: `npm run check`

  Expected: lint PASS, typecheck PASS, and Vitest PASS with 48 files and 263 tests (the 44-file/247-test baseline plus four new four-test files).

  Run: `npm run build && git diff --check`

  Expected: production build exits 0 with no route/type errors; whitespace check prints nothing.

  Run: `git diff --name-only b3a6e12d4629a59227c541b3ca8ac30878e2ed61..HEAD | rg '^(src/app/api|src/lib/(auth|supabase)|src/app/\(admin-protected\)|supabase/|src/middleware\.ts|src/data/impact-snapshot\.ts|docs/event-photo-review\.json|scripts/curate-event-photos\.mjs)'`

  Expected: no output. Any output is a release blocker requiring the unintended protected-file change to be removed and the full check rerun.

  Run: `rg -n '<figcaption|photo-note|caption:' src/components/site src/components/About.tsx src/components/Contact.tsx src/app/events src/app/volunteer/page.tsx src/app/wishlist/page.tsx src/app/newsletter/page.tsx`

  Expected: no decorative caption hits in the listed stakeholder surfaces. Team identity captions and guarded `/ga` are intentionally outside this scan.

- [ ] **Step 6: Perform responsive browser acceptance**

  Run in terminal 1: `npm start -- --hostname 127.0.0.1 --port 3013`

  Run in terminal 2: `for route in / /events /volunteer /contact /fundraiser /wishlist /faq /privacy /accessibility /about /newsletter; do curl -s -o /dev/null -w "%{http_code} $route\n" "http://127.0.0.1:3013$route"; done; curl -s -o /dev/null -w "%{http_code} /ga\n" http://127.0.0.1:3013/ga`

  Expected: every listed public route returns 200 and `/ga` returns 404.

  Inspect `/`, `/events`, `/volunteer`, `/contact`, `/fundraiser`, `/wishlist`, `/faq`, `/privacy`, and `/accessibility` at 1440x900 and 390x844. Expected: no horizontal overflow or broken images; logo legible and not clipped; exactly five outlined header choices; the homepage strip is below the initial fold; headings wrap without isolated indentation or large word gaps; all touched controls are pill-shaped, outlined, at least 44px, and title-cased; event cards form 3/2/1 columns; no decorative photo labels cover people; fundraiser Home overlays the image; wishlist has one rule between heading and groups; FAQ callout is distinct from footer; policy pages have compact, consistent hierarchy; footer reaches the viewport bottom with no light bar. Enable reduced motion and confirm hero posters remain useful and no motion-dependent content disappears. Keyboard-tab through navigation, filters, registration/volunteer/contact actions, disclosures, and policy links; focus must remain visible.

- [ ] **Step 7: Review and commit Task 4 only after every gate passes**

  Run: `git status --short && git diff --stat b3a6e12d4629a59227c541b3ca8ac30878e2ed61..HEAD`

  Expected: only the public presentation/tests named by Tasks 1-4 plus this plan are present; no generated build output, credentials, protected implementation, or provenance file changed.

  Commit: `git add src/app/fundraiser/page.tsx src/app/wishlist/page.tsx src/app/faq/page.tsx src/app/privacy/page.tsx src/app/accessibility/page.tsx src/components/About.tsx src/app/newsletter/page.tsx src/app/globals.css tests/stakeholder-support-policy-polish.test.ts tests/action-support-visuals.test.ts tests/informational-pages.test.ts tests/task-2-public-routes.test.ts && git commit -m "style: finish stakeholder public-page polish"`

---

## Definition of Done

- All stakeholder notes are either protected as already satisfied or covered by one of the four tasks above.
- `npm run check`, `npm run build`, `git diff --check`, protected-file scan, route status checks, and desktop/mobile/reduced-motion/keyboard acceptance all pass.
- Registration, volunteer, contact, admin, auth, Supabase/RLS, source provenance, real media, five-link navigation, and `/ga` guard remain intact.
- No Discord integration, secret, deployment, push, merge, or production claim is introduced.

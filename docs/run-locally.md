# Run the website locally

This guide is for someone reviewing the family-friendly Pillars of Tech website
on their own computer. It checks out the redesign branch directly and does not
change the repository's `master` branch.

## 1. Install the prerequisites

Install these tools before continuing:

- [Git](https://git-scm.com/downloads)
- Node.js 24.15 or newer
- npm 11 or newer, which is included with the standard Node.js installer

Confirm the installed versions in Terminal, Command Prompt, or PowerShell:

```sh
git --version
node --version
npm --version
```

The Node.js result must be `v24.15.0` or newer, and the npm result must begin
with `11` or a later major version.

## 2. Download only the redesign branch

Choose a folder where the project should be stored, open a terminal there, and
run:

```sh
git clone --branch andrew/family-full-site-live-chat --single-branch https://github.com/robinjes/Pillarsoftechwebsite.git
cd Pillarsoftechwebsite
```

Confirm that Git selected the correct branch:

```sh
git branch --show-current
```

It should print:

```text
andrew/family-full-site-live-chat
```

## 3. Install the locked dependencies

```sh
npm ci
```

Use `npm ci`, not `npm install`, so the exact reviewed dependency versions from
`package-lock.json` are installed.

## 4. Start the website

```sh
npm run dev
```

Wait until the terminal says the server is ready, then open:

[http://localhost:3000](http://localhost:3000)

The terminal must remain open while viewing the website. Press `Ctrl+C` when
finished.

### If port 3000 is already being used

Run the website on another port:

```sh
npm run dev -- --port 3001
```

Then open [http://localhost:3001](http://localhost:3001).

## What works without credentials

No `.env` file is required for a visual review. The following are available
from the checked-in branch:

- The complete public homepage and informational pages
- Responsive desktop and mobile navigation
- Event listings and public event pages from the safe local snapshot
- Real event photographs and both homepage timelapse videos
- Donation, wishlist, newsletter, FAQ, privacy, and accessibility information

Features that save or read private data deliberately fail closed without the
owner-managed Supabase configuration. This includes registrations, contact
submissions, volunteer accounts, check-in, staff administration, and private
media operations. Discord live-chat integration is not part of this preview.

The Georgia page deliberately returns the friendly not-found page until a
complete, approved, safe-for-public Georgia content packet is published.

## Optional: configure database-backed features

Only the repository owner or an authorized developer should do this. Never ask
someone to send keys through Discord, email, screenshots, or a commit.

Create a local ignored environment file:

macOS or Linux:

```sh
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Fill the required values using owner-approved local or preview credentials.
The variables and their security boundaries are documented in `.env.example`
and in the main README. Never commit `.env.local`.

## Run the checks

To verify the same source locally:

```sh
npm run check
npm run build
```

`npm run check` runs linting, TypeScript validation, and the automated test
suite. `npm run build` creates the optimized production build.

To view that production build instead of the development server:

```sh
npm start
```

Open [http://localhost:3000](http://localhost:3000), and press `Ctrl+C` when
finished.

## Get later updates from this branch

From inside the cloned `Pillarsoftechwebsite` folder:

```sh
git switch andrew/family-full-site-live-chat
git pull --ff-only origin andrew/family-full-site-live-chat
npm ci
```

Restart `npm run dev` after pulling updates.

## Common problems

### `node` or `npm` is not recognized

Node.js is missing or the terminal was opened before Node.js was installed.
Install Node.js, close the terminal completely, open a new terminal, and check
`node --version` again.

### The page does not open

Keep the terminal running and confirm that it printed a local URL. If the
terminal reports that port 3000 is occupied, use the port 3001 command above.

### A form says the service is unavailable

That is expected when previewing without private Supabase configuration. The
public design can still be reviewed safely; use owner-approved credentials only
when testing database-backed behavior.

### The timelapse does not start immediately

Give the videos a moment to load. They are muted and play automatically in the
homepage background. A browser with reduced-motion enabled receives the calmer
reduced-motion experience.

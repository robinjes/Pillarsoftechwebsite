This is the website code for the Pillars of Tech website.
Its domain is on porkbun and run through vercel.

## Local verification

Use Node.js 20 or newer (an active LTS release is recommended) with npm 10 or newer. Install the locked dependency set before running checks:

```sh
npm ci
npm run lint
npm run typecheck
npm run test:run
npm run build
npm audit --audit-level=low
```

`npm run check` runs linting, typechecking, and the test suite together. Use `npm run dev` for local development and `npm start` to serve a completed production build.

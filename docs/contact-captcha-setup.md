# Contact CAPTCHA setup

The contact form offers a standard Cloudflare Turnstile check or the PlayCaptcha claw game. Both modes require a server-verified Turnstile token; the game is an optional interaction, not a security boundary. Existing same-origin validation, honeypot and durable rate limits remain enabled. No Supabase migration is needed for this change.

Before deploying:

1. Create a **Managed** Turnstile widget in the [Cloudflare dashboard](https://dash.cloudflare.com/) and add `pillarsoftech.org` and `www.pillarsoftech.org` (plus any domains actually used to preview this site).
2. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to the widget's public site key in your hosting environment.
3. Set `TURNSTILE_SECRET_KEY` to its secret key in the server environment. Never use a `NEXT_PUBLIC_` prefix for this secret.
4. Ensure `NEXT_PUBLIC_SITE_URL` is your canonical origin. The server accepts that hostname (and `www.pillarsoftech.org` for the default domain). To support other preview domains, set `TURNSTILE_ALLOWED_HOSTNAMES` to a comma-separated list of **all** allowed exact hostnames, without protocols or paths. This overrides the defaults.
5. Rebuild and redeploy: the public site key is embedded at build time. Test both choices on the deployed contact page.

Without the public key, the form displays a direct email fallback. Without the secret, submissions fail closed. A completed game never substitutes for Siteverify, and tokens are never stored with contact messages. Tokens expire and can be used only once; the form resets verification after every submission attempt.

Local testing can use [Cloudflare's documented test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/). Never deploy test keys; they allow automated verification. Automated tests mock the provider, including wrong hostnames, wrong actions, duplicate/expired tokens and outages. Browser checks mock the message endpoint so no actual message is delivered.

PlayCaptcha is pinned to `0.1.0`; its assets and MIT license are included under `public/captcha/playcaptcha`. Keyboard controls are arrow keys and space/Enter; visitors can switch to the regular option at any time.

Validation: `npm run check` passed 61 test files / 358 tests. Local browser checks used the real Cloudflare test widget, a mocked message endpoint, both mode switches, widths 320/390/768/1440, asset loading and an actual completed claw game using keyboard controls at 390px.

The production build also passed. Production browser checks confirmed standard verification, the game, mocked submission, responsive layouts and navigation into Contact using the current document nonce, with no CAPTCHA CSP violations.

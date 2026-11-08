# Security Policy

## Supported versions

Vaitu is a service: only what is live is supported. That is the web app at [app.vaitu.net](https://app.vaitu.net), the latest build in each app store, the site at [vaitu.net](https://vaitu.net), and the backend they use.

## Reporting a vulnerability

Please do not open a public issue. Report it privately through [GitHub's security advisories](https://github.com/IngloriousCoderz/vaitu/security/advisories/new).

Include what an attacker can do, the steps to reproduce it, and the accounts or requests involved.

What to expect:

- An acknowledgement within 7 days.
- An assessment within 14 days: whether we consider it a vulnerability, and how severe.
- For accepted reports, a fix as soon as it is ready. We credit you unless you prefer otherwise.

There is no bug bounty.

## Testing rules

Good-faith research that follows these rules is welcome, and we will not pursue it:

- Use only accounts you created. Do not access, change or delete other people's data; if you reach any by accident, stop and tell us.
- Do not degrade the service: no denial of service, load tests or spam, including through emails, push notifications or the voice features.
- Do not use social engineering or phishing against our users or us.

## Out of scope

- Volumetric denial of service.
- Vulnerabilities in Supabase, Vercel, Firebase, Deepgram or OpenRouter themselves: report those to them.
- Missing security headers or settings with no demonstrated impact.
- Self-XSS, and attacks that need physical access to an unlocked device.

How the data is protected, and what stays open on purpose, is described in [docs/security.md](docs/security.md).

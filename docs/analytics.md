# Analytics

Vaitu measures how it is used with Google Analytics for Firebase, and only for
people who said yes. The PWA reports to the Firebase project's **Vaitu Web**
stream, and the Android and iOS apps to theirs. One adapter covers all three
(`@inglorious/firebase/analytics`, in `src/api/analytics.js`).

## Consent

Nothing is measured before an answer. The first visit shows a pill, in the
push pill's place and before it, asking to measure usage. "Allow" starts
measuring and "No thanks" is kept, so the pill never comes back. Either answer
is remembered on the device, and Preferences → Usage statistics changes it
just as easily. The type is `createAnalytics` from `@inglorious/web/analytics`
(`src/common/analytics-consent/`).

What that means in practice:

- In a browser, no analytics code loads until "Allow": no gtag, no cookie, no
  request. "No thanks" loads nothing either.
- The native apps start with collection off (`AndroidManifest.xml`,
  `Info.plist`, which also keep the advertising IDs out), and "Allow" turns it
  on.
- Advertising consents are always denied.

The privacy policy has to say all this, and name Google as the processor.

## What is measured

Page views, by themselves: in a browser, Google Analytics counts route changes
as page views. In the native apps, the adapter logs a screen view on each route
change, named after the route (`eventList`, `applicationDetail`).

The app's own events go through the same entity, and nothing is sent without
consent:

```js
api.notify("#analytics:analyticsTrack", {
  name: "sign_up",
  params: { method: "email" },
})
```

## Setting it up

The web stream's measurement ID (`G-…`, in the Firebase console under Project
settings → General → your web app) goes with the other Firebase values in
`.env.local`, and in Vercel:

```bash
VITE_FIREBASE_MEASUREMENT_ID=G-6FCC7VYSNK
```

Do not paste Google's `gtag.js` snippet into `index.html`: the native apps load
the same page, so it would report them as web visits from `localhost`, and it
would start before anyone agreed.

To watch events arrive, use DebugView in the Firebase console.

Next: [Mobile](mobile.md).

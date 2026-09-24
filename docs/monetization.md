# Monetization

Plan and licence audit for making money from CardScan: affiliate links, a scan limit with rewarded ads, a
premium subscription and ads. Android and web first.

## Rule that follows from the licences

**Card content stays free; only the scanner is limited.** Search, browsing, card pages, prices and the
collection are never behind a paywall, a subscription or an ad wall. What is limited is the camera scan
(our own feature) and what a subscription adds on top: no ads and unlimited scans.

## Licence audit (checked on 2026-09-24)

| Source | What the terms say | Consequence |
|---|---|---|
| Scryfall (Magic) | "You may not paywall access to Scryfall data." No payments, surveys or subscriptions in exchange for access to the data; with an account system, users must reach card data anonymously or with free accounts. Do not repackage or proxy the data without adding value. Images: do not crop or cover the copyright or artist name, no watermarks, no distortion or colour changes. | Magic data must stay free and anonymous. Never draw an ad or a lock over a card image. Our image proxy must keep adding value and keep the credits visible. |
| Wizards of the Coast Fan Content Policy (Magic) | Fan content may not be sold. Ad revenue, sponsorships and donations are allowed as long as they do not interfere with the community's access to it. The work must say it is not affiliated with Wizards. | Ads are fine, a paid tier for Magic content is not. Show a "not affiliated" notice. |
| Lorcast (Lorcana) | Ravensburger's Community Code Policy: "We are expressly prohibited from charging you to use or access this content." | Lorcana content must stay free. |
| YGOPRODeck (Yu-Gi-Oh!) | Do not hotlink images; download and re-host them. No commercial terms found on the guide page. | We already re-host. Commercial use not confirmed. |
| tcgcsv (TCGplayer prices) | The FAQ says nothing about commercial use. It is a hobby-run mirror of TCGplayer's API. | Prices may be shown, but check TCGplayer's own API terms before relying on it commercially. |
| TCGplayer price history | Unofficial endpoint, not part of a public API. | Risky once the app is commercial. Turn it off (`TCGPLAYER_HISTORY=false`) for the store release, or get API access. |
| TCGdex, Digimon, One Piece, Star Wars, Flesh and Blood sources; Pokémon, Konami, Bandai, Legend Story Studios, Fantasy Flight | **Not verified**: the terms could not be read automatically or no commercial terms were found. | Read each fan-content or community policy before publishing. The card images are the publishers' property. |

Not legal advice. Before publishing to the stores, someone should read the policies marked "not verified".

## Status

| Phase | State |
|---|---|
| Affiliate links | Done. Needs the two affiliate accounts (see below). |
| Scan limit | Done on the server, web and mobile: everyone starts with 5 scans (once), then an ad gives the next 5, and so on. |
| Premium | Server, web (Stripe) and Android (RevenueCat) code done. **Nothing was tested against Stripe, RevenueCat or Google Play**: it needs your accounts and keys. |
| Scan packs | One-off packs of 25 scans (0.99 EUR) and 100 scans (2.99 EUR), on web (Stripe) and Android (RevenueCat). Credits never expire. A refund takes the pack's scans back (a negative balance if they were already spent, paid off from later grants); RevenueCat documents `CANCELLATION` as also covering refunded non-renewing purchases; that its `transaction_id` is the refunded purchase's is assumed. |
| Web rewarded ad | Done, off until you set `NEXT_PUBLIC_WEB_AD_TAG_URL` (a VAST ad tag). Google IMA player; the server times the session (15 s minimum, 10 a day) because the browser cannot prove the ad was watched. Checked end to end in Chrome with Google's sample ad. Ads are requested non-personalised until there is a consent banner. |
| Rewarded ad, +5 scans | Server-side verification done and tested with a generated key. The app side needs a development build and your AdMob account. |
| Ads (banner) | Done in the Android app, shown only to free users on the scan result. Google's test ads until you set real unit ids. |

## Setup checklist (what only you can do)

1. **AdMob** (Android): create the app and two ad units (rewarded, banner). Put the app id in `apps/mobile/app.json`
   (`androidAppId`, now Google's test id) and the unit ids in `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID` /
   `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID`. On the rewarded unit enable server-side verification with the callback
   `https://<your api>/api/ads/ssv`, and set `ADMOB_REWARDED_AD_UNIT_ID` on the server.
2. **RevenueCat**: add the Android app, two subscription products (ids containing `monthly` and `yearly`) and
   two one-off products for the scan packs (ids containing `scans_25` and `scans_100`), put them in the current offering, add a webhook to `https://<your api>/api/billing/revenuecat` with an
   Authorization secret (`REVENUECAT_WEBHOOK_SECRET`), and set the Android public key as `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
3. **Stripe**: create the two subscription prices (`STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`), the two one-off prices for the packs (`STRIPE_PRICE_SCANS_25`, `STRIPE_PRICE_SCANS_100`), and also send `checkout.session.completed` and `charge.refunded` to the webhook, the secret key
   (`STRIPE_SECRET_KEY`) and a webhook to `https://<your api>/api/billing/stripe/webhook` for the
   `customer.subscription.*` events (`STRIPE_WEBHOOK_SECRET`). Set `WEB_PUBLIC_URL`.
4. **Affiliate**: `AFFILIATE_TCGPLAYER_URL` and `AFFILIATE_EBAY_CAMPAIGN_ID` once the programs approve you.
5. **Android build**: ads and purchases do not run in Expo Go; build with EAS (`eas build --profile development`).
6. Before publishing, read the "not verified" policies above, and turn off `TCGPLAYER_HISTORY`.

## Phases

1. **Affiliate links (done).** "Where to buy" on the card page (web and mobile): TCGplayer product page (from the
   product id we already store), Cardmarket (Magic, Pokémon and Yu-Gi-Oh! only: the paths for the other games could not be verified because the site turns away scripts), CardTrader and an eBay search. Configure `AFFILIATE_TCGPLAYER_URL`, `AFFILIATE_CARDMARKET_URL`,
   `AFFILIATE_CARDTRADER_URL` (templates with `{url}`) and `AFFILIATE_EBAY_CAMPAIGN_ID`; without them the links work and earn nothing. The commission notice
   shows only when a link is really an affiliate link. Both programs need an approved account.
2. **Scan limit on the server.** Everyone starts with 5 scans (once, `WELCOME_SCAN_CREDITS`), then each rewarded ad gives the next 5 (`REWARDED_AD_CREDITS`, up to 50 ads a day); an optional extra daily allowance (`FREE_SCANS_PER_DAY`, off by default) exists too. A ledger of credits
   and a `premium` entitlement. The server refuses a scan without quota (402); the apps only show the state.
3. **Premium subscription.** RevenueCat: Google Play Billing on Android (required for digital goods), Stripe
   on the web. Prices: 4.99 EUR a month or 39.99 EUR a year (33 % off). The server reads the entitlement from
   RevenueCat's webhook; the apps never decide.
4. **Rewarded ad, +5 scans.** On Android, verified by Google. On the web, a video ad from a VAST tag (Ad Manager or any network) timed by the server, and off until the tag is configured; until then the way past the starting scans on the web is a pack or Premium. AdMob with server-side verification: AdMob calls our API when the ad was really
   watched, and only then are the credits added.
5. **Ads.** A banner on the scan result and at most one interstitial after the result, never before the user
   sees the card. Needs the consent form (GDPR) and an EAS development build (Expo Go cannot run ads or
   purchases).

## Costs and accounts

Google Play developer account (25 USD, once). The store keeps 15 to 30 % of subscriptions. RevenueCat is free
up to a revenue threshold. AdMob and the affiliate programs are free but need approval.

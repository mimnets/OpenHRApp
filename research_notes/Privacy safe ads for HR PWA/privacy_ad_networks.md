# Privacy-respecting, low-traffic-friendly ad networks for a small SaaS/PWA (Bangladesh operator, no PayPal)

Research date: 2026-10-27. Sources: official docs where reachable, plus 2025-2026 review and aggregator sites (marked as such). Several official pages could not be fetched (A-Ads FAQ 404 after redirect to aads.com), so some figures come from secondary sources only.

## Q1: Traffic minimums, approval, revenue/CPM, payouts, Bangladesh eligibility

### Takeaway
At low traffic, only A-Ads (crypto payouts, no traffic minimum) and probably PropellerAds/Bitmedia will accept you. Their revenue is small, and the ads are low-quality or crypto-themed. The developer-focused, privacy-respecting networks (EthicalAds, Carbon) need real traffic: EthicalAds asks for 50k pageviews/month, and Carbon is invite-only. Ezoic (250k) and Setupad (100k+) are out. Media.net's payout options (Payoneer, wire) suit a Bangladeshi operator, but it wants tier-1 traffic.

### Cited Findings
**EthicalAds (Read the Docs)**
- Minimum traffic: "Your site needs at least 50,000 pageviews per month", with exceptions for fast-growing, relevant sites — [EthicalAds Publisher FAQ](https://www.ethicalads.io/publishers/faq/)
- CPM: "around $2.50 per 1,000 pageviews", assuming most traffic comes from the EU and North America. Elsewhere, house ads are shown and rates are lower — [EthicalAds Publisher FAQ](https://www.ethicalads.io/publishers/faq/)
- 70% revenue share, $50 minimum payout, paid monthly. Methods: Stripe Connect (bank transfer), PayPal, OpenCollective, GitHub Sponsors — [EthicalAds Publisher Policy](https://www.ethicalads.io/publisher-policy/)
- Placement rules: the ad must be above the fold on desktop and mobile, beside, above or below the content (not within it), and must keep at least a 0.1% CTR. A fallback ad is allowed when there is no paid ad — [EthicalAds Publisher Policy](https://www.ethicalads.io/publisher-policy/)
- Audience: developers. Targeting is by page content only — [EthicalAds: Google Ads alternative](https://www.ethicalads.io/alternative-to-google-ads/)

**Carbon Ads (run by BuySellAds)**
- Invitation only. Carbon evaluates ad relevance to the audience, monthly pageviews, active maintenance, network capacity and ToS compliance. No numeric minimum is published — [Carbon FAQ](https://www.carbonads.net/faq)
- Typical CPM is $1.50–$2.30. The audience is "English-speaking developers and designers, primarily in the United States, Canada, and Europe" — [Carbon FAQ](https://www.carbonads.net/faq)
- Payouts: PayPal ($20 min), check ($50 min), wire ($500 min plus a $35 fee) — [Carbon FAQ](https://www.carbonads.net/faq)
- Exclusivity: "Our ads only. No ads from other networks on your site." Ads must be above the fold (visible at 1366×768) and load once per page — [Carbon Placement Policy](https://www.carbonads.net/placement-policy)
- About 900 developer/designer sites — [Carbon search summary / docs](https://www.carbonads.net/docs)

**A-Ads / AADS (formerly Anonymous Ads)**
- No minimum traffic requirement; suits low-traffic sites — [Coinbound A-Ads Review 2026](https://coinbound.io/a-ads-review)
- Sites don't need approval, and ad unit creation is quick — [Coinbound review](https://coinbound.io/a-ads-review) (secondary)
- Payouts in BTC, including over Lightning — [aads.com](https://aads.com/). The minimum is cited as 0.001 BTC by [Coinbound](https://coinbound.io/a-ads-review). Older reviews give 0.0001 BTC direct, or 1 satoshi via FaucetHub (FaucetHub has closed) — [coincodecap](https://coincodecap.com/a-ads-review). These conflict; check the current dashboard.
- Pricing models: CPD, CPA and CPM. Advertiser CPM starts at $0.02 — [aads.com](https://aads.com/). Publisher earnings depend heavily on demand — [Coinbound](https://coinbound.io/a-ads-review)

**BuySellAds (marketplace / ad serving)**
- Runs Carbon. Its Ad Serving API (srv.buysellads.com) is documented. No publisher traffic minimum is stated in the API docs — [BuySellAds Ad Serving API](https://www.buysellads.com/docs/ad-serving-api)

**Media.net**
- $100 minimum, paid via Payoneer or wire transfer, NET 30 — [usro.net blog, Nov 2024](https://blog.usro.net/2024/11/media-net-requirements-for-publishers/) (secondary)
- No strict traffic minimum, though some sources say about 1k visitors/day. Wants tier-1 (US/UK/CA) traffic and English content — same source; [BloggersPassion 2025](https://bloggerspassion.com/?p=561677)

**Ezoic**
- In February 2026, Ezoic raised its minimum from 10k to 250k pages/month. Sites already on Ezoic before Feb 19, 2026 keep access — [Newor Media 2026](https://newormedia.com/blog/?p=1430); [Ezoic requirements KB](https://support.ezoic.com/kb/article/getting-started-ezoics-requirements)
- $20 minimum payout; Payoneer is supported (usually 1 business day) — [Ezoic payments KB](https://support.ezoic.com/kb/article/ezoic-payments)

**Setupad**
- Requires 100K+ visitors/month. €100 minimum via PayPal, crypto or wire — [Affiliate Booster 2026](https://www.affiliatebooster.com/best-small-publisher-ad-networks/) (secondary)

**PropellerAds**
- Methods: PayPal, ePayments, WebMoney, Payoneer, Skrill, wire. Minimum is $5 (weekly, Thursdays) for most methods; one source says $20; wire is $550 — [AdPushup review](https://www.adpushup.com/blog/propellerads-review-factsheet-overview-pros-and-cons/); [Payoneer–PropellerAds](https://www.payoneer.com/resources/business/propellerads/)
- Formats include banners, sponsored links and push notifications — [AdPushup](https://www.adpushup.com/blog/propellerads-review-factsheet-overview-pros-and-cons/)

**Coinzilla**
- Minimum withdrawal is €50, weekly/monthly. Approval is strict; it wants good engagement — [99bitcoins](https://99bitcoins.com/bitcoin-ad-networks/) (secondary)

**Bitmedia**
- Minimum withdrawal is 0.001 BTC. Supports price floors. Considered more lenient than Coinzilla — [99bitcoins](https://99bitcoins.com/bitcoin-ad-networks/); [Bitmedia vs Coinzilla (vendor blog)](https://bitmedia.io/blog/bitmedia-vs-coinzilla)

**Google AdSense**
- Bangladesh payment options: cheque or wire to a bank account. $100 threshold. Payments are issued on the 21st–26th — [AdSense payment methods](https://support.google.com/adsense/answer/3372975)

### Inferences
- No-PayPal constraint: Carbon's only low-threshold method is PayPal; otherwise it is a $500 wire, which is impractical. EthicalAds payouts go through Stripe Connect, OpenCollective or GitHub Sponsors. Stripe does not support Bangladesh-based accounts (general knowledge, not verified here), so in practice EthicalAds would mean OpenCollective or GitHub Sponsors. Ask EthicalAds before applying.
- Payoneer-friendly options: Media.net, Ezoic and PropellerAds. Crypto: A-Ads, Bitmedia, Coinzilla (and Setupad).
- A-Ads, Bitmedia and Coinzilla mostly show crypto/gambling-adjacent ads. That clashes with the brand of an HR SaaS used by employers.
- At low traffic, expect very little revenue from any network: for example, 5k pageviews × $2.50 CPM is about $12.50/month even at EthicalAds' tier-1 rate.

### Gaps
- I found no official statement for any network saying it explicitly accepts or excludes Bangladesh-based publishers. AdSense does support Bangladesh payments, and Payoneer and crypto payouts are usable from BD.
- Payout thresholds and current rules for BuySellAds' marketplace (non-Carbon) were not found.
- PropellerAds traffic minimum and Bitmedia's official publisher requirements were not confirmed from primary sources.
- I found no current publisher CPM for A-Ads, Bitmedia or PropellerAds banners from a reliable source.

## Q2: Is a JS tag required, or can ads be fetched server-side and rendered as a plain image+link?

### Takeaway
Two networks officially document server-side or JSON ad fetching. EthicalAds has an authenticated POST `/api/v1/decision/` endpoint, and BuySellAds/Carbon has `srv.buysellads.com/ads/{zonekey}.json`, built for "explicit control over the data exchanged between your users and a 3rd party ad server". Either one lets the app render a first-party image and link with no third-party JS. Both still require impression and view tracking URLs to be hit, and need the viewer's IP and user agent forwarded. A-Ads ad units are plain iframes without JS. That is still third-party code running in a sandboxed frame, but it cannot read the parent page's DOM.

### Cited Findings
- EthicalAds API: POST `/api/v1/decision/` with `publisher` and `placements`; `keywords` is optional; authentication is required. For server-side use, "set your publisher name in the user agent of the request and set the requesting user's user agent in `user_ua`" plus `user_ip`. The response includes `view_url`, `view_time_url` and a one-time `nonce` — [EthicalAds API docs](https://ethical-ad-server.readthedocs.io/en/latest/user-guide/api.html)
- Carbon API: "intended for developers or publishers who prefer direct integration and full control over rendering". Pixels must be supported if present — [Carbon API docs](https://www.carbonads.net/docs)
- Carbon placement policy also says "Use only the ad code from your dashboard. Don't modify or self-host the script." This seems to conflict with the API doc. API use probably needs Carbon's sign-off — [Carbon Placement Policy](https://www.carbonads.net/placement-policy)
- BuySellAds API: GET `/ads/[zonekey].json`. Required `useragent` and `forwardedip` (the client's IPv4, not the server's). Always render the `statimp` pixel. Render attribution `pixel` values as invisible images. Only render when `statlink` is non-empty. `embedassets=yes` returns base64 images — [BuySellAds Ad Serving API](https://www.buysellads.com/docs/ad-serving-api)
- BuySellAds says the API fits "email, an embedded template/user flow, or when you want explicit control over the data exchanged between your users and a 3rd party ad server" — [BuySellAds docs (search summary)](https://docs.buysellads.com/)
- A-Ads: "a banner is just a plain iframe with no javascript in it" — [coincodecap A-Ads review](https://coincodecap.com/a-ads-review) (secondary)
- AdSense, Media.net, Ezoic, Setupad, PropellerAds, Coinzilla and Bitmedia: their standard integrations are JS tags. I found no documented public server-side creative API for publishers. (Ezoic and Setupad work through scripts or DNS/header bidding; see their docs.)

### Inferences
- The cleanest pattern uses a server or edge function, for example a Supabase Edge Function. It calls the EthicalAds or BuySellAds API with the viewer's IP and user agent, returns the image URL, link and tracking URLs, and the app renders them as `<a><img></a>`. With `embedassets=yes` (BuySellAds) you avoid even the image fetch to a third party. The tracking pixels or view URL still go to the network: from the browser they leak the IP and user agent; from the server, they need forwarding. Either way, no third-party code can access the DOM, so selfies, GPS and salary data stay out of reach.
- The impression beacon can be fired server-side for EthicalAds (by hitting `view_url`). For BuySellAds, `statimp` is documented as something to "render", which implies a client-side image load.
- Forwarding employee IPs and user agents to an ad network from a logged-in HR app is personal-data sharing. That needs a privacy-policy disclosure and possibly a DPA, even with no cookies.

### Gaps
- I found no explicit terms from either EthicalAds or Carbon on placing ads inside authenticated or logged-in app pages. Their policies focus on "pages" and content, and both target content to the page, which is meaningless for a private dashboard. Ask them directly.
- I could not confirm whether Carbon's API is open to all approved publishers or needs a special arrangement.
- I found no official A-Ads doc page confirming the iframe-only, no-JS embed today (the official FAQ returned a 404).

## Q3: Cookie and consent implications

### Takeaway
EthicalAds sets no ad cookies, does no user tracking, and truncates or deletes IPs, so it says no cookie banner is needed. AdSense and Ad Manager need a Google-certified IAB TCF CMP for EEA, UK and Swiss traffic. Most other programmatic networks (Media.net, Ezoic, Setupad, PropellerAds) use standard tracking ad tech, which implies consent obligations in the EU. A-Ads says it doesn't collect users' personal data.

### Cited Findings
- EthicalAds "never sets an ad cookie or loads third-party scripts", targets by content only, and says you don't need a cookie banner. It deletes IPs from server logs within 10 days — [EthicalAds cookie-banner blog](https://www.ethicalads.io/blog/2021/02/can-you-eliminate-annoying-cookie-banners-from-your-site/); [EthicalAds Advertising Vision](https://www.ethicalads.io/advertising-vision/)
- EthicalAds geo-targets at country level; "IP addresses are not stored" — [EthicalAds Publisher FAQ](https://www.ethicalads.io/publishers/faq/)
- A-Ads: "We don't collect your users' personal data" — [aads.com](https://aads.com/)
- Google: since 16 Jan 2024, AdSense, Ad Manager and AdMob publishers must use a Google-certified CMP integrated with IAB TCF when serving ads in the EEA and UK; Switzerland followed from 31 Jul 2024 — [Google consent management requirements](https://support.google.com/admanager/answer/13554116?hl=en)
- BuySellAds/Carbon API requires attribution pixels (`pixel`) that may be third-party trackers chosen by the advertiser — [BuySellAds Ad Serving API](https://www.buysellads.com/docs/ad-serving-api)

### Inferences
- Carbon's cookie behaviour isn't covered in the FAQ. Advertiser attribution pixels can bring in third-party tracking, so Carbon is less clean than EthicalAds.
- Under EU ePrivacy and GDPR, even cookie-free server-side fetching sends personal data (IP) to the network. EthicalAds' approach is designed for no consent being needed; others would need a legal basis and disclosure.

### Gaps
- I found no official cookie or consent documentation for Media.net, Ezoic, Setupad, PropellerAds, Coinzilla, Bitmedia or Carbon in this pass.

## Q4: Ads only on public pages (blog/guides), app script-free

### Takeaway
This is the safest architecture, and it fits every network's model, because they all target content pages. Put ads only on the public marketing, blog or guide routes, ideally on a separate origin or subdomain or a static site. Never load ad tags inside the authenticated PWA shell. If the app shares one SPA and origin with the blog, a JS ad tag loaded on a blog route stays in memory after client-side navigation into the app, and can read the app's DOM and storage on that origin.

### Cited Findings
- EthicalAds and Carbon both target page content and developer/designer audiences, which fits public technical guides rather than private dashboards — [EthicalAds FAQ](https://www.ethicalads.io/publishers/faq/); [Carbon FAQ](https://www.carbonads.net/faq)
- Carbon permits refresh "only when using client-side routing" and documents React/Vue SPA integration. This confirms its script persists across SPA routes — [Carbon Placement Policy](https://www.carbonads.net/placement-policy)
- Carbon exclusivity ("No ads from other networks on your site") would block mixing networks on the same site — [Carbon Placement Policy](https://www.carbonads.net/placement-policy)

### Inferences
- Recommended options, in order:
  1. Host the public blog or guides on a separate origin (for example `blog.` subdomain or a static site generator) and run EthicalAds there via its JS client. EthicalAds loads no third-party scripts beyond its own client and sets no cookies.
  2. If the blog lives in the same SPA, use the server-side API pattern (EthicalAds decision API or BuySellAds JSON) on public routes, so no network JS ever enters the app bundle.
  3. A-Ads iframe on public pages only, as a fallback while traffic is under about 50k pageviews/month. The crypto-ad brand risk applies.
- Until traffic reaches about 50k pageviews/month, ads will probably earn less than a sponsorship or affiliate link would. A self-sold "sponsor" slot (a plain image and link) is a zero-third-party alternative.

### Gaps
- I did not verify whether EthicalAds will make an exception below 50k for a small HR or dev-tools site, or whether its advertisers would accept an HR/SaaS audience (it is developer-focused).

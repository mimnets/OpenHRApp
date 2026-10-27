# Direct Sponsorship / House Ads: Sales, Legal Rules, Implementation and Payouts for a Small Free HR PWA (Dhaka operator)

Research date: 2026-10-27. Scope: OpenHRApp, free HR SaaS PWA, operator in Dhaka, mostly South Asian SMB users.

## (a) How small SaaS / indie tools sell sponsor slots, pricing for low-traffic B2B audiences, and Bangladeshi advertisers

### Takeaway
At low traffic the realistic route is direct, flat-fee monthly slots sold yourself (a "Sponsor OpenHR" page plus a checkout link or invoice), not a marketplace: BuySellAds wants about 50k-100k monthly page views and rejects most applicants. Indie sponsor slots are typically priced in the tens to low hundreds of USD per month. Local Bangladeshi advertisers can now pay for digital ads in BDT via bKash, which makes a BDT-priced local slot practical.

### Cited Findings
- BuySellAds recommends at least 100,000 page views a month for publishers, though it may accept sites with a quality track record that have fewer. Other write-ups cite about 50,000 impressions a month. — [ShoutMeLoud review](https://www.shoutmeloud.com/buysellads-review.html); [AdSanity](https://adsanityplugin.com/working-with-buysellads/)
- BuySellAds' vetting is said to reject about 95% of applicant sites. It takes a 25% commission, and publishers set their own rates (CPM or flat). — [ShoutMeLoud](https://www.shoutmeloud.com/buysellads-review.html) (third-party review; the figures are not confirmed on BSA's own site)
- Price examples. Fazier sells a 30-day sponsor slot (site + newsletter) for $49 ($29 with a code) through Gumroad. A Launchpedia full-month site promotion sold for $196. — [Fazier on Gumroad](https://falaksher.gumroad.com/l/fazier-sponsor/TWENTY?ref=fazier); [Indie Hackers post](https://www.indiehackers.com/post/i-got-my-first-full-month-sponsor-and-i-need-your-opinion-fdb484575e)
- Gumroad-sold sponsor slots are a common indie pattern (e.g. a "deck sponsor" product listed on Gumroad). — [Gumroad listing](https://markbowley.gumroad.com/l/deck-sponsor)
- Self-serve sponsor booking tools exist. For example, Sponsonizer has a free tier taking 7% per booking, or Pro at $99/year with 0% fees. Its founder chose not to charge monthly because sponsorship revenue is seasonal. — [Indie Hackers: Sponsonizer](https://www.indiehackers.com/post/after-6-years-of-running-a-newsletter-i-got-tired-of-the-sponsorship-grind-and-built-a-tool-to-fix-it-X043kq1fUSdBjFOIi0jN)
- A heuristic circulating in indie monetization guides: monthly visitors × $0.01-0.05, with multipliers for niche or high engagement. This is unsourced folk guidance, not data. — [agentskills.so indie-monetization-strategist](https://agentskills.so/skills/erichowens-some_claude_skills-indie-monetization-strategist)
- Bangladesh's digital ad market was about Tk 2,000 crore, with roughly half going to Facebook (older Daily Star report, around 2018). — [The Daily Star](https://www.thedailystar.net/frontpage/bangladesh-ad-market-two-global-giants-gobble-most-1537759)
- Since September 2026, small businesses in Bangladesh can pay for Meta ads with bKash. Before that, only foreign-currency cards worked: about 3 million cards in circulation against 82 million bKash users. — [UNB, 10 Sep 2026](https://unb.com.bd/category/Bangladesh/small-businesses-in-bangladesh-can-now-pay-for-meta-ads-with-bkash/195062)

### Inferences
- With an SMB HR audience in the low thousands of monthly active users, a single fixed slot priced somewhere around $20-150/month (or the BDT equivalent) is a plausible starting range. Validate it with the first 1-3 sponsors rather than trusting formulas.
- Local B2B advertisers whose buyers overlap with HR admins are logical targets: accounting/payroll/VAT consultancies, local SaaS (POS, accounting), recruitment portals such as Bdjobs, coworking spaces, bKash/Nagad business or merchant products, and corporate training. These firms already spend mostly on Facebook. A pitch of "exclusive slot seen by HR decision-makers at N companies" beats CPM framing.
- Selling flow: a "Sponsor OpenHR" page with audience stats, slot specs (size, placement, no tracking), a monthly price, and a checkout link (Gumroad / Lemon Squeezy for foreign buyers, or invoice + bKash merchant / bank transfer for local buyers).
- House ads: when the slot is unsold, fill it with a promotion of your own paid ad-free plan, or swap slots with complementary indie tools. This costs nothing and keeps the slot "alive" for prospective sponsors.

### Gaps
- No reliable published ad rates for Bdjobs, or how Bangladeshi B2B firms buy sponsorships on third-party apps. Not found.
- No verified case study of a free HR/B2B PWA selling direct sponsorships at a known traffic level.
- Gumroad / Lemon Squeezy payout availability to Bangladesh sellers was not checked in this pass.
- BuySellAds figures come from third-party reviews (some dated 2019); its current official requirements were not fetched.

## (b) Legal: disclosure, rel="sponsored", cookie consent for self-hosted ads and click counting, Bangladesh data law

### Takeaway
Label every slot "Ad" or "Sponsored". That satisfies FTC and UK ASA expectations, and display banners are generally treated as obviously identifiable anyway. Mark the links rel="sponsored" per Google. A self-hosted image plus a plain link that sets no cookies and reads nothing from the device does not trigger cookie consent. Be careful, though: the EDPB reads "tracking links" broadly, and its IP-address analysis means a click counter should store no IP and no per-user identifier, only an aggregate count per ad. Bangladesh's Personal Data Protection Ordinance 2025 (Ordinance No. 61 of 2025) was gazetted on 6 Nov 2025, and its core compliance duties take effect 18 months after that (about May 2027).

### Cited Findings
- FTC: "If it's clear that what's on your site is a paid advertisement, you don't need to make additional disclosures," but "what's clear to you may not be clear to everyone." "Ad:", "Paid ad", or "#ad" are likely effective. For affiliate links, "Paid link" next to the link should suffice, while "affiliate link" alone is inadequate. Disclosures must be clear and conspicuous and close to the link. — [FTC Endorsement Guides FAQ](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking)
- UK CAP Code rule 2.1: marketing communications must be obviously identifiable. Banner ads are cited as obviously identifiable by nature, and "Ad" is the most straightforward label. "Affiliate" alone was recognised as an ad by no more than 45% of participants and is insufficient. — [ASA: Recognising online affiliate marketing](https://www.asa.org.uk/news/Insight-recognising-online-affiliate-marketing-same-rules-new-guidance.html); [ASA advice: affiliate marketing](https://www.asa.org.uk/advice-online/affiliate-marketing.html)
- Google: "Mark links that are advertisements or paid placements (commonly called paid links) with the sponsored value." Values can be combined (space- or comma-separated). — [Google Search Central: Qualify outbound links](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links)
- EDPB Guidelines 2/2023 on the technical scope of Art. 5(3) ePrivacy (v2 adopted 7 Oct 2024) cover cookies and also tracking pixels, tracking links, fingerprinting and some IP-only tracking. — [EDPB Guidelines 2/2023 v2 PDF](https://edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf); [Hunton summary](https://www.hunton.com/privacy-and-cybersecurity-law-blog/edpb-publishes-guidelines-to-clarify-scope-of-eu-cookie-notice-and-consent-requirements)
  - Para 49: tracking links append "an identifier which is not relevant in terms of resource identification"; affiliate marketing is given as the example.
  - Para 51: "The addition of tracking information to URLs or images (pixels) sent to the user constitutes an instruction to the terminal equipment to send back the targeted information (the specified identifier)", so collecting such identifiers is "gaining access".
  - Para 55: collecting IP addresses triggers Art. 5(3) when the IP originates from the user's terminal (static IPv4 from a router, IPv6). "Unless the entity can ensure that the IP address does not originate from the terminal equipment... it has to take all the steps pursuant to the Article 5(3) ePD."
  - Para 56: applicability "does not systematically mean that consent needs to be collected"; exemptions must be assessed case by case.
- UK: the Data (Use and Access) Act 2025 added new exceptions to the consent requirement for storage/access technologies, in force February 2026. These include a "statistical purposes" exception for analytics about how a service is used (not who uses it), which requires clear information and a "simple and free" way to opt out. — [ICO "Mind your banners" PDF](https://ico.org.uk/media2/mufgyf25/mind-your-banners-the-icos-approach-to-sats.pdf); [Brodies](https://brodies.com/insights/ip-technology-and-data/storage-and-access-technologies-ico-publishes-updated-guidance-on-the-use-of-cookies-and-other-tracking-technologies/); [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/uk-ico-publishes-guidance-on-storage-and-access-technologies)
- Bangladesh PDPO 2025: approved by the Council of Advisers on 9 Oct 2025 and gazetted on 6 Nov 2025 as Ordinance No. 61 of 2025, alongside the National Data Governance Ordinance 2025, which creates the enforcement authority. — [TBS](https://www.tbsnews.net/node/1281356); [Prothom Alo](https://en.prothomalo.com/bangladesh/government/teeopu4dfv); [Digital Policy Alert](https://digitalpolicyalert.org/change/18756-personal-data-protection-ordinance-2025-ordinance-no-61-of-2025)
- PDPO contents: 57 sections. It requires "informed and explicit consent" and notice of purpose and retention before processing. It applies extraterritorially to processing of Bangladeshi citizens' data abroad. Penalties reach up to 7 years' imprisonment and/or fines up to BDT 20 million, with director liability and mandatory breach reporting. Key compliance sections take effect 18 months after gazette. No cookie/online-identifier provision was reported. — [The Daily Star key takeaways](https://www.thedailystar.net/tech-startup/news/bangladeshs-personal-data-protection-ordinance-2025-key-takeaways-4015401); [Dhaka Tribune](https://www.dhakatribune.com/bangladesh/393590/bangladesh-government-approves-personal-data)

### Inferences
- A self-hosted image served from the app's own origin, with no cookies, no localStorage, no script and no per-user identifier, stores and reads nothing beyond normal page loading. Under the ICO and EDPB framing that is outside consent requirements. A cookie banner is not needed for it.
- The risk sits with the click counter. EDPB para 51 targets identifiers appended to URLs. A redirect like `/go/ad-42`, which identifies the ad and not the user, is a resource identifier and arguably not a tracking identifier. Para 55 means logging the IP (even in access logs) could pull it into Art. 5(3) territory. The safe design: increment an aggregate counter keyed only by ad ID and date, store no IP, user ID, tenant ID, user agent or fingerprint, and scrub IPs from redirect-endpoint logs or keep them only for short-lived security purposes.
- Under GDPR, an aggregate counter with no personal data is not personal data processing. Under Bangladesh PDPO, consent duties attach to personal data, so a counter with no personal data should fall outside it. Still mention the ad slot and the anonymous click count in the privacy policy for transparency, and to cover UK-style "information" duties if it is ever classed as analytics.
- Disclosure: put a visible "Ad" or "Sponsored" label on the creative itself. This also covers the case where it is an affiliate link (use "Ad", not "Affiliate").

### Gaps
- No CNIL-specific statement on first-party, no-identifier click redirects was fetched. CNIL's audience-measurement exemption page was not checked in this pass.
- The ICO's exact wording on "no storage/access, so no PECR" was not retrieved (the ICO page URL returned 404). The inference relies on PECR's definition of storage/access plus the EDPB text.
- The full text of the PDPO definitions (whether IP addresses count as personal data, and any exemptions) was not read. Only press summaries were used.
- No Bangladesh-specific advertising disclosure rule (an equivalent of the FTC or ASA) was found.

## (c) Technical pattern and pitfalls

### Takeaway
Self-host the creative, link through a first-party `/go/:adId` 302 redirect that only increments an aggregate counter, mark links `rel="sponsored noopener noreferrer"` with `target="_blank"`, set a strict Referrer-Policy, label the slot "Ad", show it only on non-critical screens (never attendance/camera/check-in flows), and hide it for paid plans. If affiliate programs are involved, check that the redirect does not count as "cloaking" under their terms. Amazon, for one, allows redirects only if it can still tell which site the click came from.

### Cited Findings
- Use `rel="sponsored"` for paid links; values may be combined, e.g. `rel="sponsored noopener noreferrer"`. — [Google Search Central](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links)
- Amazon Associates Operating Agreement: "You will not cloak, hide, spoof, or otherwise obscure the URL of your Site containing Special Links (including by use of Redirecting Links)... such that we cannot reasonably determine the site or application from which a customer clicks through". It also forbids link shorteners or ad placements "that makes it unclear that you are linking to an Amazon Site". A 302 that lands on the visible Amazon URL is generally acceptable. — [Geniuslink: link cloaking & Amazon](https://geniuslink.com/blog/link-cloaking-amazon/) (secondary source quoting the agreement)
- EDPB: identifiers appended to URLs, and IP collection from user terminals, may fall under Art. 5(3) (paras 49-55). — [EDPB Guidelines 2/2023 v2](https://edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf)

### Inferences
- Recommended pattern:
  1. Creative: a static image (WebP/PNG) uploaded to your own storage or CDN, with fixed dimensions to avoid layout shift and meaningful `alt` text that includes the advertiser name. Visible "Ad" / "Sponsored" label on or next to the creative.
  2. Link: `<a href="/go/{adId}" target="_blank" rel="sponsored noopener noreferrer">`. The server does `UPDATE ad_clicks SET n = n + 1 WHERE ad_id = ? AND day = ?` and returns 302 to a fixed, server-side, allowlisted destination URL. Never take the destination from a query param (that creates an open redirect, a Safe Browsing / phishing risk).
  3. Headers on the redirect: `Referrer-Policy: no-referrer` (or `strict-origin` if the sponsor wants to see traffic from openhr). `Cache-Control: no-store` so counts are not swallowed by caches. Never `Set-Cookie`.
  4. Impressions: count server-side at render time as an aggregate, or skip them. Do not use a pixel with per-user IDs.
  5. Placement rules: never on attendance check-in/out, camera/selfie, geolocation, or payroll-confirmation screens. Dashboard/sidebar only. A simple frequency cap (e.g. one slot per screen, and a dismiss that persists in localStorage, wrapped in try/catch).
  6. Plan gating: hide all ads for paid / ad-free tenants on the server side (do not send the ad payload at all), not just with CSS.
  7. Vetting: manually review sponsor landing pages, and recheck them periodically, so a sponsor's later-compromised page does not get your domain flagged.
- Destination must be stable and transparent. Show the advertiser's domain under the creative so the redirect cannot be read as cloaking.

### Gaps
- No primary Google Safe Browsing documentation was fetched about open redirects or redirect chains. The open-redirect concern is general security practice, not a cited policy.
- Other affiliate networks' terms (Impact, CJ, local BD programs) were not checked.

## (d) Receiving money in Bangladesh (Payoneer, Wise, bank remittance, incentives)

### Takeaway
Payoneer works for Bangladesh residents and can withdraw to bKash. Wise does not: Bangladesh residents cannot open a Wise account to receive money. Foreign sponsor payments received through formal banking channels as IT/ITES export earnings qualify for a cash incentive, which for individual freelancers was cut to 2.5% for FY2026-27 (6% for registered software/ITES firms). Local sponsors can simply pay in BDT by bank transfer or bKash merchant.

### Cited Findings
- Payoneer: free registration. Reported fees are 1% to receive from clients, $29.95/year for the card and $3.15 per ATM withdrawal (third-party figures; verify on Payoneer's own pricing page). — [nsave: PayPal alternatives in Bangladesh (2026)](https://www.nsave.com/bangladesh/paypal)
- Since 2022, Bangladeshi bKash users can link Payoneer through the bKash app's "Remittance" option and withdraw instantly to bKash. — [Prothom Alo](https://en.prothomalo.com/corporate/local/freelancers-now-to-receive-payoneer-payments-through-bkash); [Financial Express](https://thefinancialexpress.com.bd/trade/bkash-to-bring-payments-to-freelancers-through-payoneer-in-real-time-1644577807)
- Payoneer reportedly launched a PayPal integration in late 2025 for eligible Bangladeshi freelancers to receive PayPal payments. PayPal itself is not available in Bangladesh. — [nsave](https://www.nsave.com/bangladesh/paypal) (single secondary source; unverified)
- Wise: as of March 2026, Bangladesh residents cannot open a Wise multi-currency account, get a card, or get USD account details. Wise can only send BDT into Bangladesh (to banks, bKash, Nagad). — [nsave: Wise alternatives in Bangladesh](https://www.nsave.com/bangladesh/wise); [Wise currencies help](https://www.wise.com/help/articles/2571907/what-currencies-can-i-send-to-and-from)
- Export incentive history: freelancers previously received 4% on IT/ITES remittance (ICT ministry-listed marketplaces). — [The Daily Star](https://www.thedailystar.net/business/economy/banks/news/freelancers-get-4pc-incentive-software-export-2950991); [Dhaka Tribune](https://www.dhakatribune.com/business/262992/freelancers-finally-getting-4%25-incentive-on)
- FY2026-27 (shipments 1 Jul 2026 - 30 Jun 2027): software/hardware/ITES exports get 6.0%, and individual freelancers exporting software/ITES get 2.5%, per a Bangladesh Bank FEPD circular dated 5 Jul 2026. — [Financial Express](https://thefinancialexpress.com.bd/trade/bb-announces-export-incentives-for-43-sectors-for-fy26-27); [UNB](https://unb.com.bd/category/business/bb-announces-export-incentives-for-43-sectors-for-fy26-27/189911)
- Bangladesh Bank lets IT freelancers retain up to 50% of export earnings in foreign currency (ERQ), usable for foreign software, cloud and online-ad expenses. — [UNB: BB further eases foreign transaction rules for freelancers](https://unb.com.bd/category/Business/bb-further-eases-foreign-transaction-rules-for-freelancers/191283)
- Wise's 2.5% "Cash Incentive for Inward Wage Remittances" applies to Bangladeshi nationals abroad sending wages home. It is not for business or export income. — [nsave](https://www.nsave.com/bangladesh/wise)

### Inferences
- For foreign sponsors, the options are a Payoneer payment request or an invoice paid by SWIFT to a Bangladeshi bank account, coded as ITES/software export to claim the incentive. Gumroad / Lemon Squeezy payouts would also land via Payoneer or bank (unverified).
- Whether ad/sponsorship revenue counts as "software/ITES export" for incentive purposes depends on the bank's purpose coding. Confirm with the receiving bank. It is not guaranteed.
- For local sponsors, invoice in BDT, collected via bank transfer or bKash/Nagad merchant. VAT/TDS obligations on local advertising income should be checked with an accountant.

### Gaps
- Payoneer's official Bangladesh fee page was not fetched. The fees come from a third-party aggregator and may be outdated.
- Whether advertising income qualifies under the ITES incentive category was not confirmed in any circular text.
- Bangladesh VAT treatment of advertising/sponsorship revenue was not researched.
- Gumroad, Lemon Squeezy and Stripe payout support for Bangladesh was not verified (Stripe is generally unavailable in BD; not checked this pass).

# Annual Holiday Data Update Guide

This guide explains how to update the hardcoded holiday dates in `main.pb.js` each year.
Do this once at the start of each new year (e.g., January, before any new orgs register).

---

## What needs updating

File: `Others/pb_hooks/main.pb.js`
Function: `loadHolidaysForCountry()` (around line 1775)

This function contains a static `holidayData` object with one entry per country.
Each holiday has a hardcoded year in its `date` field (e.g., `"2026-04-03"`).
Every year you need to bump those dates forward.

---

## Step 1 — Find the floating (lunar/Islamic) holiday dates for the new year

These holidays shift each year and cannot be mechanically bumped. Look them up first.

| Holiday | Countries affected | Where to check |
|---|---|---|
| Eid al-Fitr (Day 1) | AF, AL, BN, DZ, ET, GH, IQ, JO, LB, MA, MV, PK, SA, QA, KW, BH, OM, BD, MY, SG, ID, TR, EG, NG | [IslamicFinder.org](https://www.islamicfinder.org/islamic-calendar/) |
| Eid al-Adha (Day 1) | (same as above) | same |
| Islamic New Year (Muharram 1) | (same as above) | same |
| Ashura (Muharram 10) | AF, IQ, LB, BH | same |
| Mawlid al-Nabi | (same as Islamic countries) | same |
| Orthodox Easter | GR, RO, RU, AL (Orthodox), LB (Orthodox), ET | [TimeandDate.com/holidays/orthodox](https://www.timeanddate.com/holidays/orthodox/) |
| Western Easter (Good Friday / Easter Monday) | Most Christian countries | [TimeandDate.com](https://www.timeanddate.com/holidays/) |
| Chinese New Year | BN, SG, CN, HK, TW, KR, VN, MY | [TimeandDate.com](https://www.timeanddate.com/holidays/) |
| Vesak / Full Moon of Kason | MM, KH, LK, TH | [TimeandDate.com](https://www.timeanddate.com/holidays/) |
| Khmer New Year | KH | Always April 13–16 (fixed) |
| Thingyan / Myanmar New Year | MM | Always April 13–17 (fixed) |
| Ethiopian Easter / Good Friday | ET | [TimeandDate.com/holidays/ethiopia](https://www.timeanddate.com/holidays/ethiopia/) |
| Clean Monday (Greece) | GR | 48 days before Orthodox Easter |
| Orthodox Whit Monday | GR, RO | 50 days after Orthodox Easter (Sunday) + 1 |

Write down the correct dates before proceeding.

---

## Step 2 — Bulk-replace the year in fixed-date holidays

Open `Others/pb_hooks/main.pb.js` in your editor and do a find-and-replace:

- Find: `"2026-`
- Replace with: `"2027-`  *(or whatever the new year is)*

This handles all fixed national holidays automatically (Independence Days, Labour Day, Christmas, etc.).

> **Do NOT save yet.** First fix the floating holidays in Step 3.

---

## Step 3 — Correct the floating holiday dates

After the bulk replace, manually find and fix each floating holiday.
Search for each holiday name and update its date to the correct one from Step 1.

Key entries to fix (search by `name` field):

```
Eid al-Fitr
Eid al-Adha
Islamic New Year
Ashura
Mawlid al-Nabi
Good Friday
Holy Saturday
Easter Sunday / Easter Monday
Orthodox Good Friday
Orthodox Easter Sunday / Easter Monday
Orthodox Whit Sunday / Whit Monday
Clean Monday
Chinese New Year
Meak Bochea
Visakha Bochea / Full Moon of Kason
Ethiopian Good Friday / Easter
```

Also check these country-specific floating entries:
- **HU**: Whit Monday = 50 days after Western Easter
- **CZ, PL, PT, CL, CO, HR**: Good Friday / Easter Monday = Western Easter dates
- **GR**: Clean Monday = 48 days before Orthodox Easter; Whit Monday = 49 days after Orthodox Easter + 1
- **RO**: Orthodox Good Friday/Easter/Whit Monday = Orthodox Easter dates
- **AL**: Both Catholic Easter (Western) and Orthodox Easter dates
- **LB**: Both Western and Orthodox Good Friday/Easter dates
- **ET**: Ethiopian Good Friday and Fasika (Orthodox Easter — different calendar, check separately)

---

## Step 4 — Verify the edit

Run this quick check in your terminal to confirm the old year is gone:

```bash
grep -c '"2026-' Others/pb_hooks/main.pb.js
```

Expected output: `0` (zero remaining old-year dates inside the holiday function).

If it returns a non-zero number, check which lines still have the old year:

```bash
grep -n '"2026-' Others/pb_hooks/main.pb.js
```

---

## Step 5 — Commit and deploy

```bash
git add Others/pb_hooks/main.pb.js
# Also add a changelog entry in src/data/changelog.ts
git add src/data/changelog.ts
git commit -m "chore(holidays): bump holiday dates to YYYY for all 73 countries"
git push origin <your-branch>
```

Then deploy the updated `main.pb.js` to the PocketBase server's `pb_hooks/` directory.

---

## Notes

- **Existing orgs are not affected** by this update. Their holidays are stored in the `settings` collection and do not change automatically. Only newly registering orgs get the updated dates.
- **Existing orgs can update their own holidays** any time via Organization → Holidays tab.
- The holiday backfill script (runs on PocketBase boot) only seeds orgs that have an **empty** holiday list — it will not overwrite existing data.
- Islamic holiday dates in this file are approximate (±1 day depending on moon sighting). The note at the top of `loadHolidaysForCountry` documents this. Admins can correct them manually in their Holidays tab.

---

## Quick reference — approximate Islamic holidays (add yearly)

| Year | Eid al-Fitr | Eid al-Adha | Islamic New Year | Ashura | Mawlid |
|------|------------|------------|-----------------|--------|--------|
| 2026 | ~Mar 31 | ~Jun 6 | ~Jun 27 | ~Jul 6 | ~Sep 4 |
| 2027 | ~Mar 20 | ~May 27 | ~Jun 16 | ~Jun 25 | ~Aug 25 |
| 2028 | ~Mar 9 | ~May 15 | ~Jun 4 | ~Jun 13 | ~Aug 13 |

*(Dates shift ~11 days earlier each Gregorian year. Verify against IslamicFinder before committing.)*

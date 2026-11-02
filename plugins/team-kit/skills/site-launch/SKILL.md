---
name: site-launch
description: Launch, rebuild or migration checklist for client websites, before, at and after the switch. Use whenever a new site replaces an old one, a domain or URL structure changes, or a site goes live for the first time; triggers include "launch", "go live", "switch the domain", "migrate the site", "/site-launch". May auto-invoke: it only reads and checks.
---

# Site launch

A switch fails quietly: old URLs 404, tracking stops, mail goes to spam, and nobody notices until rankings or leads drop weeks later. One client site hit most of these at once. Mark every item done, not needed (say why), or blocked (name who). Record the result in the project's CLAUDE.md.

Sources: developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes and /site-move-no-url-changes.

## Before the switch

### Access and baseline
- Ownership register in the project CLAUDE.md: registrar (auto-renew on), DNS, Cloudflare, GitHub, Search Console, GA4, GTM, ad accounts and pixels, Google Business Profile, email, form-mail service. The client holds Owner; we are added as users.
- Search Console Domain property verified by DNS TXT on the current site (the TXT stays forever). Export Performance (pages, queries, image search, 16 months), Pages and Links.
- Baseline the old site's Core Web Vitals and weekly enquiries and calls.

### Old URL inventory (real sources, never guesses)
- Old sitemaps, Search Console pages, Ahrefs top pages and pages by backlinks, Wayback Machine CDX, the CMS's own page list. Include media with traffic or links (/wp-content/uploads) and query URLs (?p=, ?page_id=).
- Hack check: spam pages, unknown Search Console owners, spam sitemaps, manual actions, URL Inspection for cloaked spam. Spam stays 404 or 410, never redirected.
- Links we control: QR codes on print and signage, email signatures, booking emails, Google Ads and Meta final URLs, Linktree, social bios, GBP, directories.

### Redirects
- 301 only to a page that genuinely replaces the old one. No relevant page means 404 or 410, never a mass redirect to home (Google treats those as soft 404s).
- One hop. Both trailing-slash forms, with explicit 301s for the slashed forms of real pages (Cloudflare's own slash handling sends a temporary 307).
- Cloudflare `_redirects`: static rules before splats; never a `?` in a source (it becomes a homepage loop); query URLs handled in the Worker or dropped knowingly; under 2,000 static and 100 dynamic rules. On OpenNext, confirm the rules fire, or use next.config redirects.
- Tests in CI: every target exists, every source has its slash twin, no source shadows a page. Keep the file forever.

### The new site
- Every page: title, description, self canonical in the exact URL form the server returns, one H1, html lang, alt text on meaningful images, og tags and a 1200x630 og:image.
- Everything behind tabs, toggles, menus, carousels and count-ups is in the HTML (global rule).
- Structured data: the most specific LocalBusiness subtype, matching the GBP; WebSite on the home page; no self-serving review stars.
- Sitemap generated from routes, with real lastmod or none. robots.txt open. Unknown paths return a real 404 (not_found_handling "404-page") with links back in. Previews noindexed by host or build flag.
- Carry over what the old site had: analytics and GTM container and ad pixels (keep the same IDs), verification tags, structured data, wording on pages that inherit rankings.
- Forms: tested to the inbox the client actually reads (not spam) from Gmail and Outlook; the sending domain has SPF, DKIM and DMARC; spam protection server-side; production secret and recipient set.
- What the old site did beyond pages (booking, member login, payments, newsletter, CRM webhooks, PDFs): each one working, or dropped with the client's written OK.
- Media: WebP, sized, hero eager with fetchpriority=high. Self-hosted video plays on a real iPhone (Workers needs a range handler).
- Australia: privacy policy in the footer and a collection notice by each form; marketing opt-in unticked; regulated health services follow Ahpra (no clinical testimonials); prices, hours and claims signed off by the client; image rights confirmed.
- Deploy: one pipeline only (disconnect Workers Builds or Pages Git); a push to main deploys and is watched to green.

### DNS (only if records or nameservers change)
- Export the full zone first; check MX, SPF, DKIM, DMARC, verification TXT, CAA and subdomains all made it across; keep mail records DNS-only.
- DNSSEC on? Remove the DS record and wait it out before changing nameservers.
- Lower TTLs a day or more ahead, write down the rollback values, and switch early in the week with the client reachable.

## At the switch
- http and www to the apex in one hop.
- Replay every inventoried old URL against live: one 301 to a 200 on the right page, or the intended 404 or 410. Nothing chains.
- Crawl the live site: no internal link goes through a redirect or to a 404.
- Conversions fire on the live domain (GA4 key events, Ads, Meta) for forms, calls and booking clicks.
- Submit the sitemap in Search Console, plus an old-URL sitemap for a few weeks; URL-inspect the home and key pages; confirm Cloudflare security settings don't challenge Googlebot.
- Domain change only: the Change of Address tool, with every old variant verified; keep the old domain registered and redirecting for at least a year.
- Point GBP, ads, Linktree, social bios and QR targets at the new URLs; re-scrape key pages in Facebook's Sharing Debugger.

## After
- Weekly for 4 to 8 weeks: Search Console 404s, coverage, manual actions and security issues; brand search back at #1; enquiries against the baseline.
- Shut the old host down only once its traffic is zero, and only after confirming it doesn't carry email, DNS or other sites. A hacked install gets deleted, with the backup labelled infected.
- Turn off or noindex previews and temporary pages (stray-pages rule).
- Uptime and form monitoring, alerting an inbox someone reads.

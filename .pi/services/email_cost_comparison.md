# M365 vs Google Workspace: Full Comparison for Exult Healthcare PLLC

**Prepared for:** Gautam Bhargava, COO, Exult Healthcare PLLC
**Date:** 2026-04-11
**Tenant:** exulthealthcare.com (707a7153-af93-4b65-ae01-bfa6febbffdb)
**Seat count:** 15 licensed users + ~11 shared mailboxes
**Current plan:** Microsoft 365 Business Standard (SKU: O365_BUSINESS_PREMIUM)
**Reported cost:** $15/user/month = $225/month ($2,700/year)

---

## Table of Contents

1. [Pricing Comparison](#1-pricing-comparison)
2. [Feature-by-Feature Comparison](#2-feature-by-feature-comparison)
3. [AI Features: Gemini vs Copilot](#3-ai-features-gemini-vs-copilot)
4. [HIPAA BAA Comparison](#4-hipaa-baa-comparison)
5. [Shared Mailbox Handling](#5-shared-mailbox-handling)
6. [Identity / SSO Impact](#6-identity--sso-impact)
7. [API & Automation Comparison](#7-api--automation-comparison)
8. [Migration Scope & Costs](#8-migration-scope--costs)
9. [Cost Summary Table](#9-cost-summary-table)
10. [Pros and Cons of Switching](#10-pros-and-cons-of-switching)
11. [Recommendation](#11-recommendation)

---

## 1. Pricing Comparison

### Microsoft 365 Business Tiers (current through June 30, 2026 / post-July 2026)

| Plan | Current Price | Post-July 2026 | Storage | Key Additions |
|------|--------------|----------------|---------|---------------|
| **Business Basic** | $6.00/user/mo | **$7.00**/user/mo (+17%) | 1 TB OneDrive, 50 GB mailbox | Web/mobile Office apps, Exchange, Teams, SharePoint |
| **Business Standard** | $12.50/user/mo | **$14.00**/user/mo (+12%) | 1 TB OneDrive, 50 GB mailbox | + Desktop Office apps (Word, Excel, PPT, Outlook) |
| **Business Premium** | $22.00/user/mo | **$22.00**/user/mo (no change) | 1 TB OneDrive, 50 GB mailbox | + Intune, Entra P1, Defender for Business, Conditional Access |

Post-July 2026, M365 Business Standard will also include baseline Copilot capabilities (email summarization, light Excel analysis) at no extra charge.

**Exult's current deal:** At $15/user/month ($225/month), Exult is paying above current list ($12.50) but below the post-July 2026 price ($14.00). This is likely the monthly (non-annual-commitment) rate or a CSP partner rate. After July 2026, the annual commitment rate rises to $14/user/month, so $15/user/month on monthly billing tracks correctly.

### Google Workspace Tiers (2026)

| Plan | Annual Billing | Monthly Billing | Storage | HIPAA BAA |
|------|---------------|----------------|---------|-----------|
| **Business Starter** | $7.00/user/mo | $8.40/user/mo | 30 GB/user | NO |
| **Business Standard** | $14.00/user/mo | $16.80/user/mo | 2 TB/user | Yes |
| **Business Plus** | $22.00/user/mo | $26.40/user/mo | 5 TB/user | Yes (recommended) |
| **Enterprise** | Custom (contact sales) | N/A | Custom | Yes |

Note: Google raised prices 17-22% in January 2025, bundling Gemini AI into all plans.

### Head-to-Head Pricing (15 users, annual billing, HIPAA-eligible tiers only)

| | M365 Business Standard (post-July 2026) | Google Workspace Business Standard | Google Workspace Business Plus |
|---|---|---|---|
| Per user/month | $14.00 | $14.00 | $22.00 |
| Monthly total | $210.00 | $210.00 | $330.00 |
| Annual total | $2,520 | $2,520 | $3,960 |
| Shared mailboxes (11) | $0 (free) | $0 (Groups) or +$1,848/yr (licensed) | $0 (Groups) or +$2,904/yr (licensed) |

**At the base HIPAA-eligible tier, M365 and Google are price-identical post-July 2026.** Google Business Plus (recommended for HIPAA due to DLP/Vault) costs $120/month more.

---

## 2. Feature-by-Feature Comparison

### Email: Gmail vs Outlook

| Capability | Gmail (Google Workspace) | Outlook (Microsoft 365) | Edge |
|-----------|------------------------|------------------------|------|
| **Search quality** | Best-in-class. Near-instant indexing, powerful operators (from:, has:attachment, date ranges), multi-label means email appears in multiple "views" | Improved but still occasionally misses emails in large mailboxes. Better with desktop client's local cache | **Gmail** |
| **Organization model** | Labels (multi-tag; one email can have many labels) + powerful search replaces need for folders | Folders (single-path; email lives in one folder) + rules for auto-sorting | Gmail more flexible; Outlook more structured |
| **Filtering/Rules** | Filters based on search queries, auto-labeling, auto-forwarding | Rules with conditions/actions, server-side rules run even when offline | Tie |
| **Shared mailbox** | No native equivalent. Google Groups collaborative inbox or delegation (see Section 5) | Native shared mailboxes, free, up to 50 GB, full send-as capability | **Outlook** |
| **Mobile (iOS)** | Gmail app is fast, clean, search-first design. Consistently praised | Outlook mobile has Focused Inbox, but heavier, less intuitive on iOS | **Gmail** |
| **Offline** | Chrome extension for offline access; limited | Full desktop Outlook caches locally; robust offline | **Outlook** |
| **AI features** | Gemini "Help me write," summarize threads, smart compose -- included in plan | Basic features coming post-July 2026; full Copilot is $21/user/mo add-on | **Gmail** (included vs paid) |
| **Spam/phishing** | Industry-leading AI-powered spam detection | Good with Exchange Online Protection; better with Defender (Premium only) | **Gmail** |

**Bottom line:** Gmail is objectively better for search, mobile, and spam filtering. Outlook is better for shared mailboxes and offline desktop use. For a front-desk workflow where shared mailboxes are critical, Outlook's advantage is significant.

### Calendar: Google Calendar vs Outlook Calendar

| Capability | Google Calendar | Outlook Calendar | Edge |
|-----------|----------------|-----------------|------|
| **Speed/UX** | Fast, clean, simple. Best mobile calendar experience | Feature-rich but heavier. Mobile experience less intuitive | **Google** |
| **Scheduling** | Appointment Slots for external booking; integrates with many third-party schedulers | Bookings (included in Business Standard) for appointment scheduling | Tie |
| **Room/resource booking** | Supported | Supported | Tie |
| **Third-party integration** | Wide ecosystem; most scheduling tools support Google Calendar natively | Good but sometimes requires Microsoft-specific connectors | **Google** (wider ecosystem) |
| **Telehealth integration** | Google Meet link auto-added | Teams meeting link auto-added | Tie (both work) |

### Storage: Google Drive vs OneDrive

| Capability | Google Drive | OneDrive | Edge |
|-----------|-------------|---------|------|
| **Storage per user** | 2 TB (Standard) / 5 TB (Plus) | 1 TB (all Business tiers) | **Google** (2x-5x more) |
| **Real-time collaboration** | Google Docs/Sheets/Slides -- native real-time editing, no conflicts | Office Online -- real-time co-authoring improved but occasional conflicts | **Google** |
| **File compatibility** | Google format is native; Office files viewable but must convert for editing | Native Office format; no conversion needed | **Outlook/OneDrive** (no format conversion) |
| **Shared Drives** | Available in Standard+ for team files | SharePoint document libraries + OneDrive shared | Tie |
| **Desktop sync** | Google Drive for Desktop | OneDrive sync client | Tie |

### Docs/Sheets: Google vs Microsoft Office

| Capability | Google Docs/Sheets | Word/Excel (Desktop + Online) | Edge |
|-----------|-------------------|------------------------------|------|
| **Real-time collaboration** | Gold standard. Multiple cursors, instant sync, zero conflicts | Much improved but desktop app still lags behind | **Google** |
| **Offline editing** | Limited (Chrome extension, must pre-enable) | Full desktop apps work offline natively | **Microsoft** |
| **Power features (Excel)** | Sheets is adequate for most tasks but lacks advanced Excel features (Power Query, VBA, complex pivot tables) | Excel is the industry standard for data analysis. AdvancedMD exports, financial models, complex workbooks | **Microsoft** |
| **API quality** | Sheets API: clean, well-documented, 300 req/min, batch operations via batchUpdate. Service account auth is straightforward | Graph Excel API: functional but quirky. Persistent sessions, range size limits, workbook must be in OneDrive/SharePoint | **Google** (Sheets API is cleaner) |
| **Healthcare workbooks** | Would need to convert all .xlsx files to Google Sheets format. Complex formatting/macros may break | Native format. No conversion risk | **Microsoft** (zero migration risk) |

### Video: Google Meet vs Microsoft Teams

| Capability | Google Meet | Microsoft Teams | Edge |
|-----------|-------------|----------------|------|
| **HIPAA compliance** | Covered under BAA (Business Standard+). Encryption in transit | Covered under BAA. Encryption in transit and at rest | Tie |
| **Telehealth suitability** | Usable for low-risk virtual check-ins. Not designed as healthcare-first. No native EHR integration | Not healthcare-first either, but widely used in healthcare settings. Better compliance tooling | Slight **Teams** edge |
| **Quality** | Reliable, low-bandwidth friendly | Generally good; sometimes resource-heavy | Tie |
| **Recording** | Available in Standard+ (stored in Drive) | Available (stored in OneDrive/SharePoint) | Tie |
| **Max participants** | 150 (Standard) / 500 (Plus) | 300 (all Business tiers) | Depends on tier |
| **Psychiatry telehealth** | Works. Must configure HIPAA settings. No session recording for therapy notes unless explicitly enabled | Works. Same configuration needed. Better audit trail tooling | Slight **Teams** edge for compliance |

**Neither platform is a purpose-built telehealth solution.** Both require HIPAA configuration. For psychiatry telehealth with proper compliance, a dedicated telehealth platform (Doxy.me, SimplePractice) may be better than either. Both Meet and Teams are adequate for basic telepsych visits.

### Admin Console: Google Admin vs M365 Admin/Entra

| Capability | Google Admin Console | M365 Admin + Entra ID | Edge |
|-----------|---------------------|----------------------|------|
| **User management** | Clean, simple interface. Easy to use | More complex but more powerful. Entra ID provides enterprise-grade directory | **Google** for simplicity; **Microsoft** for depth |
| **Security & compliance** | DLP available in Business Plus+. Vault for eDiscovery in Plus+ | DLP, Purview compliance in Premium. Defender for Premium | **Microsoft** (more mature compliance stack) |
| **Audit logs** | Investigation tool in Standard+. Granular logs in Plus/Enterprise | Unified audit log in all plans. More detailed with Premium | **Microsoft** |
| **Conditional Access** | Context-Aware Access in Plus+ | Conditional Access in Premium (Entra P1) | Tie (both require higher tier) |
| **MDM/Device management** | Basic in Standard, advanced in Plus+ | Intune in Premium only | Tie (both require higher tier) |

### Mobile App Experience (iOS/Android)

| App | Google | Microsoft | Edge |
|-----|--------|-----------|------|
| Email | Gmail: fast, clean, search-first | Outlook: Focused Inbox, heavier | **Google** |
| Calendar | Google Calendar: lightweight, intuitive | Outlook Calendar: integrated but clunkier | **Google** |
| Storage | Google Drive: solid | OneDrive: solid | Tie |
| Docs/Sheets | Passable for quick edits | Passable for quick edits | Tie |
| Overall mobile polish | Consistently praised as smoother and faster | Functional but heavier | **Google** |

---

## 3. AI Features: Gemini vs Copilot

This is where the platforms diverge significantly in 2026.

### Google Workspace with Gemini

| Feature | Included in Base Plan? | Notes |
|---------|----------------------|-------|
| Gemini side panel (Gmail, Docs, Sheets, Slides, Drive) | **Yes** (all plans) | Summarize, draft, analyze |
| "Help me write" in Gmail | **Yes** | AI email drafting |
| Meeting notes in Meet | **Yes** (Standard+) | Auto-generated summaries |
| Sheets analysis | **Yes** | Natural language queries |
| Advanced features (Gemini 3 Pro reasoning, video generation) | **No** -- requires "AI Expanded Access" add-on (from March 2026) | Pricing not widely published yet |

### Microsoft 365 with Copilot

| Feature | Included in Base Plan? | Notes |
|---------|----------------------|-------|
| Baseline Copilot capabilities | **Coming July 2026** (with price increase) | Email summarization, light Excel analysis |
| Full Copilot (Outlook, Teams, Word, Excel, PowerPoint) | **No** -- $21/user/mo add-on (was $30, promotional at $18 through June 2026) | Draft emails, meeting summaries, document drafting, data analysis |

### AI Cost Comparison (15 users)

| Scenario | Monthly | Annual |
|----------|---------|--------|
| Google Workspace Standard (Gemini included) | $0 extra | $0 extra |
| M365 Standard + Copilot Business ($21/user/mo post-June) | +$315/mo | +$3,780/yr |
| M365 Standard + Copilot Business ($18/user/mo promo) | +$270/mo | +$3,240/yr |

**Google's advantage here is real.** If you want AI-assisted email drafting, document summarization, and spreadsheet analysis across all 15 users, Google includes it in the base $14/user plan. Microsoft charges an additional $18-21/user/month for the same capabilities. For 15 users, that is $3,240-$3,780/year extra on M365.

However: the practical question is whether Exult's 15 users (mostly clinical staff) would actually use AI features day-to-day. If only Gautam and 1-2 admin staff use AI features, buying 3 Copilot seats ($63/month) is cheaper than migrating everyone to Google.

---

## 4. HIPAA BAA Comparison

### Coverage Summary

| Aspect | Microsoft 365 | Google Workspace |
|--------|--------------|-----------------|
| **BAA available?** | Yes, all Business plans | Yes, but **NOT** Business Starter |
| **Minimum tier for BAA** | Business Basic ($6/user/mo) | Business Standard ($14/user/mo annual) |
| **How to sign** | Auto-accepted via Data Protection Addendum (DPA) when you provision services | Manual: Admin console > Account settings > Legal and compliance > accept BAA |
| **Cost for BAA** | $0 extra | $0 extra (but forces minimum Standard tier) |

### Services Covered Under BAA

**Microsoft 365 BAA covers:**
- Exchange Online (email)
- SharePoint Online
- OneDrive for Business
- Microsoft Teams
- Azure/Entra ID services
- Note: "Not every feature or SKU is covered" -- must validate specific workloads

**Google Workspace BAA covers:**
- Gmail (including Gemini "help me write" features)
- Google Calendar
- Google Drive (Docs, Sheets, Slides, Forms)
- Google Meet
- Google Chat
- Google Keep, Sites, Groups, Tasks, Voice, Vids
- Vault, AppSheet, Apps Script
- Cloud Identity Management
- Gemini for Workspace (limited to integrated Workspace access)
- **NOT covered:** Third-party add-ons, "Additional Google Services" outside the core suite

### HIPAA Configuration Requirements (Both Platforms)

Both platforms require active configuration beyond signing the BAA:
- Enable MFA for all users
- Configure DLP policies (requires Business Plus on Google, Business Premium on M365)
- Set up audit logging
- Disable external sharing of PHI
- Train staff on HIPAA policies
- Run risk assessments

### Advanced Compliance Tools

| Tool | M365 Tier Required | Google Tier Required |
|------|-------------------|---------------------|
| Data Loss Prevention (DLP) | Business Premium ($22/user) | Business Plus ($22/user) |
| eDiscovery / Legal Hold | Business Premium + Purview | Business Plus (Google Vault) |
| Advanced Audit | Business Premium | Enterprise |
| Conditional Access | Business Premium (Entra P1) | Business Plus (Context-Aware Access) |

**Key finding:** For full HIPAA compliance with DLP and audit tools, both platforms require their ~$22/user tier. At the base HIPAA-eligible tier ($14/user for both), you get the BAA but not the advanced security tooling.

---

## 5. Shared Mailbox Handling

Exult uses ~11 shared addresses: request@, referrals@, prescriptions.rx@, fax@, billing@, exult-info@, operations@, legal@, admin@, doctorb@, shaye.lemieux@

### Microsoft 365 Shared Mailboxes

- **Cost:** Free (no license required)
- **Storage:** 50 GB per shared mailbox (100 GB with Exchange Online Plan 2 license)
- **Send-as:** Full send-as and send-on-behalf support
- **Access:** Any licensed user can be granted access
- **API access:** Full Graph API access (Mail.Read, Mail.Send scopes)
- **Auto-reply:** Supported
- **Calendar:** Each shared mailbox has its own calendar
- **Currently in use:** All 11 shared mailboxes actively used by Exult's Graph API automations

### Google Workspace Alternatives

**Option A: Google Groups Collaborative Inbox (free)**
| Feature | Status |
|---------|--------|
| Receive email at shared address | Yes |
| Send FROM the shared address | **No** (emails show sender's personal address or "on behalf of") |
| Collision detection | **No** (two people can reply to same thread) |
| Assign conversations | Yes (assign to team members) |
| Status tracking | Yes (Complete, Duplicate, No Action Needed) |
| API access | Groups API (different from Gmail API; less featured) |
| Calendar | No |
| Auto-reply | Limited |

**Option B: Gmail Delegation (free)**
| Feature | Status |
|---------|--------|
| Send FROM shared address | Yes (delegates send as the shared address) |
| Collision detection | **No** |
| Requires licensed user as owner | **Yes** -- the "shared" account must be a paid user |
| Max delegates | 1,000 (recommended max 40 simultaneous) |
| API access | Gmail API (requires the delegated account's credentials) |

**Option C: Licensed Mailbox per Shared Address ($14-22/user/mo each)**
| Feature | Status |
|---------|--------|
| Full mailbox functionality | Yes |
| Send FROM shared address | Yes |
| API access | Full Gmail API |
| Cost for 11 addresses | $154-$242/month ($1,848-$2,904/year) |

### Impact Assessment

| Method | Monthly Extra Cost | Functionality vs M365 |
|--------|-------------------|----------------------|
| Groups Collaborative Inbox | $0 | Degraded (no send-from, no collision detection, different API) |
| Gmail Delegation | $0 (if delegating from existing user) | Partial (can send-from, but no separate inbox view, auth complexity) |
| Licensed Mailboxes | $154-$242/mo | Equivalent, but expensive |

**This is M365's strongest advantage for Exult.** The 11 free shared mailboxes with full functionality and Graph API access are worth $1,848-$2,904/year compared to Google's licensed-mailbox equivalent. Using Google Groups instead is free but functionally inferior, and would require rewriting all API code that reads from shared mailboxes.

---

## 6. Identity / SSO Impact

### Current State (Entra ID)

Exult uses Azure AD (Entra ID) as the identity provider for:
- **RingCentral SAML SSO** -- staff log into RingCentral via Entra
- **User directory** -- single source of truth for 15 clinic staff accounts
- **6+ app registrations** -- Exult Agent Service, BitTitan MigrationWiz, etc.
- **AdvancedMD SAML SSO** -- Entra as IdP for EHR access

### If Switching to Google Workspace

Google Workspace can serve as a SAML IdP for third-party apps. However:

| Integration | Migration Effort | Risk |
|-------------|-----------------|------|
| RingCentral SSO | Reconfigure SAML (ACS URL, Entity ID, certificates). Google supports this natively and RingCentral documents Google Workspace SSO setup. | **Medium** -- SSO downtime during cutover; all staff locked out of RC until reconfigured |
| AdvancedMD SSO | **Unknown.** No documentation found for AMD + Google Workspace SAML. AMD may only support Entra/Okta/specific IdPs. Must verify with AMD support. | **HIGH** -- if AMD doesn't support Google as IdP, this is a blocker |
| App registrations | Must recreate as Google Cloud projects with OAuth2/service accounts | **Medium** -- different auth model, different admin console |
| User provisioning | Admin SDK Directory API replaces Graph User management | **Medium** -- different schema |

**Critical risk:** If AdvancedMD does not support Google Workspace as a SAML IdP, you would need to either (a) keep a separate Entra ID tenant just for AMD SSO (defeating the purpose of switching), or (b) drop SSO for AMD entirely (security regression).

---

## 7. API & Automation Comparison

### Developer Experience

| Aspect | Google Workspace APIs | Microsoft Graph API | Edge |
|--------|----------------------|--------------------|----- |
| **Auth model** | Service accounts + domain-wide delegation. JSON key file. Clean OAuth2 | App registrations + client credentials. Certificate or secret. More steps in Azure portal | **Google** (simpler setup) |
| **Documentation** | Clean, well-organized, code samples in multiple languages | Comprehensive but sprawling. Spread across Learn, Graph Explorer, samples repos | **Google** |
| **Rate limits** | 300 req/min per project (Sheets). Generous quotas | Varies by service. Mail: 10,000/10min. More complex throttling | **Google** (simpler limits) |
| **SDK quality** | Official SDKs for Node, Python, Go, Java. Mature | Official SDKs for Node, Python, Go, Java, C#. Mature | Tie |
| **Breadth** | Gmail, Drive, Calendar, Admin SDK, Sheets, Docs, Meet, Groups, Chat, Classroom | Mail, OneDrive, Calendar, Users, Teams, SharePoint, Excel, Planner, Intune, + 100 more | **Microsoft** (broader surface) |
| **Excel/Sheets API** | Sheets API: batchUpdate for structural changes, values.update for data. Clean mental model | Graph Excel API: persistent sessions, range-based operations, workbook must be in cloud. Quirky | **Google** (Sheets API is superior) |

### Exult's Automation Stack -- Migration Impact

| Current Automation | Depends On | Google Equivalent | Rewrite Effort |
|-------------------|------------|-------------------|---------------|
| 3 MCP servers (mail reads, user management, admin) | Graph API (Mail, User, Directory) | Gmail API, Admin SDK | **40-60 hours** |
| Daily Operations Dashboard | Graph API (mail counts from shared mailboxes) | Gmail API via service account | **16-24 hours** |
| Daily Operations Tracker (Excel workbook) | Graph Excel API (write cells, read ranges) | Sheets API (completely different paradigm) | **16-24 hours** |
| Cohort Analysis workbook | Graph Excel API | Sheets API | **8-16 hours** |
| Auth module (token acquisition, caching) | MSAL client_credentials flow | Google auth library, service account | **4-8 hours** |
| User provisioning scripts | Graph User.ReadWrite.All | Admin SDK Directory API | **8-16 hours** |
| RingCentral SAML SSO | Entra ID as IdP | Google Workspace as IdP | **4-8 hours** |
| AdvancedMD SAML SSO | Entra ID as IdP | Google as IdP (if supported) | **4-8 hours** (or blocker) |

**Total estimated rewrite: 100-164 hours**

### What Improves with Google APIs

To be fair, some things get better:
- **Sheets API is genuinely better** than Graph Excel API. Cleaner batch operations, no persistent session management, better error messages
- **Service account auth is simpler** than Azure app registrations. One JSON key file vs. Azure portal ceremony
- **Gmail API search** mirrors Gmail's powerful search operators, making programmatic mail queries more intuitive
- **Rate limits are more predictable** and generally more generous

### What Gets Worse

- **Shared mailbox API access** is more complex (service account must impersonate each user via domain-wide delegation vs. Graph's straightforward app-permission model)
- **Breadth is narrower** -- no equivalent to Graph's SharePoint, Planner, Intune, Security APIs
- **File format conversion** -- existing .xlsx workbooks must be converted to Google Sheets format. Complex formatting, conditional formatting rules, and named ranges may not convert cleanly

---

## 8. Migration Scope & Costs

### Migration Tasks

| Task | Effort (hours) | Risk | Notes |
|------|---------------|------|-------|
| Email migration (15 user mailboxes) | 8-16 | Low | Google provides GWMME (free tool). Handles mail, calendar, contacts. ~10-12 GB/hr throughput |
| Shared mailbox migration (11 addresses) | 8-16 | Medium | Must decide: Groups vs delegation vs licensed mailboxes. Route setup. Test send-from |
| OneDrive to Google Drive | 4-8 | Low | Automated tools available. Most file formats preserved |
| Excel workbooks to Google Sheets | 8-16 | Medium | Manual conversion needed for complex workbooks. Formulas, conditional formatting may break |
| API rewrite (MCP servers, dashboards, auth) | 60-100 | **HIGH** | Core automation. Regression risk in healthcare environment |
| Sheets API rewrite (Excel API calls) | 16-24 | **HIGH** | Different paradigm. Must rebuild workbook interaction logic |
| SSO reconfiguration (Entra to Google IdP) | 4-8 | Medium | RingCentral documented. AdvancedMD TBD. Downtime risk |
| DNS / MX record cutover | 1-2 | Low | Point MX to Google. Update SPF, DKIM, DMARC records |
| User training (Outlook to Gmail) | 4-8 | Low | 15 staff, mostly clinical. Low complexity |
| Testing and validation | 8-16 | Medium | Verify all automations, HIPAA compliance, SSO |
| **Total** | **~120-215 hours** | | |

### Migration Cost Estimates

| Method | Hours | Cost | Calendar Time |
|--------|-------|------|--------------|
| External contractor ($150/hr) | 120-215 | **$18,000-$32,000** | 4-8 weeks |
| Gautam + Claude Code (no contractor) | 120-215 | $0 cash but significant opportunity cost | 3-5 weeks of focused work |

### Migration Risk Factors

1. **AdvancedMD SSO compatibility** -- unverified. If AMD doesn't support Google as IdP, migration is blocked or requires maintaining a parallel Entra tenant
2. **API regression in healthcare** -- any bug in migrated automation code could affect patient scheduling, billing, or communication workflows
3. **Staff disruption** -- clinical staff switching from Outlook to Gmail mid-operations
4. **MX record propagation** -- during DNS cutover (24-48 hrs), some emails may be delayed or misrouted

---

## 9. Cost Summary Table

### Annual Cost Comparison (15 users, HIPAA-compliant configurations)

| Line Item | M365 Business Standard (post-July 2026) | Google Workspace Business Standard | Google Workspace Business Plus |
|-----------|----------------------------------------|------------------------------------|-------------------------------|
| Base license (15 users, annual billing) | $2,520 | $2,520 | $3,960 |
| Shared mailboxes (11) | $0 | $0 (Groups, degraded) | $0 (Groups, degraded) |
| Shared mailboxes -- full equivalent | $0 | +$1,848 (licensed) | +$2,904 (licensed) |
| HIPAA BAA | Included | Included | Included |
| DLP / Advanced Compliance | Requires Premium (+$22/user = $3,960) | Requires Plus ($3,960 total) | Included |
| AI (Gemini/Copilot) | Copilot: +$3,780/yr (15 users x $21/mo) | Included (Gemini) | Included (Gemini) |
| One-time migration | $0 | $18,000-$32,000 | $18,000-$32,000 |
| **Year 1 Total (base + migration)** | **$2,520** | **$20,520-$34,520** | **$21,960-$35,960** |
| **Year 2+ Annual (base only)** | **$2,520** | **$2,520** | **$3,960** |
| **Year 2+ Annual (base + full shared mailbox equiv)** | **$2,520** | **$4,368** | **$6,864** |

### With AI Add-ons

| | M365 Standard + Copilot | Google Standard (Gemini included) | Delta |
|---|---|---|---|
| Annual (15 users) | $2,520 + $3,780 = **$6,300** | **$2,520** | Google saves **$3,780/yr** |

### Break-Even Analysis

- **Base plans only (no AI):** Identical cost ($2,520/yr). Migration cost ($18,000-$32,000) never pays back since there are no savings.
- **With full AI for all 15 users:** Google saves $3,780/year. Migration cost pays back in **4.8-8.5 years**. Not compelling.
- **Realistic AI usage (3 users):** 3 Copilot seats = $756/year. Google still saves $756/year, but migration cost takes **24-42 years** to pay back.

---

## 10. Pros and Cons of Switching

### What Exult Would GAIN by Switching to Google

1. **AI included in base plan.** Gemini features (email drafting, document summarization, spreadsheet analysis) for all 15 users at no extra cost. On M365, full Copilot for 15 users costs $3,780/year extra.

2. **Better search and mobile experience.** Gmail search is measurably better than Outlook search. Gmail and Google Calendar mobile apps are faster and cleaner on iOS. For a mobile-heavy front-desk workflow, this matters.

3. **More storage per user.** Google Standard gives 2 TB/user (30 TB total) vs M365's 1 TB/user (15 TB total). Google Plus gives 5 TB/user. This is a 2-5x storage advantage.

4. **Cleaner API developer experience.** Google service accounts are simpler to set up than Azure app registrations. Sheets API is better than Graph Excel API. Google API documentation is more accessible. Rate limits are more predictable.

5. **Superior real-time collaboration.** Google Docs/Sheets/Slides collaboration is still the gold standard. Multiple editors, zero conflicts, instant sync. Useful if multiple staff ever co-edit documents.

6. **Better spam/phishing protection.** Gmail's AI-powered spam filtering is industry-leading. Less junk reaching staff inboxes.

### What Exult Would LOSE by Switching to Google

1. **Free shared mailboxes.** This is the single biggest loss. M365's 11 free shared mailboxes with full send-as, API access, and 50 GB storage have no free equivalent in Google. Groups collaborative inbox cannot send from the shared address and lacks collision detection. Licensing all 11 shared addresses on Google costs $1,848-$2,904/year.

2. **Desktop Office apps.** M365 Business Standard includes full desktop Word, Excel, PowerPoint, Outlook. Google has web-only editors (Docs, Sheets, Slides). For Excel power users working with AMD exports, complex financial models, or VBA macros -- Google Sheets is not a full replacement.

3. **SSO continuity.** Entra ID is the IdP for RingCentral and AdvancedMD. Switching to Google as IdP requires reconfiguring all SSO integrations, with potential downtime and an unverified AMD compatibility risk.

4. **100-215 hours of migration work.** API rewrites alone are 60-100 hours. All 3 MCP servers, both dashboard refreshers, both Excel workbook automations, and the auth module must be rewritten. This carries regression risk in a healthcare environment.

5. **Mature compliance stack.** Microsoft's compliance tools (Purview, Defender, Conditional Access) are more mature than Google's equivalents. For healthcare, M365's audit logging and DLP capabilities have a longer track record.

6. **Offline capability.** Desktop Outlook and Office apps work fully offline. Google's offline support is limited to Chrome browser extension with pre-enabled docs.

### What Stays the Same

- **Base cost:** M365 Standard and Google Standard are price-identical at $14/user/month (post-July 2026 annual billing)
- **HIPAA BAA:** Both offer it (Google requires Standard minimum)
- **Custom domain email:** Both support exulthealthcare.com
- **Video calls for telehealth:** Both Meet and Teams are BAA-covered and adequate for telepsych
- **Basic admin/directory:** Both provide user management, security settings, audit logs
- **Calendar:** Both work well for scheduling

---

## 11. Recommendation

### The honest assessment:

**Switching to Google Workspace does not save money at the base tier.** Post-July 2026, both platforms cost $14/user/month for the HIPAA-eligible tier. The migration itself costs $18,000-$32,000 in effort.

**Google has real advantages in:** search quality, mobile UX, AI inclusion (Gemini), storage limits, API developer experience, and real-time collaboration.

**Microsoft has real advantages in:** shared mailboxes (critical for Exult's 11 shared addresses), desktop Office apps, offline capability, SSO ecosystem (Entra is already configured), compliance maturity, and zero migration cost.

### For Exult specifically, three factors dominate:

1. **Shared mailboxes:** 11 free shared mailboxes with full API access is a hard advantage. Google has no free equivalent with the same functionality. This alone tips the balance.

2. **API rewrite cost:** 60-100+ hours of rewriting working automation code in a healthcare environment is not just a cost -- it is a risk. One bug in the migrated mail-reading code could miss a referral or prescription notification.

3. **SSO uncertainty with AdvancedMD:** If AMD does not support Google as a SAML IdP, the entire migration is blocked or requires maintaining Entra ID alongside Google Workspace (defeating the purpose).

### What I would actually recommend:

**Stay on M365, but take these actions:**

1. **Verify your invoice.** Confirm the $15/user/month rate in M365 Admin > Billing. If it is annual billing at $12.50/user, lock it in before the July 2026 increase to $14.

2. **Right-size licenses.** If there are unused licenses, remove them. Every unused seat at $15/month is waste.

3. **Evaluate Copilot selectively.** Buy 2-3 Copilot Business seats ($18/user/mo promotional, $21 after June) for power users (Gautam + 1-2 admin staff) instead of all 15. Cost: $36-63/month vs Google's approach of Gemini for everyone.

4. **Consider M365 Business Basic for clinical-only users.** If clinical staff only need email + calendar (no desktop Office apps), downgrade their 10-12 seats to Business Basic ($7/user/mo post-July). Keep 3-5 seats on Standard for admin users who need desktop Excel. Blended cost: ~$130-140/month vs. $210 for all-Standard. Saves ~$840-960/year.

5. **If Google's advantages matter to you personally** (better search, mobile, AI), consider using a personal Google Workspace account alongside M365 for experimentation, rather than migrating the entire organization.

---

## Sources

- [Google Workspace Pricing (2026) -- Name.com Blog](https://www.name.com/blog/google-workspace-pricing)
- [Google Workspace Official Pricing Page](https://workspace.google.com/pricing)
- [Google Workspace HIPAA Compliance -- Google Support](https://knowledge.workspace.google.com/admin/compliance/hipaa-compliance-with-google-workspace-and-cloud-identity)
- [Is Google Workspace HIPAA Compliant? -- HIPAA Journal](https://www.hipaajournal.com/is-google-workspace-hipaa-compliant/)
- [Is Google Workspace HIPAA Compliant? -- Paubox](https://www.paubox.com/blog/is-google-workspace-hipaa-compliant)
- [Google Workspace Shared Inbox Guide -- EmailMeter](https://www.emailmeter.com/blog/google-workspace-collaborative-inbox-vs-shared-mailbox-key-differences-and-use-cases)
- [Google Workspace Collaborative Inbox -- EmailMeter](https://www.emailmeter.com/blog/google-workspace-group-collaborative-inbox-a-complete-guide)
- [Create a Shared Mailbox in Google Workspace -- LeadsMonky](https://leadsmonky.com/shared-mailbox-google-workspace-guide/)
- [Google Workspace Migration for Microsoft Exchange (GWMME)](https://support.google.com/a/answer/6305431?hl=en)
- [Migrate from M365 to Google Workspace -- Onecal](https://www.onecal.io/blog/how-to-migrate-from-microsoft-365-to-google-workspace)
- [Microsoft 365 Price Increases July 2026 -- SWK Technologies](https://www.swktech.com/microsoft-365-price-increases-will-take-effect-july-2026/)
- [Microsoft 365 Pricing Changes 2026 -- CloudCapsule](https://blog.cloudcapsule.io/blog/microsoft-365-pricing-changes-in-2026-what-you-really-need-to-know)
- [Microsoft 365 License Comparison 2026 -- Medha Cloud](https://medhacloud.com/blog/microsoft-365-license-comparison-2026)
- [Microsoft 365 Business Standard Features -- Medha Cloud](https://medhacloud.com/tools/m365-license-comparison/plans/microsoft-365-business-standard)
- [Microsoft 365 HIPAA/HITECH Compliance -- Microsoft Learn](https://learn.microsoft.com/en-us/compliance/regulatory/offering-hipaa-hitech)
- [Microsoft HIPAA BAA Covered Services -- AccountableHQ](https://www.accountablehq.com/post/microsoft-hipaa-baa-covered-services-requirements-and-how-to-sign)
- [M365 Shared Mailbox Limits -- Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-365/admin/email/about-shared-mailboxes)
- [Is Google Meet HIPAA Compliant? -- HIPAA Journal](https://www.hipaajournal.com/is-google-meet-hipaa-compliant/)
- [Is Microsoft Teams HIPAA Compliant? -- HIPAA Journal](https://www.hipaajournal.com/microsoft-teams-hipaa-compliant/)
- [Google Workspace vs Microsoft 365 HIPAA -- Virtru](https://www.virtru.com/blog/compliance/hipaa/office-365-google-workspace)
- [Google Workspace DLP Guide -- Strac](https://www.strac.io/blog/google-workspace-dlp)
- [Google Workspace Business Plus vs Standard -- GistJunction](https://gistjunction.com/google-workspace-standard-vs-plus/)
- [Outlook vs Gmail 2026 -- G2](https://learn.g2.com/outlook-vs-gmail)
- [Gmail vs Outlook 2026 -- InboxZero](https://www.getinboxzero.com/blog/post/gmail-vs-outlook)
- [Gemini vs Copilot Pricing -- CompareTheCloud](https://www.comparethecloud.net/articles/google-gemini-workspace-vs-microsoft-365-copilot-uk-small-team-pricing)
- [Microsoft 365 Copilot Business Pricing 2026 -- Bond Consulting](https://bondconsultingservices.com/blog/microsoft-365-copilot-business-pricing-smb-2026/)
- [Microsoft Copilot Pricing & Licensing -- IntuitionLabs](https://intuitionlabs.ai/articles/microsoft-copilot-pricing-licensing)
- [RingCentral SSO for Google Workspace -- RingCentral Support](https://support.ringcentral.com/article-v2/9461.html)
- [Google Workspace API Developer Portal](https://developers.google.com/workspace)
- [Microsoft Graph Excel API Best Practices -- Microsoft Learn](https://learn.microsoft.com/en-us/graph/workbook-best-practice)
- [Google Sheets API vs Alternatives -- DataCamp](https://www.datacamp.com/tutorial/google-sheets-api)

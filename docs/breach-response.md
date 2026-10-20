# Runbook — Personal data breach response

**Status: DRAFT. This procedure has not been reviewed by counsel, and the
separation of duties it requires is not yet staffed. Do not treat it as a
legal document, and do not launch on the strength of it.** It is written to the same DRAFT standard as
the published Terms (`src/app/(trust)/terms/page.tsx`), the published Privacy
Policy (`src/app/(trust)/privacy/page.tsx`) and the public marketing terms
(https://www.sophionos.com/terms); the
blockers are tracked in `docs/dpdp-launch-readiness.md`. The compensating
controls in this runbook exist because one person holds every role: they
reduce the risk that the missing separation creates, and they do not close
it.

Owner: Taha (founder). Drafted: 2026-09-27. Roles revised: 2026-10-20 —
defined and named; all six held by the operator, with the separation below
still open. Compensating controls added: 2026-10-20 — for the one-person
operation; see "Compensating controls". First rehearsal before launch: see
"Rehearsal" at the end.

## What counts as a personal data breach

A breach is a personal data breach when there is a breach of security leading
to accidental or unlawful destruction, loss, alteration, unauthorised
disclosure of, or access to personal data held by SophionOS. It is a fact
about what happened to the data, not about whether anyone was at fault: an
accidental leak is a breach, and so is an attack that failed to reach any
data.

In practice for this app, that is anything touching `audit_events`, user
entity content, API key material and metadata, Clerk account records, or the
service-role key. A write that lands on another user's rows is a breach: the
API-key path runs with the service role and filters by `user_id` in
application code, so that filter is the only thing standing between one
tenant and another's data (`docs/security-model.md`). A request log line that
carries a raw API key or a note body is a breach of the same kind, and one we
have designed out — see "Evidence preservation".

There is no consent ledger in this repository, so a leak of one is not a
scenario here; the ledger and its append-only guarantee are cloud-side. See
"Evidence preservation" for what this tree does hold.

Payment data is the one category this procedure does not cover end to end.
Dodo Payments holds it, as our merchant of record and the seller of record for
the purchase, and Dodo is the one that notifies you and the authorities about
a breach of that data (`src/app/(trust)/subprocessors/page.tsx`). If Dodo tells
us about one, that is a trigger for this procedure: tell the incident lead the
moment you hear it, so the 24-hour assessment window is not spent working out
whether the data was ours. We remain the Data Fiduciary for everything this
procedure does cover, which is the data SophionOS holds. A self-hosted
deployment has no Dodo: the operator's own payment processor plays that part,
and the operator is the Data Fiduciary for that data.

## Roles

Each role below is defined by what it owns and by what it does in the first
hours of an incident. **All six roles are held by Taha Aalam, sole proprietor
trading as SophionOS** — this is a one-person operation, and the roles are
listed so that the work is written down, not because there are six people.
This procedure does not start until the person holding each role has said
they will do it.

One line of the table below is not a role Taha holds. The independent
reviewer is a second person, named by Taha, who is not an employee and does
not need to be — a peer, an advisor, or a contractor will do. It is the one
control in this runbook that a human has to supply, and until it is named,
the notifiability decision has no second pair of eyes on it at all.

**The separation requirement at the end of this section is not met by that
arrangement, and remains open.** It is the one thing about the staffing of
this procedure that a name cannot fix.

| Role | Who | What they own, and what they do in the first hours |
|------|-----|-------------------------------------------------------|
| Incident lead | Taha Aalam | **Owns:** declaring the incident and the decision log. The notification decision is never delegated away from them. **First hours (0–2h):** open the incident record — UTC start time, what is known, what is suspected, who is on the clock — and start the "without delay" clock at the moment of awareness, not at the moment of understanding. |
| Technical containment | Taha Aalam | **Owns:** stopping the mechanism. **First hours (0–1h):** the pre-containment capture runs first and is a gate — no rotation, rollback, or access revocation before it completes — then rotate `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and any key in scope, suspend the affected integration or webhook, roll back a bad deploy, disable a runaway job. **0–4h:** scope the blast radius with the evidence custodian. **Never deletes anything** — see Evidence preservation. |
| Privacy assessment | Taha Aalam (founder/operator) | **Owns:** the notifiability decision and the reasoning behind it. **First hours (0–24h):** apply the test below and write the decision down, including when the answer is "do not notify". This is the role that must not be held by the only person who decided to contain. |
| Data Protection Board liaison | Taha Aalam | **Owns:** the contact route to the Board and the filing of the intimation, and — where the GDPR or US path applies — the filing with the supervisory authority or the state attorney general. **First hours (within 24h of declaration):** file on what is known — nature of the breach, categories and approximate number of Data Principals, likely consequences, measures taken — and give a time by which the rest follows. The intimation is not held back while the investigation continues. **On the GDPR and US paths:** file with every authority inside the 72-hour target the published Privacy Policy names (section 11 of `src/app/(trust)/privacy/page.tsx`). |
| Data Principal communications | Taha Aalam | **Owns:** the notice to affected people, written per person. **First hours (24–72h):** plain language about what happened to *their* data, what they should do, and how to reach a human — not a generic blast. **On the GDPR and US paths:** the same content, on that path's clock. |
| Evidence custodian | Taha Aalam | **Owns:** the read-only record of what happened. **First hours (0–4h):** run the pre-containment capture with technical containment, before anything is rotated or revoked — the audit trail (`audit_events`), request logs, database snapshots before and after containment. **24–72h:** complete preservation, confirm the audit trail is intact, hand off to the write-up. |
| Grievance officer | Taha Aalam — see `src/app/(trust)/privacy/page.tsx` (section 9) | Receives the responses that come back. The officer is designated: a named individual, the monitored mailbox **privacy@sophionos.com**, and a published postal address (`src/app/(trust)/privacy/page.tsx`, section 9). The `GRIEVANCE_OFFICER` constant and its `isPlaceholder` flag are cloud-side (`src/lib/legal/grievance.ts`). |
| Independent reviewer (reachable within 24h) | **[NEEDS NAME — Taha to fill]** | Sanity-check the notifiability assessment before it is filed: does the reasoning hold, is the threshold applied the same way it would be applied to someone else, is the record complete enough to file on. Does not need to be an employee. Reachable within 24 hours is the entire requirement — this is not a standing role and carries no other duty in this procedure. |

The same person may hold several roles in a small incident. The one
separation that is not negotiable: the person who makes the notifiability
call (privacy assessment) must not be the only person who decided to
contain.

**STILL OPEN — this separation is not met today.** Every role in the table
above is held by Taha Aalam, so the person who decides whether a breach is
notifiable is also the person who contained it, which is exactly what the
rule forbids. Naming the roles does not fix that; a second person has to.
Until one is reachable inside the 24-hour assessment window, the honest
position is that this procedure does not satisfy its own control, and that
has to be recorded rather than written around.

**What stands in for it is a set of compensating controls, not a satisfied
control.** The next section sets out what stands in for the missing second
person: a counsel review of the assessment before filing, a mandatory
pre-containment capture, a cooling-off period before the intimation is
filed, and a slot for an independent reviewer. Each one reduces the risk this
control exists to manage. None of them is the control, and nothing in this
runbook closes it.

## Compensating controls for a one-person operation

One person holds every role, so the separation of duties cannot be satisfied
by staffing. These four controls stand in for it. They are compensating
controls: each is weaker than a second pair of hands, and the honest reading
of this section is "less risk", not "risk covered".

### 1. Counsel reviews the assessment before the intimation is filed

The written notifiability assessment — the decision and its reasoning, not a
summary of it — goes to counsel before the DPB intimation is filed. Send it
with `docs/breach-response-counsel-questions.md`, which is where the open
questions for counsel already live, so the reviewer has this procedure's
assumptions in front of them and not just a conclusion.

Nothing here assumes counsel is on retainer, has agreed to a turnaround, or
will be reachable. Sending the assessment is a request, not a scheduled
commitment, and the fallback is what makes this control safe to run without
that assumption:

> **Fallback.** If counsel is unreachable after 12 hours, file on the
> documented assessment and record the absence of review in the decision log
> — who was asked, when, through which channel, and that no response came.

The 12 hours are a ceiling, not a target. A review that arrives at hour 11 is
used; a review that never arrives is recorded as a gap in the log, not
papered over.

### 2. The capture is a gate, not a step

The pre-containment capture is a gate: **no containment action runs before it
completes.** No key rotation, no rollback, no access revocation, no
credential change — not until the capture is done. The capture is read-only
and does not touch the live system, so the gate costs minutes, not hours.

The order of operations is the control, not a reminder: capture first,
contain second. A rotation that happens before the capture can change what a
credential-based actor is attributed to, and that attribution is what the
notifiability decision is made on.

The one exception is data being destroyed as you respond — an attacker
deleting rows, a runaway job truncating a table. There, containment wins and
the capture becomes best-effort: capture what you can while containing, and
record the gap in the decision log, with the reason.

### 3. Cooling-off: two hours between drafting and filing

The written notifiability decision sits for a minimum of two hours between
the moment it is drafted and the moment it is filed. The filer re-reads it
before submitting it.

This is temporal separation standing in for personal separation. The point of
a second pair of eyes is to catch a decision made too fast, in the middle of
an incident, by the same person who just finished containing the thing. Two
hours and a re-read do not give a second opinion, but they do stop the
decision from being the first thing that happens after the containment,
which is how the error in it gets made.

It also costs two hours against a "without delay" standard. That is a real
price, and it is why this is a floor with a hard end rather than a wait for
comments, and why the assessment is drafted early in the window rather than
at the end of it.

Two hours is a floor, not a deadline. If the assessment is drafted at hour 22
of the 24-hour window, the cooling-off still runs and the filing happens at
hour 24 or after — file as soon as the gate is satisfied, and record the
actual times.

### 4. An independent reviewer — the one thing a human has to supply

The slot is in the Roles table above: **Independent reviewer (reachable
within 24h) — [NEEDS NAME — Taha to fill]**. The duty is to sanity-check
the notifiability assessment before it is filed. It does not need to be an
employee.

Until that slot is filled, controls 1 to 3 are the whole of the mitigation,
and the assessment has been read by exactly one person: the one who wrote
it. This is the one control in this procedure that cannot be written down
instead of staffed, and it is the one that needs Taha to name somebody.

### What this section is, and is not

This is a single-operator runbook with compensating controls. It is not
separation of duties, and no document should describe it as separation of
duties. The controls above reduce the chance that a notifiability decision
is made badly and in a hurry, by one person, in the middle of the incident
they just contained.

Full separation of duties requires a second operator. It arrives with the
team, not with a better runbook: when there is a second person who can hold
the privacy-assessment role, the independent-reviewer slot becomes that
person, control 1 becomes an internal review, and this section retires.

## The first 72 hours

The commitment this procedure executes is the general one: **in the event of a
personal data breach, we will notify affected users and relevant authorities
without undue delay, in accordance with applicable law.** The rest of this
section is how that commitment is met, path by path.

DPDP requires intimation to the Data Protection Board and to each affected
Data Principal **without delay**. That is the whole of the timing rule, and
it is the one this table exists to protect: **notification is not gated on
finishing the investigation.** You notify on what you know at the time, and
you tell the Board what changed afterwards.

There is no 72-hour safe harbour here. The 72 hours below is how long the
*procedure* takes to play out, not a window inside which nothing is owed.
Deliberately finishing the assessment first is a common and expensive way to
miss "without delay", and the recovery cost of a late notification is higher
than the cost of an early, incomplete one.

That is the DPDP rule, and it is the strictest of the three paths. The EU/UK
and US paths carry deadlines of their own — 72 hours of awareness — and those
are the ones the published Privacy Policy names (section 11 of
`src/app/(trust)/privacy/page.tsx`). A deadline is a ceiling, not a
licence to wait until it: file on what you know, and say what is not yet
known.

**Only the path Step 0 selects runs.** The India, EU/UK and US rows below are
alternatives, not a sequence, and one breach can run more than one of them.

| Window | What happens | Who |
|--------|--------------|-----|
| **0–1 hour — identify whose law applies (Step 0)** | Query the database for the countries of residence of the affected users, and for US users the state. Branch on the answer: India → the DPDP path; EU/UK → the GDPR path; US → the state path. See "Whose law applies, and who to notify". | Technical containment + incident lead |
| **0–1 hour — contain** | **The capture is the gate: it completes before any rotation, rollback, or revocation runs** (Evidence preservation). Then stop the mechanism, not just the instance. Rotate anything that was exposed: `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and any API key in scope. Suspend the affected integration or webhook. If the vector is a deploy, roll back (`docs/runbooks/deploy-rollback.md` — cloud-side; in a self-hosted deployment, roll back through your own host's deployment mechanism, see `docs/deployment.md`). If the vector is a bad migration or a runaway job, disable the job. **Do not delete anything** — see Evidence preservation. | Technical containment |
| **0–2 hours — declare** | Open the incident record: UTC start time, what is known, what is suspected, who is on the clock. The clock that matters for "without delay" starts at the moment you became aware, not at the moment you understood it. | Incident lead |
| **0–4 hours — scope** | Which tables, which subjects, which time window. The `audit_events` table and the request logs answer most of this. Get a count of affected Data Principals — the notification obligation is per person, so the count is not optional. | Technical containment + evidence custodian |
| **0–24 hours — assess** | Apply the notifiability test below. Record the decision **and the reasoning**, including when the answer is "do not notify". Draft it early enough that the counsel review and the two-hour cooling-off both complete inside this window, then send it to counsel (control 1) and let it sit (control 3). | Privacy assessment |
| **Within 24 hours — notify the DPB** | File the intimation with the Data Protection Board on what is known: nature of the breach, categories and approximate number of Data Principals, likely consequences, measures taken. If some of it is not yet known, say so and give a time by which the rest follows. **The filing runs on the documented assessment, not on a review that has not happened:** if counsel is unreachable after 12 hours, file anyway and record the absence of review in the decision log. The filer re-reads the assessment before submitting it. | DPB liaison |
| **24–72 hours — notify affected Data Principals** | Plain language, per person, describing what happened to *their* data — not a generic blast. Include what they should do (in this app: if their data was exposed, export it, or if their account may be affected, change nothing and contact us). | Data Principal communications |
| **24–72 hours — preserve and hand off** | Complete evidence preservation, confirm the audit trail is intact, and start the post-incident write-up. | Evidence custodian |
| **Within 72 hours of becoming aware — notify the supervisory authority (EU/UK path)** | Identify the supervisory authority for each affected member state and file an Article 33 notification through that authority's own portal. Contents: the nature of the breach, the categories and approximate numbers of affected data subjects and records, the DPO's name and contact, the likely consequences, and the measures taken or proposed. See "The GDPR path". | DPB liaison |
| **Without undue delay, where high risk — notify affected users (EU/UK path)** | Where the breach is likely to result in high risk to the rights and freedoms of the people affected, notify them — plain language, per person, on the same terms as the India path. | Data Principal communications |
| **Within 72 hours of becoming aware — notify affected individuals by email (US path)** | Our internal target. One notice per affected person, written per person, using the contact details the account holds. | Data Principal communications |
| **Where that state's threshold is triggered — notify the state attorney general (US path)** | Check the attorney-general threshold for each affected state and file with that state where it is triggered, inside the same 72-hour target. The per-state procedures are not mapped yet — see "The US path". | DPB liaison |

## Whose law applies, and who to notify

**Step 0 (0–1 hours, alongside containment).** Before anything is notified,
find out **whose law applies**. Query the database for the countries of
residence of the affected users, and for US users the state. The answer
decides which path below applies, and each path has its own clock, so this
query cannot wait for the assessment.

| What Step 0 finds | Path |
|-------------------|------|
| Affected users in India | **DPDP** — the path in "The first 72 hours" above |
| Affected users in the EEA or the UK | **GDPR** — the path below |
| Affected users in the United States | **US state** — the path below |

One breach usually spans more than one path. Run each path for the users it
covers; the clocks run independently and the earliest one binds.

The three paths cover India, the EU/UK and the US. Any other affected
jurisdiction — Switzerland is in the published Privacy Policy's European
notice (section 13 of `src/app/(trust)/privacy/page.tsx`) but is not an EU
member state — has no path here. Raise it with counsel immediately (question
1.2 in `docs/breach-response-counsel-questions.md`) and do not let it hold up
notification for the users these paths do cover.

### The GDPR path (EEA / UK)

**Thin procedure — expand per counsel's answers.** This path exists so the
72-hour commitment the published Privacy Policy names (section 11 of
`src/app/(trust)/privacy/page.tsx`) has a procedure behind it. It is not a
complete procedure: the questions it depends on are open in
`docs/breach-response-counsel-questions.md` §1 — who we name as our Data
Protection Officer, since none is designated, is question **1.5** — and the
country-by-country filing routes are not mapped.

**Step G1 — identify the authority, as soon as Step 0 has run.** SophionOS has
no EU establishment, so there is **no single lead authority**: the one-stop
shop does not apply, and the breach is not filed once with "the" EU authority.
Identify the supervisory authority for **each affected member state** and file
through **each** authority's own breach notification portal. The UK is a
separate regime with its own authority.

**Step G2 — file within 72 hours of becoming aware.** A GDPR Article 33
notification must include:

- the nature of the breach, including, where possible, the categories and
  approximate numbers of affected data subjects and of affected records;
- the name and contact details of our Data Protection Officer;
- the likely consequences of the breach;
- the measures taken or proposed to be taken to address the breach, including
  to mitigate its possible adverse effects.

File on what is known. Where something is not yet known, say so and give a
time by which it will be.

**Step G3 — notify affected users without undue delay, where high risk.** Where
the breach is likely to result in high risk to the rights and freedoms of the
people affected, notify them — plain language, per person, on the same terms
as the India path.

**Open with counsel — do not answer it here.** Whether an Article 27 EU
representative is required, and what that changes for the filing, is question
**1.1** in `docs/breach-response-counsel-questions.md`; which authority or
authorities must be notified, and by when, is question **1.2**. Both are open.
Do not resolve them during an incident.

### The US path

**Thin procedure — expand per counsel's answers.** Same caveat as the GDPR
path: the questions it depends on are open in
`docs/breach-response-counsel-questions.md` §2, and the per-state procedures
are not mapped.

**Step U1 — notify affected individuals by email within 72 hours of becoming
aware.** Our internal target, and the one the published Privacy Policy names
(section 11 of `src/app/(trust)/privacy/page.tsx`). One notice per affected
person, written per person, using the contact details the account holds.

**Step U2 — check the attorney-general threshold for each affected state.**
For every state where an affected user lives, check whether the breach meets
that state's attorney-general notification threshold, and file with the
attorney general where it is triggered, inside the same 72-hour target. Which
states are in scope, what each threshold is, and how each filing is made are
question **2.1** in `docs/breach-response-counsel-questions.md`.

**Open with counsel — do not invent it here.** The state-by-state procedures
are not written down anywhere yet, and they are not something to reconstruct
from memory during an incident. Until counsel maps them, file what you can
support and record what you could not.

### The timelines these paths commit to

Every deadline the published Privacy Policy names, and the step that carries
it. This table is the policy-to-procedure check: a row here with no step
behind it is a promise the runbook cannot keep.

| Path | Who is notified | By when | Step |
|------|-----------------|---------|------|
| India (DPDP) | Data Protection Board of India | Without delay — internal target: within 24 hours of declaration | "Within 24 hours — notify the DPB" |
| India (DPDP) | Each affected Data Principal | Without delay — internal target: 24–72 hours of that declaration | "24–72 hours — notify affected Data Principals" |
| EU/UK (GDPR) | The supervisory authority in each affected member state | Within 72 hours of becoming aware of the breach | Step G2 |
| EU/UK (GDPR) | Affected users | Without undue delay, where the breach is likely to result in high risk to their rights | Step G3 |
| US | Affected individuals, by email | Within 72 hours of becoming aware — internal target | Step U1 |
| US | The state attorney general, where that state's threshold is triggered | Inside the same 72-hour target | Step U2 |

## Assessment: does this have to be notified?

The test is **risk to the rights and freedoms** of natural persons. Not
severity of the bug, not the reputational exposure, not whether anyone did
something naughty. A breach of a handful of rows can be notifiable; a
production outage that touched no data is not.

Answer three questions and write the answers down:

1. **What data, and whose?** Content entities, credentials, API key material,
   or metadata. A leaked API key *hash* is a different question from a
   leaked raw key, and so is a leaked note body.
2. **What is the likely consequence for the person?** Account takeover,
   loss of confidentiality of private notes, an unwanted disclosure of
   someone's address and contact details, discrimination or loss of dignity.
3. **Does the risk reach the threshold?** Guidance generally puts the
   threshold at likelihood × severity where a risk to rights is *likely* to
   result in "significant adverse effect". Not legal advice — this is the
   shape of the judgement, and the judgement is a human one.

**Decisions that are recordable, not excuses.** "We do not notify" is a
decision with a rationale and it is written down like any other: the data
involved, why the risk was judged not to reach the threshold, who decided,
and when. "We did not notice" is not a decision; if you only learned of it
during this process, the clock started when you learned.

**The assessment is reviewed before it is filed.** Draft it, send it to
counsel with `docs/breach-response-counsel-questions.md`, and let it sit for
the two-hour cooling-off. The filer re-reads it before submitting, and the
independent reviewer checks it if that slot is filled. If counsel is
unreachable after 12 hours, file on the documented assessment and record the
absence of review in the decision log.

The review is a compensating control for a one-person operation, not a second
decision-maker: the decision stays with the privacy assessment role, and the
record has to show who made it, when, and on what basis.

**Never** resolve a notifiable breach by asking a Data Principal to accept it
in advance. Consent to processing is not consent to being breached, and the
published Terms (`src/app/(trust)/terms/page.tsx`) have no such term — this
repository has no consent gate that asks for one.

## Evidence preservation

Preserve first, investigate second. Everything below is read-only capture; the
mistake that costs an investigation is a remediation step that destroys the
thing it was supposed to explain.

**The pre-containment capture is a gate, not a reminder.** Before any key
rotation, rollback, or access revocation runs, capture:

- **the logs** — request logs, application logs, the host's request log, and
  the cron runs (the email briefs job in `src/app/api/cron/briefs`), with the
  redaction the operator's platform already applies;
- **the database state** — a snapshot of the affected tables, before anything
  touches them;
- **the access records** — `audit_events`, Clerk account and session records,
  and the service-role key's own usage, as they stood when the incident was
  declared.

**No containment action runs before that capture completes.** Capture first,
contain second. The capture is read-only and does not touch the live system,
so the gate costs minutes, not hours. The one exception is data being
destroyed as you respond — containment wins there, the capture becomes
best-effort, and the gap is recorded in the decision log with the reason.

- **`audit_events`** — the administrative record of who did what. It is part
  of the pre-containment capture above, and it has to be captured before
  anything is rotated, because rotating a key can change what a
  credential-based actor is attributed to. It records credential-lifecycle
  and AI-access events, not note bodies, and it stores the network address as
  a hash (`ip_hash`).
- **The consent ledger (`consent_records`) — cloud-side.** Never delete it,
  never UPDATE it, never let a "cleanup" job touch it — during an incident or
  after one. It is the record of what every user was shown and agreed to.
  Row-level DML is refused at the table level by the `consent_records_append_only`
  trigger, so a recorded decision cannot be edited or deleted by the service
  role or by any other application role; and the service role holds no
  `TRUNCATE` or `DELETE` privilege on the table at all, so the ledger cannot
  be emptied in one statement either. (A table *owner* can still truncate, and
  a superuser can disable any trigger — no application migration can close
  that, and it is not what this guarantee is claiming.) An incident that
  appears to require altering the ledger is an incident the ledger is needed
  *for*; escalate instead. Any proposal to write a "corrected" row post-hoc
  is a decision for counsel, and it is recorded as an append, never as an
  edit. **This repository keeps no consent ledger**: in the open-source tree
  there is nothing equivalent to preserve and nothing equivalent to query, so
  what is preserved here is the audit trail and the database snapshots.
- **Request and application logs** — the host's request log, the route handler
  output, the cron runs. Redaction is the operator's job, and this repository
  states the rules rather than enforcing them: `docs/ops/logging-redaction.md`
  lists what must never reach a log — authorization headers and cookies, raw
  API keys and key hashes, Clerk session tokens, note bodies, full request
  bodies — and `src/lib/audit/audit-redaction.ts` carries
  `redactAuditMetadata` for structured audit payloads. An address or a token
  that is in a log line is already gone; one that is not, is the breach.
- **Database snapshots** before and after containment.
- **A legal hold** where litigation or a regulatory investigation is likely.
  This repository has no legal-hold table and no retention sweep to skip held
  subjects, so the hold is held at the platform level — the snapshot
  retention window, the log store, the Clerk side — and the fact that a hold
  is in place goes in the decision log. In the managed service, place one with
  the cloud-side `legal_holds` table; the cloud-side retention sweep
  (`src/app/api/cron/retention-sweep/route.ts`) skips held subjects.

**The honest limit on recovery: the backup window is the operator's, not
ours.** This repository ships no backup job and no retention-policy module:
`docs/deployment.md` and `docs/self-hosting.md` make scheduled,
restore-tested Postgres backups the operator's responsibility, and the window
that actually applies in a deployment is the one the operator configures.
There is no published number here, because there is no number in this
repository. If someone has tampered with the live tables and the tampering is
older than the oldest surviving snapshot, it may be gone and cannot be
reconstructed — there is no append-only trigger here to refuse the write, so
a snapshot is the only independent record of what the table held. Treat "how
far back do our snapshots go, and who can drop a table or a trigger" as a
question to answer *during* an incident, not one to discover in it — see the
restore-test item in the operator checklist in `docs/deployment.md`.

## After the incident

Within a week, write it down. A response with no written record is a response
nobody can learn from, and the next incident will repeat it.

The write-up records: the UTC timeline, the notifiability decision and its
reasoning, who was notified and when, what was preserved, what went wrong,
and the specific changes made. Two questions are asked every time, and they
are the ones that catch a scope error:

- **Was the processing in scope?** Check the affected flow against
  `docs/data-inventory.md` and the product claims in `docs/trust-contract.md`.
  If the inventory says a data class is not collected, data must not have
  flowed, and if it did, the gap is between what we publish and what the
  product does.
- **Was the legal text in scope?** Check the version of each published
  document in git — the pages under `src/app/(trust)/`. This repository has
  no versioned, consent-tracked legal corpus (that is the cloud-side
  `legal/<slug>/v<n>.md` corpus and its `LEGAL_REGISTRY`), so there is no
  SHA-256 of the bytes a user was actually shown to query against the
  ledger: the available evidence is the deployment's own git history. A
  breach that involves the legal documents themselves is escalated to
  counsel before anything is said publicly.

Feed the outcome back into `docs/dpdp-launch-readiness.md` and, if it
exposed a control that does not exist yet, into the roadmap as a named
commitment. Do not fix it silently.

## Rehearsal

A runbook that has never been walked is a document, not a procedure. Before
launch, walk this once on paper with the roles filled in and the grievance
officer's mailbox actually monitored. The walk should be a tabletop, timed,
and it should end with the list of things that turned out to be unwritten
down.

Walk the compensating controls with the same seriousness: run the capture
gate before the containment step, time the two-hour cooling-off, and send the
assessment to counsel with the 12-hour fallback timer running. The point of
the rehearsal is to find out what is unwritten — including whether the
independent reviewer slot has been filled, and what happens to the filing if
counsel does not answer.

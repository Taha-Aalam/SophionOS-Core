# Counsel questions — breach notification

**Status: OPEN — awaiting qualified counsel.** These are questions for the
reviewer of the published Privacy Policy (section 11 of
`src/app/(trust)/privacy/page.tsx`) and `docs/breach-response.md`. Nothing in
this file is legal advice, and no answer has been assumed anywhere in the
product.

## Why this file exists

The published Privacy Policy promises breach notification.
`docs/breach-response.md` is the procedure that has to execute that promise.
While the two disagree, the policy states commitments the runbook cannot
execute.

On 2026-10-20 the breach section was softened to a general commitment so that
it stopped outrunning the procedure: the GDPR 72-hour commitment and the US
state deadlines were removed, and the internal 24-hour and 24-72-hour targets
were moved out of the policy (they are procedure, and they live in the
runbook). The India paragraph was kept, because the runbook's India path
exists and is executable in structure.

The breach section names the 72-hour commitment again, and the runbook has
grown the two branches it was missing — an EU/UK GDPR path and a US state
path — so the policy and the procedure now say the same thing. Both new paths
are marked **thin procedure — expand per counsel's answers**: they carry the
deadlines, not the detail.

The questions below are what would let those two paths become complete
procedure, and what would let the breach section be more specific than it
now is.

## Context that applies to every question

- SophionOS is operated by one person (the founder), with engineering
  support. SophionOS is established in **India**. There is no EU
  establishment.
- The service is sold to individuals and is available to users in other
  jurisdictions, so a breach can affect Data Principals in any of them.
- The current runbook is **India-first**: it has a DPDP path (intimate the
  Data Protection Board and each affected Data Principal without delay), and
  two branches — an EU/UK GDPR path and a US state path — that are marked
  thin and carry no mapped country-by-country or state-by-state detail.
- The published policy pages and the cloud-side legal corpus are still DRAFT
  and have not been signed off.

---

## 1. European Union / United Kingdom

**1.1 — EU representative (Art. 27).** SophionOS has no EU establishment, so
the one-stop-shop does not apply. Is an Art. 27 EU representative required for
our processing? If so, what does it change operationally — for a breach, and
for the published notices?

**1.2 — Which authority, and which deadline.** With no one-stop shop, when an
EU or UK user is affected, which authority or authorities must be notified —
the authority where the affected person resides, the authority where we are
established, or both — and within what deadline?

**1.3 — Indirect notification.** If an affected person cannot be contacted
directly, what are the conditions for notifying affected people through a
public notice, and what must that notice contain?

**1.4 — High-risk threshold.** When does a breach require notifying affected
individuals, as opposed to only the authority?

**1.5 — Data Protection Officer, and the Article 33 contact point.** We have
no designated DPO. Section 9 of the published Privacy Policy names a
grievance officer, not a DPO. An Article 33 notification must carry the name
and contact details of the DPO, where one is designated. What should we name
as the contact point for a breach notification, and does answering that oblige
us to designate and publish a DPO?

## 2. United States

**2.1 — Which state regimes need an operational procedure.** At minimum
California and New York, plus any others counsel advises. For each: the
notification deadline, the threshold that triggers it, and the circumstances
that require notifying the state attorney general or a consumer-protection
agency.

**2.2 — Establishing residence.** How do we determine a resident's state of
residence for notification purposes, given that we may hold no address data
beyond what a user has entered?

**2.3 — Product consequences.** Does meeting these regimes require any
change to our own data practices — for example recording a jurisdiction or
state at signup?

## 3. India (DPDP Act 2023, DPDP Rules 2025)

**3.1 — Does the runbook's procedure match current expectations?** The
runbook intimes the Data Protection Board within 24 hours of declaring an
incident and each affected Data Principal between 24 and 72 hours of that
declaration. Does that match the Board's current expectations under Rule 7?
Is our own reading correct that the timing rule is "without delay" and that
there is no 72-hour safe harbour — the runbook is written on that basis, and
the policy now says the same thing.

**3.2 — Content and channel.** What must an intimation contain, and is there
a prescribed form, template, or channel for filing it with the Board?

**3.3 — Role separation in a one-person operation.** The runbook states that
the person who decides notifiability must not be the only person who decided
to contain. With a one-person operation, is that the right requirement, and
what is an acceptable way to satisfy it?

**3.4 — Grievance officer.** We publish `privacy@sophionos.com` and it is
monitored, and the published officer **name** and **postal address** are now
in place (section 9 of the published Privacy Policy). What does the Board
require to constitute a designated grievance officer, and what must be
published for it to count?

## 4. The policy text itself

**4.1 — Is the breach section adequate as it now reads?** It states the
general commitment — *"In the event of a personal data breach, we will notify
affected users and relevant authorities without undue delay, in accordance with
applicable law"* — and then, for the GDPR, the Article 33 authority clock (72
hours of awareness) and the Article 34 user notification (without undue delay,
where high risk), and for the United States the same 72-hour target. The India
(DPDP) paragraph is retained, and our internal targets are still not in the
policy. Are the jurisdiction-specific timelines now stated as they should be?

**4.2 — Is it GDPR-transparent?** The published policy carries an EU/UK
notice and a US state notice, so it invites a GDPR reading. The breach section
spells out the Art. 33 and Art. 34 language. Is that sufficient for a policy
that claims to meet the GDPR, or does the Art. 27 representative question (1.1)
have to be answered in the published policy too?

**4.3 — How specific can the breach section become?** Now that the runbook has
branches for each regime we are actually obliged to serve, what can the policy
say about timelines, and what is the limit — how specific can a commitment be
before the runbook can execute what it says?

---

## 5. Also for counsel

Anything in these questions that is framed wrong, anything that should have
been asked that is not here, and anything else that has to be true before the
policy and the runbook can be published as anything other than DRAFT.

**Not in scope for this round:** completing the two new runbook paths. The
branching itself is implemented — Step 0, the GDPR path and the US path
exist — but the detail in each is driven by counsel's answers above, and
until those come back the paths are marked thin.

# Revisión de arquitectura y operativa de Interesante

The goal is a report you can read and act on, followed by fixes once you approve them. This first phase is review only and changes nothing in the app.

## What the review covers

1. **Business logic compared with the structure**
   - Map the business flow: prospect → signing → roster → opportunity/pitch → contract → production → billing sprints → order to Maggy → invoice → payment → IC commission.
   - At each step, check that the data flows on without being typed in twice, and flag duplicated or disconnected sources. Early signs to confirm: prospects appear both in the composer profile and in a separate list, and producers live both in Productoras and in Partners.

2. **Section-by-section working check** (about 115 screens)
   - Open each section as BIG C, TEAM and ROSTER: does it load, save, edit and delete, and do the filters, exports and links between sections work?
   - Rate each section: OK / works with friction / broken.

3. **Can the app answer real questions?** Test each executive question against the data:

| Question | What it needs | Initial status |
|---|---|---|
| When do I invoice this film? | Planned date on the billing sprint | Exists, still to be checked in use |
| How much have I earned with this composer? | Paid invoices and commission per composer | Exists across several tables, no direct view |
| How many violinists do we have? | Structured instrument field | Free-text tags only (to confirm) |
| Women composers from Valencia | Gender + city/province | Fields exist, to check how complete they are |
| Producers with projects in development | Production status + producer | To check |
| Signings this month | Target signing date | Two sources, to unify |

   The test will add 20–30 more typical questions (renewals, deliveries, deadlines, sales pipeline, etc.).

4. **Data quality**: how complete the key fields are (gender, city, fees, commission, dates), plus duplicates and orphan records.

## What you get

- A PDF/Markdown report saved in Files with:
  - a business diagram,
  - a section-by-section table,
  - the question matrix (answered / partly answered / not answered).
- A prioritised list of improvements (critical / important / nice to have), each with its effort and impact.
- A proposal for a «Preguntas» panel or quick searches that answer these questions directly.

Once you have read the report, you choose which improvements to make. Each one gets its own plan.

## Technical details

- Inventory the routes in `src/routes/_authenticated/**` and `nav-tree.ts`, and review RLS policies, triggers and sync between duplicated tables (`production_companies`↔`partners`, `spanish_films`↔`productions`, `roster_prospects`↔`composers`).
- Run Playwright passes for each role, using sessions minted for each role.
- Answer the question matrix with read-only SQL queries, and measure field completeness per table.
- Review the logs and pending monitoring findings.

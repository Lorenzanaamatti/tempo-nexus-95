## Project rules

- User account deletion is a BIG C-only server action that revalidates the exact email before deletion, preventing accidental or client-forged removals.- Roster occupancy is computed by the SQL function `roster_occupancy_months` (productions/phases/assignments, billing sprints, open pitches/candidacies); UI and the weekly `notify_roster_income_gaps` cron share it so alerts and screens never disagree.
- Agency work for an artist is aggregated at read time (`fetchAgencyTimeline`) from pitches, candidacies, productions, press and the manual `composer_activity_log`; never duplicate those sources into the log.
- AI-read contract payment terms are only suggestions; they become `production_billing_sprints` only after explicit human confirmation and never overwrite existing sprints.

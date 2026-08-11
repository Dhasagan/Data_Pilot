# Project TODO

- [x] Add user-scoped dataset, dataset row, analysis, insight, forecast, chat conversation, chat message, and report database models.
- [x] Apply the database migration and verify the schema.
- [x] Add secure S3 upload and dataset metadata procedures scoped to the authenticated user.
- [x] Add dataset list, preview, delete, and analytics procedures using actual uploaded data.
- [x] Add conversational AI Analyst procedures with persisted user-scoped chat history.
- [x] Add automated insights and forecasting procedures powered by actual dataset calculations and the configured LLM.
- [x] Add exportable structured report generation and download support.
- [x] Build the International Typographic Style login and application shell with responsive navigation.
- [x] Build dashboard, datasets, analytics, AI Analyst, insights, forecast, reports, settings, and profile views.
- [x] Add Recharts visualizations for bar, line, pie, and forecast views.
- [x] Add Vitest coverage for authentication boundaries, user scoping, dataset procedures, and analytics helpers.
- [x] Run type-checks, tests, and visual verification.
- [ ] Save the completed project checkpoint.

## Change History

- Initial implementation scope recorded from the DataPilot AI requirements.
- [ ] Follow-up changes requested after initial delivery.

- [x] Remediation: add a dedicated user-scoped datasetRows table and persist parsed rows explicitly.
- [x] Remediation: create persisted structured HTML report artifacts in S3 with direct download URLs.
- [x] Remediation: add dataset procedure and cross-user ownership tests.
- [x] Remediation: re-run all validation after remediation.

- [x] Add Vitest coverage for dataset list and delete procedures, including explicit cross-user denial assertions.

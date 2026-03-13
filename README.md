## MEL Platform Backend

Node.js backend for the Monitoring, Evaluation & Learning (MEL) Platform, designed to integrate with your existing Lovable frontend.

### Stack

- **Runtime**: Node.js (Express)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT with role-based access (Admin, Project Lead)
- **Email**: Nodemailer (SMTP or JSON dev transport)

### Getting Started

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

- Copy `.env.example` to `.env` and set:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - Email SMTP settings (Brevo supported; JSON logging used if omitted)

3. Apply Prisma migrations and generate client:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

4. Start the dev server:

```bash
npm run dev
```

The API will be available at `http://localhost:4000/api`.

### Brevo email setup (SMTP)

Set these in your backend `.env` (do not commit secrets):

- `EMAIL_FROM`: must be a Brevo-verified sender (or domain sender)
- `SMTP_HOST="smtp-relay.brevo.com"`
- `SMTP_PORT=587`
- `SMTP_USER="apikey"`
- `SMTP_PASS="<your Brevo SMTP key>"`

To test sending an email (Admin-only):

- `POST /api/notifications/send`
  - Body: `{ "to": "you@example.com", "subject": "Test", "message": "Hello from MEL" }`

### Core Endpoints (Sample)

- **Auth**
  - `POST /api/auth/login`
    - Request: `{ "email": "admin@example.com", "password": "password" }`
    - Response: `{ "token": "JWT...", "user": { "id": 1, "name": "Admin", "email": "admin@example.com", "role": "ADMIN" } }`
  - `POST /api/auth/logout`
    - Stateless JWT logout (client discards token).

- **Projects** (Admin)
  - `POST /api/projects`
    - Body: `{ "name": "Project A", "description": "...", "category": "Health", "startDate": "2026-01-01T00:00:00.000Z", "endDate": "2026-12-31T00:00:00.000Z", "reportingInterval": "QUARTERLY" }`
  - `POST /api/projects/:id/assign-lead`
    - Body: `{ "leadId": 3 }`

- **Reports**
  - `POST /api/reports`
    - Body: `{ "title": "Q1 2026", "periodStart": "2026-01-01T00:00:00.000Z", "periodEnd": "2026-03-31T00:00:00.000Z", "projectId": 1 }`
  - `POST /api/reports/:id/status`
    - Actions: `SUBMIT`, `REQUEST_EDIT`, `APPROVE_EDIT`, `PUBLISH`, `COMPLETE`
    - Body: `{ "action": "PUBLISH" }`

- **Disaggregated Data**
  - `POST /api/disaggregated-data`
    - Body (example):
      `{ "reportId": 1, "indicatorId": 5, "Economy": 10, "Gender": "Female" }`

- **Audit Logs** (Admin)
  - `GET /api/audit-logs?entity=Report&limit=20`

- **Analytics**
  - `GET /api/analytics/reports?category=Health&status=PUBLISHED&reportingInterval=QUARTERLY`

- **Notifications** (Admin)
  - `POST /api/notifications/send`
    - Body: `{ "to": "user@example.com", "subject": "Test", "message": "Hello" }`

### Integration Notes

- The frontend should:
  - Store the `token` from `/auth/login`.
  - Send it as `Authorization: Bearer <token>` on all protected requests.
  - Use the `role` field to conditionally render Admin vs Project Lead workflows.

Business rules like required disaggregated fields, indicator completion before publishing, deadline enforcement, and full audit logging are implemented in the respective controllers and Prisma middleware-level logic can be added later if needed.


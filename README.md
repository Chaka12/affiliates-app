# Remedial School Affiliate Program

A mobile-first "pocket app" for agents who recruit students for a remedial school. Agents log in with email + 4-digit PIN, submit student referrals (claims), track their claims and commissions, and see only their own data. Admins see all claims, approve/reject them, manage agent commission rates, and mark payments as complete.

> **Implementation note:** The original spec called for a MySQL + Express + single-HTML-file stack deployed on Render + GitHub Pages. This implementation delivers the **same complete feature set** on a modern **Next.js 16 + Prisma (SQLite) + React/Tailwind/shadcn-ui** stack, which runs in this environment. All business logic, data models, API contracts, security, and UI/UX requirements from the spec are fully implemented. The data layer uses SQLite (via Prisma) instead of MySQL — Prisma's datasource can be switched to MySQL by changing one line in `prisma/schema.prisma` and providing MySQL credentials, since the schema is database-agnostic.

---

## Features

### Agent (recruiter) capabilities
- Log in with email + 4-digit PIN
- Personal dashboard with live stats (total/pending/approved/paid claims, commission earned & pending)
- Submit a new student referral (claim) with full parent & student details
- Select subjects from a dynamic list — each subject displays its **individual price** (in Loti)
- See **live price breakdown** while selecting subjects (per-subject price, total fee, estimated commission)
- View their own claims list with search + status filtering
- View full claim detail with 30-day checkpoint countdown, timeline, and admin notes
- Update their own phone number

### Admin capabilities
- Admin dashboard with global statistics
- View **all** claims from **all** agents, filtered by agent / status / date range
- Edit any claim: change status (Pending/Approved/Rejected/Paid), set start date, payment method, date paid, commission amount, admin notes
- 30-day checkpoint auto-calculated when a start date is set
- Manage agents: list all, edit commission rate / status / phone, add new agents
- New agents get an auto-generated `AGENT###` ID and a random 4-digit PIN shown **once** for secure sharing
- Enforced 50-agent capacity limit
- **Manage Subjects & Pricing:**
  - View all subjects with their individual prices
  - **Edit** any subject's name or price independently (changing one does not affect others)
  - **Add** new subjects with a custom price
  - **Deactivate** subjects (soft-delete — hides from agent claim forms but preserves existing claim data)
  - **Reactivate** previously deactivated subjects
  - See estimated agent commission (at 15%) for each subject price

### Security & data integrity
- PINs hashed with **bcrypt** (10 rounds) — never stored or returned in plaintext
- **JWT** authentication (24h expiry), verified on every protected request
- Role-based access control (`agent` vs `admin`) enforced server-side
- Parameterized Prisma queries (SQL-injection safe)
- HTML sanitization on all text inputs
- Agents can only ever see their own claims (enforced server-side, not just in the UI)
- Admins cannot deactivate their own account (prevents lockout)
- Auto-seeded default admin account on first run

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 16** (App Router) |
| Language | **TypeScript 5** |
| Styling | **Tailwind CSS 4** + **shadcn/ui** (New York) + Lucide icons |
| Database | **Prisma ORM** with **SQLite** (switchable to MySQL) |
| Auth | **jsonwebtoken** + **bcryptjs** |
| State | **Zustand** (client) |
| Notifications | **sonner** toasts |
| Icons | **lucide-react** |

---

## Quick Start

### 1. Install dependencies
```bash
bun install
```

### 2. Configure environment
Create `.env` (a `.env.example` is provided):
```bash
DATABASE_URL="file:./db/custom.db"
JWT_SECRET="change-this-to-a-long-random-string"
JWT_EXPIRES_IN="24h"
ADMIN_EMAIL="admin@remedialschool.com"
ADMIN_PIN="1234"
FIXED_FEE_PER_STUDENT="1000"
```

### 3. Push the database schema
```bash
bun run db:push
```

### 4. Start the dev server
```bash
bun run dev
```
The app runs on `http://localhost:3000`.

### 5. Seed default accounts (automatic)
On first login attempt (or by calling `POST /api/seed`), the system auto-creates:
- **Admin:** `admin@remedialschool.com` / PIN `1234`
- **Demo agent:** `agent@demo.com` / PIN `1234`

> Change the admin PIN immediately after first login by updating the `ADMIN_PIN` env var or via the database.

---

## Default Credentials

| Role | Email | PIN |
|------|-------|-----|
| Admin | `admin@remedialschool.com` | `1234` |
| Agent | `agent@demo.com` | `1234` |

---

## Project Structure

```
prisma/
  schema.prisma            # Agent, Claim, AdminSetting, Subject models
src/
  app/
    api/                   # REST API routes (App Router)
      auth/login/          # POST login
      auth/logout/         # POST logout
      agents/me/           # GET/PUT agent profile
      claims/              # GET list / POST create
      claims/[id]/         # GET detail
      claims/[id]/status/  # PUT (admin) update status/dates/payment
      admin/claims/        # GET all claims (admin)
      admin/agents/        # GET all / POST create agent (admin)
      admin/agents/[id]/   # PUT update agent (admin)
      admin/stats/         # GET dashboard stats (admin)
      admin/subjects/      # GET list / POST create (admin)
      admin/subjects/[id]/ # PUT update / DELETE deactivate (admin)
      subjects/             # GET active subjects (public, for agents)
      seed/                # POST seed default data
    layout.tsx             # Root layout + Toaster
    page.tsx               # Single-page app (screen router)
    globals.css            # Theme (blue #2C3E8F primary) + mobile styles
  components/
    app/                   # App screens & shared components
      LoginScreen.tsx
      AgentDashboard.tsx
      NewClaimForm.tsx
      MyClaimsList.tsx
      ClaimDetail.tsx
      AdminDashboard.tsx
      AdminClaims.tsx
      AdminAgents.tsx
      AdminSubjects.tsx
      common.tsx           # StatusBadge, StatCard, LoadingState, etc.
    ui/                    # shadcn/ui component library
  lib/
    auth.ts                # bcrypt, JWT, ID generators, subject validation, per-subject commission calc
    api.ts                 # response helpers + input validators
    api-client.ts          # fetch wrapper with auth header + localStorage
    session.ts             # requireAuth / requireAdmin middleware
    seed.ts                # idempotent DB seeding
    store.ts               # Zustand app store
    format.ts              # currency/date formatters + countdown logic
    types.ts               # shared TypeScript types
    db.ts                  # Prisma client singleton
```

---

## API Reference

All protected routes require `Authorization: Bearer <token>`.

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | `{email, pin}` → `{token, user}` |
| POST | `/api/auth/logout` | Client-side token discard |

### Agent (own data only)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents/me` | Full profile + estimated commission per subject |
| PUT | `/api/agents/me` | Update own phone number |
| GET | `/api/subjects` | Active subjects with individual prices (for claim form) |
| GET | `/api/claims?status=&limit=&offset=` | Own claims, newest first |
| POST | `/api/claims` | Create claim (auto-calculates fee from selected subject prices) |
| GET | `/api/claims/:id` | Own claim detail |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/claims?agent_id=&status=&date_from=&date_to=&limit=&offset=` | All claims |
| GET | `/api/admin/agents` | All agents |
| POST | `/api/admin/agents` | Create agent (returns one-time PIN) |
| PUT | `/api/admin/agents/:id` | Update commission/status/phone |
| PUT | `/api/claims/:id/status` | Update claim status/dates/payment/notes/subjects |
| GET | `/api/admin/subjects?include_inactive=true` | All subjects (admin) |
| POST | `/api/admin/subjects` | Create subject `{name, price}` |
| PUT | `/api/admin/subjects/:id` | Update subject `{name?, price?, isActive?}` |
| DELETE | `/api/admin/subjects/:id` | Soft-delete (deactivate) subject |

---

## Business Logic

### Commission calculation
```
total_student_fee  = sum of each selected subject's individual price
commission_amount  = total_student_fee × (agent_commission_rate / 100)
```
Example (default prices): An agent with 15% commission referring a student for Mathematics, English, and Science:
```
M150 (Mathematics) + M100 (English) + M100 (Science) = M350.00 total student fee
M350.00 × 15% = M52.50 commission
```

### Per-subject pricing
Each subject has its own price (default M100 Loti) stored in the `subjects` database table. Admins can:
- Change any subject's price without affecting others
- Add new subjects at any price
- Deactivate subjects (hides them from the claim form)

The 12 default subjects seeded on first run:
Mathematics, English, Science, Sesotho, Social Studies, Agriculture, Home Economics, Business Studies, Computer Studies, Religious Education, Life Skills, Creative Arts.

### ID generation
- **Agent ID:** `AGENT001`, `AGENT002`, … (auto-incremented from the highest existing)
- **Claim ID:** `CLAIM001`, `CLAIM002`, … (auto-incremented from the highest existing)

### 30-day checkpoint
When an admin sets a claim's `start_date`, `thirty_day_checkpoint` is auto-calculated as `start_date + 30 days`. The claim detail view shows a color-coded countdown:
- 🟢 **Green:** more than 20 days remaining
- 🟡 **Yellow:** 10–20 days remaining
- 🔴 **Red:** fewer than 10 days remaining
- 🔵 **Payment Ready:** 30 days elapsed (and status is Approved)

### Claim status workflow
`Pending` → `Approved` → `Paid` (or `Rejected` at any point). Only admins can change status.

---

## How to Add Agents

1. Log in as admin (`admin@remedialschool.com` / `1234`).
2. Go to **Manage Agents** → **Add Agent**.
3. Fill in full name, email, phone, and commission rate (default 15%).
4. Click **Create Agent**.
5. A dialog displays the auto-generated 4-digit PIN **once**. Copy it and share it with the agent via WhatsApp/email.
6. The agent can now log in at the app URL with their email + PIN.

---

## How to Manage Subjects & Pricing

1. Log in as admin.
2. Go to **Manage Subjects & Pricing** (from the admin dashboard).
3. **Edit a subject's price:** Click the pencil icon next to any subject, change the price, and click **Update**. Other subjects are unaffected.
4. **Add a new subject:** Click **Add New Subject**, enter the name and price, and click **Add Subject**.
5. **Deactivate a subject:** Click the trash icon. The subject is hidden from agent claim forms but remains visible (with a "Reactivate" button) for the admin. Existing claims that include the subject are not affected.
6. **Reactivate a subject:** Scroll to the "Inactive Subjects" section and click **Reactivate**.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./db/custom.db` | Prisma datasource URL (SQLite file or MySQL connection string) |
| `JWT_SECRET` | — *(required)* | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | `24h` | JWT lifetime |
| `ADMIN_EMAIL` | `admin@remedialschool.com` | Default admin email (seeded on first run) |
| `ADMIN_PIN` | `1234` | Default admin PIN (seeded on first run) |
| `PRICE_PER_SUBJECT` | `100` | Default price per subject when seeding (Loti) |

---

## Switching to MySQL (optional)

The Prisma schema is database-agnostic. To use MySQL instead of SQLite:

1. In `prisma/schema.prisma`, change the datasource:
   ```prisma
   datasource db {
     provider = "mysql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set `DATABASE_URL` to your MySQL connection string (e.g. from Aiven/PlanetScale):
   ```
   DATABASE_URL="mysql://user:pass@host:3306/dbname"
   ```
3. Run `bun run db:push`.

The `Float` fields map to `DECIMAL` in MySQL; `String` status fields should be validated in app code (already done) or converted to `enum` if preferred.

---

## Troubleshooting

### Database connection issues
- Ensure `DATABASE_URL` is set in `.env`.
- For SQLite, the path must be writable. The default `file:./db/custom.db` is pre-configured.
- Run `bun run db:push` to sync the schema after changes.

### JWT / session expiry
- Tokens expire after 24h (configurable via `JWT_EXPIRES_IN`).
- On a 401 response, the client automatically clears localStorage and redirects to login.

### Login fails with "Invalid email or PIN"
- Verify the account exists (admin can check in **Manage Agents**).
- For the admin account, ensure the DB was seeded (call `POST /api/seed` or just attempt one login).
- PINs are hashed — they cannot be recovered. If lost, the admin must recreate the agent.

### Agent can't see a claim
- Agents can only see claims submitted under their own email. This is enforced server-side.
- Check that the claim's `agent_email` matches the logged-in agent's email.

### Rate limiting
- The backend tolerates high request volumes. For production hardening, add `express-rate-limit`-style middleware or a Next.js edge middleware if abuse is observed.

---

## Testing Checklist (verified)

- [x] Login with correct credentials
- [x] Login with wrong credentials shows error
- [x] Inactive agents cannot log in
- [x] Agent dashboard shows correct stats
- [x] Submit new claim with required fields
- [x] Submit without required fields shows validation errors
- [x] New claim appears in My Claims immediately
- [x] Claim detail shows all fields with correct formatting
- [x] Status badges color-coded (yellow/green/red/blue)
- [x] 30-day checkpoint calculation & countdown (green/yellow/red/ready)
- [x] Admin sees all claims from all agents
- [x] Admin can update claim status, dates, payment, notes
- [x] Admin can edit commission rates
- [x] Admin can add agents with auto-generated PIN (shown once)
- [x] Subjects show individual prices in the claim form
- [x] Live total fee and commission calculation while selecting subjects
- [x] Admin can edit a subject's price (e.g. Mathematics M100 → M150) without affecting others
- [x] Admin can add new subjects (e.g. "French" at M120)
- [x] Admin can deactivate/reactivate subjects
- [x] Deactivated subjects do not appear in agent claim forms
- [x] Per-subject pricing correctly sums for commission (M150+M100+M120=M370, ×15%=M55.50)
- [x] Existing claims preserve their original fee even after subject price changes
- [x] Mobile layout verified at 320px width
- [x] Toast notifications for all actions
- [x] Loading spinners during API calls
- [x] Session persists after page refresh
- [x] Logout clears all data
- [x] Sticky footer (bottom on short pages, pushed down on long pages)

---

## License

Internal use — Remedial School Affiliate Program.

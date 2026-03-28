# HKM Construction Management Platform

Multi-tenant SaaS platform for construction company operations management. Built for **HKM Construction** (Kenya), automating the full material requisition-to-delivery pipeline, project budgeting, supplier management, and role-based workflows.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router, SSR/SSG) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 3.4 + custom design system |
| **Database** | PostgreSQL (Supabase-hosted) |
| **ORM** | Prisma 7 with `@prisma/adapter-pg` driver adapter |
| **Auth** | Supabase Auth (email/password, OAuth-ready) |
| **State** | Zustand + React Query (TanStack Query v5) |
| **Forms** | React Hook Form + Zod validation |
| **Icons** | Lucide React |
| **Deployment** | Netlify (SSR via Next.js plugin) |

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, Register, Forgot Password
│   ├── (dashboard)/        # All protected pages
│   └── api/                # API route handlers (thin HTTP layer)
├── components/
│   ├── layout/             # Sidebar, Topbar, RoleGuard
│   ├── ui/                 # Base components (Button, Card, Dialog, etc.)
│   └── requisitions/       # Feature components (Pipeline, StatusBadge, etc.)
├── lib/
│   ├── auth/               # Guards, permissions matrix, RBAC
│   ├── prisma/             # Client (lazy Proxy), tenant middleware
│   ├── supabase/           # Client, server, middleware helpers
│   ├── workflow/            # Generic state machine engine
│   └── utils/              # Formatting (KES, dates), constants, cn()
├── services/               # Business logic layer
│   ├── requisition.service.ts
│   ├── purchase-order.service.ts
│   ├── finance.service.ts
│   ├── supplier.service.ts
│   ├── delivery-verification.service.ts
│   ├── notification.service.ts
│   └── activity-log.service.ts
└── generated/prisma/       # Prisma generated client
```

### Key Patterns

- **Service Layer** — API routes are thin HTTP handlers; all business logic lives in `src/services/`
- **Multi-Tenant Isolation** — Every table has `tenant_id`; all queries scoped by tenant
- **Lazy Prisma Client** — Uses a `Proxy` to defer DB connection to request time (avoids build-time crashes)
- **Generic Workflow Engine** — Reusable state machine in `src/lib/workflow/engine.ts`, configured per entity
- **Event-Driven Audit Logging** — Actions emit structured events via `EventEmitter`, logged to `ActivityLog`
- **Role-Based Access Control** — Permission matrix in `src/lib/auth/permissions.ts` with guard functions

## Database Schema (23 Models)

### Core Entities
- **Tenant** — Organization with branding, currency (KES), timezone (Africa/Nairobi)
- **User** — 8 roles: CEO, QS, Architect, Project Manager, Driver, Co-Driver, Site Manager, Subcontractor
- **Project** — Construction projects with budgets, status tracking, client info
- **Site** — Physical locations under projects, each with a site manager

### Requisition Pipeline
- **Requisition** — Material requests with 13-state workflow (Draft → Complete)
- **RequisitionItem** — Line items with requested/approved/received quantities
- **RequisitionStatusLog** — Full audit trail of every state transition

### Purchase Orders & Logistics
- **PurchaseOrder** — Generated from approved requisitions, assigned to drivers
- **PurchaseOrderItem** — PO line items linked back to requisition items
- **DeliveryVerification** — Site manager verifies delivered materials
- **DeliveryVerificationItem** — Per-item condition tracking (Good/Damaged/Partial)
- **DiscrepancyReport** — Quality issues tracked to resolution

### Financial
- **ProjectBudget** — Per-category budgets (materials, labor, equipment, overhead)
- **ClientPayment** — Client payment records with references

### Supporting
- **Supplier** — Vendor database with categories and ratings
- **SupplierPriceHistory** — Historical pricing per item/supplier
- **ItemCatalog** — Master material catalog with default units and pricing
- **Inventory** — Per-site stock levels with min-stock alerts
- **InventoryMovement** — Stock in/out/adjustment/transfer audit trail
- **Document** — File attachments (receipts, plans, photos, invoices)
- **Notification** — In-app alerts with WhatsApp integration flag
- **ActivityLog** — Event-sourced audit log with JSON metadata
- **SnagItem** — Defect/punch list tracking (Open → Verified)

## Requisition Workflow (15 States)

```
DRAFT → SUBMITTED → PRICING → VERIFICATION → BUDGET_CHECK → PENDING_APPROVAL
  → APPROVED → PO_CREATED → DISPATCHED → DELIVERED → VERIFICATION_COMPLETE
  → RECEIPTED → COMPLETE

Special: ON_HOLD (CEO pause), CANCELLED (terminal)
Rework loops: VERIFICATION ↔ PRICING, BUDGET_CHECK ↔ PRICING
```

Each transition is role-gated. For example, only a Site Manager can submit, only a PM can price, only the CEO can approve.

## Role-Based Access Control

| Role | Access Level |
|------|-------------|
| **CEO** | Full access — approve requisitions, manage budgets, all settings |
| **Project Manager** | Operations lead — price requisitions, create POs, assign drivers, manage budgets |
| **Quantity Surveyor** | Read-only oversight — all projects, budgets, reports, analytics |
| **Architect** | Project documentation — read projects, upload documents, create snag items |
| **Site Manager** | Field operations — create requisitions, verify deliveries, report discrepancies |
| **Driver / Co-Driver** | Logistics — view assigned POs, mark as collected (financials hidden by default) |
| **Subcontractor** | Minimal — read-only access to assigned projects and snag items |

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/me` | Current user profile |
| `GET/POST` | `/api/projects` | List / create projects |
| `GET/PATCH` | `/api/projects/[id]` | Get / update project |
| `GET/POST` | `/api/requisitions` | List / create requisitions |
| `GET/PATCH` | `/api/requisitions/[id]` | Get / update requisition |
| `POST` | `/api/requisitions/[id]/transition` | Workflow state transition |
| `POST` | `/api/requisitions/[id]/price` | Price requisition items |
| `GET/POST` | `/api/purchase-orders` | List / create POs |
| `GET/PATCH` | `/api/purchase-orders/[id]` | Get / update PO |
| `GET/POST` | `/api/suppliers` | List / create suppliers |
| `GET/PATCH` | `/api/suppliers/[id]` | Get / update supplier |
| `GET/POST` | `/api/sites` | List / create sites |
| `GET` | `/api/finance` | Budget summary & cash flow |
| `GET` | `/api/users` | Team member list |
| `GET` | `/api/notifications` | Unread notifications |

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Email/password authentication |
| `/register` | New user registration |
| `/dashboard` | Role-specific overview with KPIs and quick actions |
| `/projects` | Project list with status filters |
| `/projects/new` | Create new project |
| `/projects/[id]` | Project detail with sites and budget |
| `/requisitions` | Requisition list with status pipeline |
| `/requisitions/new` | Create requisition with multi-item entry |
| `/requisitions/[id]` | Detail view with workflow transitions, tabs, audit log |
| `/purchase-orders` | PO list |
| `/purchase-orders/[id]` | PO detail with driver/supplier info |
| `/suppliers` | Supplier card grid |
| `/suppliers/new` | Create supplier |
| `/suppliers/[id]` | Supplier detail with price history |
| `/logistics` | Driver-focused assignment tracking |
| `/finance` | Budget overview with health bars and payment recording |
| `/reports` | Analytics with KPIs and breakdowns |
| `/settings` | Team management and tenant settings |

## Local Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- A Supabase project (for PostgreSQL + Auth)

### Installation

```bash
git clone https://github.com/Inplacecreates/HKMTEST.git
cd HKMTEST
git checkout claude/construction-management-system-da448
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
```

### Database Setup

```bash
# Push schema to database
npx prisma db push

# Seed demo data (HKM Construction tenant, users, projects, suppliers, catalog)
npx tsx prisma/seed.ts
```

### Create Auth Users

In the [Supabase Dashboard](https://supabase.com/dashboard) → Authentication → Users, create accounts for each test user with **Auto Confirm** enabled:

| Email | Name | Role | Password |
|-------|------|------|----------|
| `ceo@hkm.co.ke` | Hassan Kimani | CEO | `hkm12345` |
| `pm@hkm.co.ke` | Mary Wanjiku | Project Manager | `hkm12345` |
| `qs@hkm.co.ke` | Peter Ochieng | Quantity Surveyor | `hkm12345` |
| `architect@hkm.co.ke` | Grace Akinyi | Architect | `hkm12345` |
| `driver@hkm.co.ke` | James Mwangi | Driver | `hkm12345` |
| `site1@hkm.co.ke` | David Omondi | Site Manager | `hkm12345` |
| `site2@hkm.co.ke` | Joseph Kipchoge | Site Manager | `hkm12345` |

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with any of the test accounts above.

## Kenya Localization

- **Currency**: KES (Kenya Shillings) — formatted as `KES 1,500,000`
- **Timezone**: Africa/Nairobi (EAT, UTC+3)
- **Date Format**: DD/MM/YYYY
- **Phone Format**: +254 (Kenya country code)

## Available Scripts

| Script | Command |
|--------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:seed` | Seed demo data |

## License

Private — HKM Construction internal use.

# Vet clinic (multi-tenant example)

A working admin for a small veterinary SaaS. Every clinic is a tenant; staff,
owners, pets, appointments, visits, and vaccinations are scoped to the active
clinic.

This example is **outside the workspace**: it installs `@dashild/*` from npm
(`0.1.0-alpha.11`), never through `workspace:*`.

## Run it

```bash
cp .env.example .env   # set BETTER_AUTH_SECRET if you change the demo
pnpm install
pnpm prisma migrate deploy
pnpm db:seed
pnpm dev
```

Open <http://localhost:3000/admin>. The database is a local SQLite file
(`prisma/dev.db`).

## Sign in

| Email | Role | Clinic |
| --- | --- | --- |
| `ana@acme.vet` | ADMIN | Clínica Acme |
| `victor@acme.vet` | VET | Clínica Acme |
| `rita@acme.vet` | RECEPTION | Clínica Acme |
| `carla@beta.vet` | VET | Clínica Beta |

Password for all: `dashild123`.

## What to try

- **Switch clinic** as Ana: the sidebar switcher lists Acme and Beta. Carla only
  sees Beta, and every list and form option follows the active clinic.
- **Roles**: Víctor sees “Mark attended” on appointments but not “Cancel”; Rita
  sees “Cancel” but not “Mark attended”; only an admin sees delete.
- **Relations**: open an owner to see their pets; open a pet for appointments,
  visits, and vaccinations.
- **Filters**: appointments by status/pet/vet, pets by species/owner.
- **Custom cell**: pets render the species with an emoji (`species-cell.tsx`).
- **Bytes**: a pet has an optional photo field (base64).

## Layout

```text
prisma/schema.prisma                     clinics, staff, owners, pets, clinical data
prisma/seed.ts                           two clinics with realistic data
src/lib/organization.ts                  visible clinics + active one
src/lib/session.ts                       tenant-aware getCurrentUser
src/dashild/organization-actions.ts      switchOrganization
src/dashild/resources/*.ts               one file per model
src/dashild/policies.ts                  tenant scope + role permissions
src/dashild/actions/index.ts             attend / cancel handlers
src/components/dashild/species-cell.tsx  custom cell
```

The step-by-step tutorial is in the docs: <https://dashild.vercel.app/examples/vet-clinic/>.

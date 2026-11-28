# Blog (single-tenant example)

A small editorial admin generated from the `blog` starter: posts, categories,
tags, comments and an editorial workflow. Authors only see their own posts and
the comments on them; admins moderate everything. It installs `@dashild/*` from
npm (`0.1.0-alpha.12`), never through `workspace:*`.

## Run it

```bash
cp .env.example .env   # set BETTER_AUTH_SECRET if you change the demo
pnpm install
pnpm prisma migrate deploy
pnpm db:seed
pnpm dev
```

Open <http://localhost:3000/admin>. SQLite database at `prisma/dev.db`.

## Sign in

| Email | Role | Password |
| --- | --- | --- |
| `ana@blog.test` | ADMIN | `dashild123` |
| `bruno@blog.test` | AUTHOR | `dashild123` |
| `carla@blog.test` | AUTHOR | `dashild123` |

## What to try

- **Posts**: filter by status, category or author; “Publish” and “Unpublish”
  change the status and set `publishedAt`. The form handles categories, m2m
  tags and a cover image (`Bytes`).
- **Author scoping**: Bruno only sees his posts; Ana sees all. Comments follow
  the posts: authors moderate their own, admins moderate everything.
- **Comments**: approve/unapprove from the row menu.
- **CSV**: export the current view and import rows that follow the form fields.
- **Staff**: an admin can change roles; authors cannot.

## Layout

```text
prisma/schema.prisma                 posts, categories, tags, comments
prisma/seed.ts                       admin, two authors, posts and comments
src/lib/session.ts                   role-aware getCurrentUser (template overwrite)
src/dashild/resources/*.ts           one file per model
src/dashild/policies.ts              author scoping + admin moderation
src/dashild/actions/index.ts         publish, unpublish, approve, unapprove
```

This is the `blog` starter: `pnpm create dashild@latest my-blog --template blog`.
The step-by-step guide is in the docs: <https://dashild.vercel.app/examples/blog/>.

# Seeding

A seed inserts demo data so the panel is not empty. Keep it **re-runnable** and
create users through Better Auth so passwords and `Account` rows are correct.

## Shape

```ts title="prisma/seed.ts"
import "dotenv/config";

import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

const PASSWORD = "dashild123";

async function reset() {
  // Children first, then users and any parent rows.
  await prisma.post.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await reset();

  const created = await auth.api.signUpEmail({
    body: {
      email: "ana@example.com",
      password: PASSWORD,
      name: "Ana Torres",
    },
  });

  if (!created.user) throw new Error("Better Auth did not create the user");

  await prisma.post.create({
    data: { title: "Hello", authorId: created.user.id },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
```

## Rules

- `import "dotenv/config"` is required when the seed runs with `tsx` and reads
  `DATABASE_URL`.
- Wrap the work in `main()`: most generated apps are CommonJS, so top-level
  `await` fails.
- `signUpEmail` throws when the email already exists. Re-runnable seeds delete
  their demo users first (or use a unique email).
- Delete in dependency order (comments/children before users).
- Passwords must meet the Better Auth minimum (8 characters by default).

## Scripts

Add a short script:

```json title="package.json"
"db:seed": "tsx prisma/seed.ts"
```

To let Prisma run it too (`prisma db seed`, after `migrate reset`), declare the
hook in `prisma.config.ts`:

```ts title="prisma.config.ts"
migrations: {
  seed: "tsx prisma/seed.ts",
},
```

## Verify

```bash
pnpm db:seed
pnpm db:seed   # must be idempotent
```

Then sign in with the demo user and confirm the rows appear in the panel.

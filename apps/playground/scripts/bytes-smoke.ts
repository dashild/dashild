import "dotenv/config";

import { prisma } from "../lib/prisma";
import { runtime } from "../src/dashild/runtime";
import { userResource } from "../src/dashild/resources/user";

const ana = await prisma.user.findUnique({
  where: { email: "ana@acme.test" },
  select: { id: true, name: true, email: true, organizationId: true, role: true },
});
if (!ana) throw new Error("Missing demo user. Run db:seed.");

const user = {
  id: ana.id,
  name: ana.name,
  email: ana.email,
  organizationId: ana.organizationId,
  roles: [ana.role],
};

const base64 = "aGVsbG8gZGFzaGlsZA==";
const saved = await runtime.save(
  { slug: "users", id: ana.id, values: { avatar: base64 } },
  user,
);
const row = await prisma.user.findUnique({
  where: { id: ana.id },
  select: { avatar: true },
});
const stored = row?.avatar
  ? Buffer.from(row.avatar).toString("base64")
  : null;

console.log("saved:", saved);
console.log("avatar:", stored);
if (stored !== base64) throw new Error("Bytes round-trip failed.");

await prisma.user.update({ where: { id: ana.id }, data: { avatar: null } });
console.log("avatar cleared");
await prisma.$disconnect();

import "dotenv/config";

import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

const PASSWORD = "dashild123";

const now = new Date();
const days = (offset: number, hour = 10) => {
  const date = new Date(now.getTime() + offset * 86_400_000);
  date.setHours(hour, 0, 0, 0);
  return date;
};

async function reset() {
  await prisma.vaccination.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.pet.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

async function createUser(input: {
  email: string;
  name: string;
  role: "ADMIN" | "VET" | "RECEPTION";
  organizationId: string;
}) {
  const created = await auth.api.signUpEmail({
    body: {
      email: input.email,
      password: PASSWORD,
      name: input.name,
    },
  });

  if (!created.user) {
    throw new Error(`Better Auth did not create ${input.email}`);
  }

  await prisma.user.update({
    where: { id: created.user.id },
    data: { role: input.role, organizationId: input.organizationId },
  });

  return created.user;
}

async function main() {
  await reset();

  const acme = await prisma.organization.create({
    data: { name: "Clínica Acme" },
  });
  const beta = await prisma.organization.create({
    data: { name: "Clínica Beta" },
  });

  const ana = await createUser({
    email: "ana@acme.vet",
    name: "Ana Torres",
    role: "ADMIN",
    organizationId: acme.id,
  });
  const victor = await createUser({
    email: "victor@acme.vet",
    name: "Víctor Salas",
    role: "VET",
    organizationId: acme.id,
  });
  await createUser({
    email: "rita@acme.vet",
    name: "Rita Gómez",
    role: "RECEPTION",
    organizationId: acme.id,
  });
  const carla = await createUser({
    email: "carla@beta.vet",
    name: "Carla Ruiz",
    role: "VET",
    organizationId: beta.id,
  });

  const lucia = await prisma.owner.create({
    data: {
      name: "Lucía Fernández",
      email: "lucia@example.com",
      phone: "+34 600 111 222",
      organizationId: acme.id,
    },
  });
  const marcos = await prisma.owner.create({
    data: {
      name: "Marcos Gil",
      email: "marcos@example.com",
      phone: "+34 600 333 444",
      organizationId: acme.id,
    },
  });
  const hugo = await prisma.owner.create({
    data: {
      name: "Hugo Santos",
      email: "hugo@example.com",
      phone: "+34 600 555 666",
      organizationId: beta.id,
    },
  });

  const nala = await prisma.pet.create({
    data: {
      name: "Nala",
      species: "DOG",
      breed: "Border collie",
      birthDate: days(-1_100),
      ownerId: lucia.id,
      organizationId: acme.id,
    },
  });
  const milo = await prisma.pet.create({
    data: {
      name: "Milo",
      species: "CAT",
      breed: "Europeo",
      birthDate: days(-800),
      ownerId: lucia.id,
      organizationId: acme.id,
    },
  });
  const kira = await prisma.pet.create({
    data: {
      name: "Kira",
      species: "RABBIT",
      breed: "Enano",
      birthDate: days(-400),
      ownerId: marcos.id,
      organizationId: acme.id,
    },
  });
  const toby = await prisma.pet.create({
    data: {
      name: "Toby",
      species: "DOG",
      breed: "Mestizo",
      birthDate: days(-1_500),
      ownerId: hugo.id,
      organizationId: beta.id,
    },
  });

  await prisma.appointment.createMany({
    data: [
      {
        startsAt: days(1, 10),
        reason: "Revisión anual",
        status: "SCHEDULED",
        petId: nala.id,
        vetId: victor.id,
        organizationId: acme.id,
      },
      {
        startsAt: days(-1, 12),
        reason: "Cojera leve",
        status: "ATTENDED",
        petId: milo.id,
        vetId: victor.id,
        organizationId: acme.id,
      },
      {
        startsAt: days(7, 9),
        reason: "Control dental",
        status: "SCHEDULED",
        petId: kira.id,
        vetId: ana.id,
        organizationId: acme.id,
      },
      {
        startsAt: days(2, 16),
        reason: "Vacunación",
        status: "SCHEDULED",
        petId: toby.id,
        vetId: carla.id,
        organizationId: beta.id,
      },
    ],
  });

  await prisma.visit.createMany({
    data: [
      {
        visitedAt: days(-1, 12),
        reason: "Cojera leve",
        diagnosis: "Esguince leve en la pata trasera",
        notes: "Reposo 7 días. Revisar si no mejora.",
        petId: milo.id,
        vetId: victor.id,
        organizationId: acme.id,
      },
      {
        visitedAt: days(-30, 11),
        reason: "Vacunación",
        diagnosis: "Sin incidencias",
        notes: "Refuerzo de rabia administrado.",
        petId: nala.id,
        vetId: victor.id,
        organizationId: acme.id,
      },
    ],
  });

  await prisma.vaccination.createMany({
    data: [
      {
        name: "Rabia",
        appliedAt: days(-365),
        nextDueAt: days(30),
        petId: nala.id,
        organizationId: acme.id,
      },
      {
        name: "Leucemia felina",
        appliedAt: days(-200),
        nextDueAt: days(165),
        petId: milo.id,
        organizationId: acme.id,
      },
      {
        name: "Polivalente",
        appliedAt: days(-120),
        nextDueAt: days(245),
        petId: toby.id,
        organizationId: beta.id,
      },
    ],
  });

  const [organizations, users, owners, pets, appointments] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.owner.count(),
    prisma.pet.count(),
    prisma.appointment.count(),
  ]);

  console.log(
    "seed:",
    organizations,
    "clinics,",
    users,
    "staff,",
    owners,
    "owners,",
    pets,
    "pets,",
    appointments,
    "appointments",
  );
  console.log("admin: ana@acme.vet / " + PASSWORD);
  console.log("vet: victor@acme.vet / " + PASSWORD);
  console.log("reception: rita@acme.vet / " + PASSWORD);
  console.log("other clinic: carla@beta.vet / " + PASSWORD);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

import type { ActionHandler, CurrentUser } from "@dashild/core";

type AppointmentStatus = "ATTENDED" | "CANCELLED";

interface ScopedAppointmentClient {
  appointment: {
    update(args: {
      where: { id: string };
      data: { status: AppointmentStatus };
    }): Promise<unknown>;
  };
}

async function setStatus(
  context: Parameters<ActionHandler<CurrentUser>>[0],
  status: AppointmentStatus,
) {
  if (!context.id) {
    return { ok: false, message: "Missing appointment id." };
  }

  const db = context.db as ScopedAppointmentClient | undefined;
  if (!db) {
    return { ok: false, message: "Database client unavailable." };
  }

  await db.appointment.update({
    where: { id: context.id },
    data: { status },
  });

  return {
    ok: true,
    message:
      status === "ATTENDED"
        ? "Appointment marked as attended."
        : "Appointment cancelled.",
  };
}

/**
 * Handlers run on the server with the scoped Prisma client, so an appointment
 * from another clinic is not reachable even if the id is guessed.
 */
export const resourceActions: Record<
  string,
  Record<string, ActionHandler<CurrentUser>>
> = {
  Appointment: {
    attend: (context) => setStatus(context, "ATTENDED"),
    cancelAppointment: (context) => setStatus(context, "CANCELLED"),
  },
};

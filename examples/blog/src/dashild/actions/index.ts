import type { ActionHandler, CurrentUser } from "@dashild/core";

type PostStatus = "PUBLISHED" | "DRAFT";

interface ScopedClient {
  post: {
    update(args: {
      where: { id: string };
      data: { status: PostStatus; publishedAt: Date | null };
    }): Promise<unknown>;
  };
  comment: {
    update(args: {
      where: { id: string };
      data: { approved: boolean };
    }): Promise<unknown>;
  };
}

function dbFrom(context: Parameters<ActionHandler<CurrentUser>>[0]) {
  return context.db as ScopedClient | undefined;
}

async function setPostStatus(
  context: Parameters<ActionHandler<CurrentUser>>[0],
  status: PostStatus,
) {
  if (!context.id) return { ok: false, message: "Missing post id." };
  const db = dbFrom(context);
  if (!db) return { ok: false, message: "Database client unavailable." };

  await db.post.update({
    where: { id: context.id },
    data: {
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
  });

  return {
    ok: true,
    message: status === "PUBLISHED" ? "Post published." : "Post unpublished.",
  };
}

async function setCommentApproved(
  context: Parameters<ActionHandler<CurrentUser>>[0],
  approved: boolean,
) {
  if (!context.id) return { ok: false, message: "Missing comment id." };
  const db = dbFrom(context);
  if (!db) return { ok: false, message: "Database client unavailable." };

  await db.comment.update({
    where: { id: context.id },
    data: { approved },
  });

  return {
    ok: true,
    message: approved ? "Comment approved." : "Comment unapproved.",
  };
}

/**
 * Handlers run with the scoped Prisma client: an author cannot touch another
 * author's posts or comments even with a guessed id.
 */
export const resourceActions: Record<
  string,
  Record<string, ActionHandler<CurrentUser>>
> = {
  Post: {
    publish: (context) => setPostStatus(context, "PUBLISHED"),
    unpublish: (context) => setPostStatus(context, "DRAFT"),
  },
  Comment: {
    approve: (context) => setCommentApproved(context, true),
    unapprove: (context) => setCommentApproved(context, false),
  },
};

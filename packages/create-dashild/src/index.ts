#!/usr/bin/env node
/**
 * create-dashild — `pnpm create dashild@latest my-app`
 *
 * TODO(phase 3): delegate to the same core as `dashild init`, not to a parallel
 * architecture. Phase 3 per vision.md §14.
 */

const [, , target] = process.argv;

process.stdout.write(
  target
    ? `create-dashild: not implemented yet (phase 3). You asked for "${target}".\n`
    : "create-dashild: not implemented yet (phase 3).\n",
);
process.exit(1);

/**
 * Dashild mark: cube in `currentColor` with the D cut out, so the letter takes
 * whatever background is behind it. Used as the default panel/tenant logo; the
 * theme's text color drives the cube.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M355.273 103.001a100 100 0 0 1 67.678-26.381h445.563c55.228 0 100 44.772 100 100v378.819a100 100 0 0 1-32.323 73.619L644.727 896.999a100 100 0 0 1-67.678 26.381H131.486c-55.228 0-100-44.772-100-100V444.561a100 100 0 0 1 32.323-73.619Z M454.307 600.105v-426h147q103.8 0 159.6 55.5t55.8 158.1q0 102-54.9 157.2t-156.9 55.2Zm91.2-76.8h55.8q61.8 0 91.5-33.3t29.7-102.9-29.7-102.9-91.5-33.3h-55.8Z" />
    </svg>
  );
}

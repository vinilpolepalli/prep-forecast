import type { Config } from "tailwindcss";

// Accent rationale: deep burnt orange #c2410c (hover #9a3412) is kitchen-ticket warmth for a back-of-house
// tool. Deliberately outside the indigo/violet band, not a cream/serif/sage "tasteful default", and
// distinct from sibling demos (navy / teal / bronze / crimson). Ground is near-white, separated by hairlines.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: "#c2410c", hover: "#9a3412", soft: "#fff1ea" },
        ink: { DEFAULT: "#1c1917", mute: "#57534e", faint: "#78716c" },
        line: "#e7e5e4",
        ground: "#fcfcfb",
      },
      borderRadius: { btn: "8px", card: "10px" },
    },
  },
};
export default config;

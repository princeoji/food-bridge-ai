import { useId } from "react";

export function FoodSharingIllustration() {
  const titleId = useId();
  return (
    <svg
      viewBox="0 0 640 430"
      role="img"
      aria-labelledby={titleId}
      className="w-full max-h-60 md:max-h-72 rounded-xl bg-background shadow-[0_8px_20px_rgba(16,24,40,.08)]"
    >
      <title id={titleId}>A food donor and an NGO partner sharing a box of fresh food</title>
      <rect width="640" height="430" rx="16" fill="var(--secondary)" />
      <path d="M110 338V182a207 207 0 0 1 414 0v156Z" fill="var(--accent)" />
      <ellipse cx="320" cy="366" rx="252" ry="20" fill="var(--foreground)" opacity=".06" />
      {/* Donor, in a red apron. */}
      <path d="M131 348 144 210q10-46 66-48 52 3 66 46l12 140Z" fill="var(--background)" />
      <path
        d="m169 180 13 38h45l17-38 10 17-14 38 19 113H153l21-113-16-38Z"
        fill="var(--primary)"
      />
      <path
        d="M190 161v28q20 17 38-1v-27Z"
        fill="color-mix(in oklch, var(--primary) 20%, var(--secondary))"
      />
      <ellipse
        cx="209"
        cy="130"
        rx="39"
        ry="45"
        fill="color-mix(in oklch, var(--primary) 20%, var(--secondary))"
      />
      <path d="M170 130q-10-51 38-54 48-2 42 54l-12-29q-37 17-62 5Z" fill="var(--foreground)" />
      <path
        d="M195 143q14 12 28-1"
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="194" cy="127" r="2.5" fill="var(--foreground)" />
      <circle cx="224" cy="127" r="2.5" fill="var(--foreground)" />
      <path
        d="m154 211-17 65q-3 11 10 17l107 26 10-22-85-30 11-43Z"
        fill="color-mix(in oklch, var(--primary) 20%, var(--secondary))"
      />
      <path
        d="m252 211 28 48 47 9-5 23-67-8-36-54Z"
        fill="color-mix(in oklch, var(--primary) 20%, var(--secondary))"
      />
      <path d="M185 262h43v34q-21 11-43 0Z" fill="var(--background)" opacity=".24" />
      {/* NGO partner, receiving the donation. */}
      <path d="M377 348 386 213q6-42 56-44 48 1 60 45l17 134Z" fill="var(--foreground)" />
      <path
        d="M423 163v25q17 17 34-1v-25Z"
        fill="color-mix(in oklch, var(--primary) 35%, var(--secondary))"
      />
      <ellipse
        cx="441"
        cy="133"
        rx="37"
        ry="44"
        fill="color-mix(in oklch, var(--primary) 35%, var(--secondary))"
      />
      <path
        d="M404 143q-19-61 31-65 48-3 47 56l-10 25-5-48q-32 8-45-9-3 28-18 41Z"
        fill="var(--foreground)"
      />
      <path
        d="M427 146q13 10 25-1"
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="426" cy="131" r="2.5" fill="var(--foreground)" />
      <circle cx="451" cy="130" r="2.5" fill="var(--foreground)" />
      <path
        d="m394 215-40 45-43 12 7 23 62-14 45-45Z"
        fill="color-mix(in oklch, var(--primary) 35%, var(--secondary))"
      />
      <path
        d="m485 216 22 62q3 12-10 18l-104 22-8-22 83-29-16-41Z"
        fill="color-mix(in oklch, var(--primary) 35%, var(--secondary))"
      />
      <path d="M436 224c-12-19-35-2-1 21 35-23 12-40 1-21Z" fill="var(--background)" />
      {/* Fresh produce and a reusable food box. */}
      <path d="M281 251c-30-67-12-96 8-82 17 13 23 51 27 82" fill="var(--chart-5)" />
      <path
        d="m278 188 12 4m-8 12 13 4m-9 12 13 4"
        stroke="var(--secondary)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="m335 249 6-56m-1 18q-34-5-30-29 30 2 30 29m1-6q27-2 30-26-27-2-30 26m-3 26q-27 2-32-20 26-3 32 20"
        fill="var(--chart-2)"
        stroke="var(--chart-2)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="365" cy="242" r="20" fill="var(--primary)" />
      <path
        d="m360 224 6-8 5 8"
        stroke="var(--chart-2)"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <rect
        x="250"
        y="247"
        width="145"
        height="80"
        rx="8"
        fill="var(--background)"
        stroke="var(--border)"
        strokeWidth="2"
      />
      <path d="M250 265h145" stroke="var(--border)" strokeWidth="2" />
      <path d="M321 282c-12-17-32-1 0 20 33-21 12-37 0-20Z" fill="var(--primary)" />
      {/* A growing plant and shared-heart motif. */}
      <path
        d="M83 355v-72m0 38q-35-4-32-34 32 0 32 34m0-20q30-4 31-32-30 0-31 32"
        fill="var(--chart-2)"
        stroke="var(--chart-2)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="m62 343 6 29h32l6-29Z" fill="var(--primary)" />
      <circle cx="329" cy="100" r="30" fill="var(--background)" />
      <path
        d="M329 92c-12-18-33-1 0 21 33-22 12-39 0-21Z"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="m541 164 9 5m-11 10 9-3m-419-76-8-6m17-4-1-9"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".7"
      />
      <path d="M137 353h383" stroke="var(--border)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

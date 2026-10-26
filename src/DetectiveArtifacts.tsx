import { useId } from "react";

export type DetectiveMode = "holmes" | "conan";

export function Github({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .8a11.4 11.4 0 0 0-3.6 22.2c.57.1.78-.25.78-.55v-2.1c-3.18.7-3.85-1.35-3.85-1.35-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.69.08-.69 1.15.08 1.76 1.18 1.76 1.18 1.03 1.75 2.7 1.25 3.36.95.1-.74.4-1.25.73-1.54-2.54-.29-5.21-1.27-5.21-5.65 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.02 0 0 .97-.31 3.14 1.17A10.9 10.9 0 0 1 12 6.28c.97 0 1.95.13 2.87.39 2.17-1.48 3.13-1.17 3.13-1.17.63 1.57.24 2.73.12 3.02.73.8 1.17 1.82 1.17 3.07 0 4.39-2.68 5.36-5.23 5.64.41.36.78 1.06.78 2.14v3.08c0 .3.2.66.79.55A11.4 11.4 0 0 0 12 .8Z" />
    </svg>
  );
}

/** Original object illustrations: recognizable keepsakes, drawn for this site. */
export function DetectiveCrest({
  mode,
  className = "",
}: {
  mode: DetectiveMode;
  className?: string;
}) {
  return (
    <svg
      className={`detective-crest ${className}`}
      viewBox="0 0 100 90"
      fill="none"
      aria-hidden="true"
    >
      {mode === "holmes" ? (
        <>
          <path
            d="M20 37Q20 12 48 12Q75 12 78 37L88 43Q65 49 17 44L10 40Z"
            fill="currentColor"
            fillOpacity=".1"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M47 12Q42 25 42 43M23 32L76 34M26 22L72 27M30 40L34 16M61 15L63 43"
            stroke="currentColor"
            strokeOpacity=".5"
          />
          <path
            d="M28 46L28 58Q33 64 41 64L41 72L23 84H76L57 69V62L65 57L62 50M49 64L68 64Q72 64 72 69Q72 78 81 78Q92 78 92 65L82 64L81 71Q79 72 78 67Q76 59 66 59"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            className="pipe-smoke"
            d="M86 58C94 49 77 48 86 36"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeOpacity=".45"
          />
        </>
      ) : (
        <>
          <path
            d="M13 33L20 17L38 20L52 10L59 20L78 14L84 34"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <circle
            cx="30"
            cy="43"
            r="17"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="71"
            cy="43"
            r="17"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M47 40Q51 36 54 40M13 40L5 34M88 40L96 33M33 48L39 38M74 48L80 38"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M45 74L23 62V86L45 80L52 76L59 81L81 86V62L59 72Z"
            fill="#a5473d"
            fillOpacity=".8"
            stroke="#d2856e"
            strokeWidth="1"
          />
          <path d="M46 70L57 70L59 81L45 81Z" fill="#8c302b" />
        </>
      )}
    </svg>
  );
}

export function PocketWatch({ className = "" }: { className?: string }) {
  const uid = useId().replaceAll(":", "");
  return (
    <svg
      className={`pocket-watch ${className}`}
      width="240"
      height="285"
      viewBox="0 0 240 285"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`watch-${uid}`}>
          <stop stopColor="#323834" />
          <stop offset=".8" stopColor="#151c1c" />
          <stop offset="1" stopColor="#c8a573" />
        </radialGradient>
      </defs>
      <path
        d="M103 24V10H137V24M109 10V4H131V10M100 29C88 8 153 6 140 29"
        stroke="#b79a6a"
        strokeWidth="2"
      />
      <circle
        cx="120"
        cy="148"
        r="109"
        fill={`url(#watch-${uid})`}
        stroke="#c5a674"
        strokeWidth="2"
      />
      <circle cx="120" cy="148" r="99" stroke="#bda577" strokeOpacity=".55" />
      <circle
        cx="120"
        cy="148"
        r="89"
        stroke="#bda577"
        strokeOpacity=".3"
        strokeDasharray="1 5"
      />
      {Array.from({ length: 60 }, (_, i) => (
        <path
          key={i}
          d={`M120 ${i % 5 === 0 ? 57 : 61}V${i % 5 === 0 ? 68 : 65}`}
          transform={`rotate(${i * 6} 120 148)`}
          stroke="#cdb588"
          strokeOpacity={i % 5 === 0 ? ".8" : ".35"}
          strokeWidth={i % 5 === 0 ? "1.5" : "1"}
        />
      ))}
      <g
        fill="#c6b18b"
        fontFamily="Georgia,serif"
        fontSize="17"
        textAnchor="middle"
      >
        <text x="120" y="83">
          XII
        </text>
        <text x="192" y="153">
          III
        </text>
        <text x="120" y="226">
          VI
        </text>
        <text x="48" y="153">
          IX
        </text>
      </g>
      <text
        x="120"
        y="118"
        fill="#9c8a69"
        fontSize="6"
        textAnchor="middle"
        letterSpacing="2"
      >
        BAKER STREET
      </text>
      <circle cx="120" cy="183" r="18" stroke="#8b7d60" strokeOpacity=".5" />
      <path d="M120 183L128 174" stroke="#a78c63" />
      <path
        d="M120 148L88 113M120 148L165 126"
        stroke="#dfceaa"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g className="watch-second">
        <path d="M120 168V80" stroke="#a94c3e" strokeWidth="1.3" />
        <circle cx="120" cy="148" r="4" fill="#c2aa7b" />
      </g>
      <path d="M93 262H147M107 269H134" stroke="#c5a674" strokeOpacity=".4" />
    </svg>
  );
}

export function ArtifactPlate({ mode }: { mode: DetectiveMode }) {
  const uid = useId().replaceAll(":", "");
  return (
    <svg
      className={`artifact-plate plate-${mode}`}
      viewBox="0 0 520 330"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`lens-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#80bdce" stopOpacity=".25" />
          <stop offset=".45" stopColor="#1e3949" stopOpacity=".05" />
          <stop offset="1" stopColor="#9cd9e7" stopOpacity=".4" />
        </linearGradient>
        <pattern
          id={`grid-${uid}`}
          width="26"
          height="26"
          patternUnits="userSpaceOnUse"
        >
          <path d="M26 0H0V26" stroke="currentColor" strokeOpacity=".06" />
        </pattern>
        <clipPath id={`glasses-${uid}`}>
          <circle cx="175" cy="135" r="59" />
          <circle cx="321" cy="135" r="59" />
        </clipPath>
      </defs>
      <rect width="520" height="330" fill={`url(#grid-${uid})`} />
      <g stroke="currentColor" strokeOpacity=".2">
        <path d="M24 24H84M24 24V63M496 24H435M496 24V63M24 306V268M24 306H84M496 306H435M496 306V268" />
        <path d="M260 0V330M0 165H520" strokeDasharray="3 8" />
      </g>
      {mode === "holmes" ? (
        <>
          <g className="hat-study" stroke="currentColor" strokeLinejoin="round">
            <path
              d="M77 134C76 67 126 45 186 51C234 56 251 84 260 133L294 151Q179 179 45 148Z"
              fill="#b5a078"
              fillOpacity=".13"
              strokeWidth="2"
            />
            <path
              d="M181 51C161 79 158 118 157 157M82 109L249 118M102 76L228 88M111 61L123 159M218 65L215 158"
              strokeOpacity=".45"
            />
            <path
              d="M45 148Q173 189 294 151M85 143Q167 130 256 145"
              strokeWidth="1.3"
            />
          </g>
          <g
            className="pipe-study"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          >
            <path
              d="M116 234C168 221 186 260 231 254C249 252 258 235 258 218L235 217Q238 239 221 238C185 238 170 205 117 219Z"
              fill="#876347"
              fillOpacity=".3"
            />
            <ellipse cx="247" cy="217" rx="12" ry="4" />
            <path
              className="pipe-smoke"
              d="M247 205C228 181 268 180 246 159M260 201C276 182 254 174 271 156"
              strokeOpacity=".35"
              strokeWidth="1"
            />
          </g>
          <g transform="translate(315 75) scale(.68)">
            <PocketWatch />
          </g>
          <g stroke="currentColor" strokeOpacity=".5">
            <path d="M84 82L45 62H22M215 249L251 286H290M373 114L406 68H482" />
            <circle cx="84" cy="82" r="3" />
            <circle cx="215" cy="249" r="3" />
          </g>
          <g fill="currentColor" fontSize="7" letterSpacing="1.3">
            <text x="23" y="53">
              01 / DEERSTALKER
            </text>
            <text x="252" y="299">
              02 / THE PIPE
            </text>
            <text x="407" y="59">
              03 / TIMEKEEPER
            </text>
          </g>
        </>
      ) : (
        <>
          <g className="glasses-study" stroke="currentColor" strokeWidth="2.4">
            <circle cx="175" cy="135" r="59" fill={`url(#lens-${uid})`} />
            <circle cx="321" cy="135" r="59" fill={`url(#lens-${uid})`} />
            <circle
              cx="175"
              cy="135"
              r="52"
              strokeOpacity=".25"
              strokeWidth=".8"
            />
            <circle
              cx="321"
              cy="135"
              r="52"
              strokeOpacity=".25"
              strokeWidth=".8"
            />
            <path d="M234 128Q248 113 262 128M116 123L76 101L42 106M380 123L421 100L459 105" />
            <path
              d="M143 157L182 92M159 161L198 96M289 157L328 92M305 161L344 96"
              strokeOpacity=".14"
              strokeWidth="8"
            />
          </g>
          <g clipPath={`url(#glasses-${uid})`}>
            <rect
              className="lens-scan"
              x="90"
              y="68"
              width="310"
              height="4"
              fill="#96d6e7"
              fillOpacity=".4"
            />
          </g>
          <g className="bow-study">
            <path
              d="M213 238L140 211Q126 239 140 275L212 254L234 245L257 255L330 276Q343 242 330 212L257 238Z"
              fill="#973d37"
              stroke="#c47260"
              strokeWidth="1.5"
            />
            <path
              d="M210 233Q234 240 260 232L257 258Q234 251 213 260Z"
              fill="#692e2c"
              stroke="#b36552"
            />
            <path
              d="M152 227L205 242M151 259L205 248M320 227L267 242M319 260L268 248"
              stroke="#cf8770"
              strokeOpacity=".5"
            />
          </g>
          <g
            stroke="currentColor"
            strokeWidth="1.4"
            transform="translate(410 222)"
          >
            <rect x="-12" y="-40" width="24" height="18" />
            <rect x="-12" y="22" width="24" height="40" />
            <circle r="25" fill="#112630" />
            <circle r="20" strokeOpacity=".4" />
            <path className="gadget-watch-hand" d="M0 0L0 -15M0 0L12 5" />
            <circle r="2" fill="currentColor" />
            <path d="M28 -4V5" strokeWidth="3" />
          </g>
          <g stroke="currentColor" strokeOpacity=".5">
            <path d="M137 92L100 47H26M300 266L336 298H383M438 226L465 205H500" />
            <circle cx="137" cy="92" r="3" />
          </g>
          <g fill="currentColor" fontSize="7" letterSpacing="1.3">
            <text x="26" y="37">
              01 / TRACKING GLASSES
            </text>
            <text x="336" y="312">
              02 / RED BOW TIE
            </text>
            <text x="459" y="195">
              03 / WATCH
            </text>
          </g>
        </>
      )}
    </svg>
  );
}

export function ThreadMap({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`thread-map ${className}`}
      viewBox="0 0 1000 500"
      preserveAspectRatio="none"
      aria-hidden="true"
      fill="none"
    >
      <path
        className="thread-secondary"
        d="M30 420L110 70L520 145L930 80L760 442L480 340L110 70M520 145L480 340L930 80M30 420L480 340"
        stroke="currentColor"
      />
      <path
        className="thread-primary"
        d="M150 130L495 360L838 140L150 130L838 360L495 130L150 360"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      {[
        [150, 130],
        [495, 360],
        [838, 140],
        [838, 360],
        [495, 130],
        [150, 360],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="5" fill="currentColor" />
          <circle
            cx={x}
            cy={y}
            r="12"
            stroke="currentColor"
            strokeOpacity=".3"
          />
        </g>
      ))}
    </svg>
  );
}

export function InspirationSignature() {
  return (
    <div className="inspiration-signature">
      <a href="#/about">
        <DetectiveCrest mode="holmes" />
        <span>
          SHERLOCK HOLMES<small>贝克街的观察力</small>
        </span>
      </a>
      <i>×</i>
      <a href="#/about">
        <DetectiveCrest mode="conan" />
        <span>
          DETECTIVE CONAN<small>米花町的好奇心</small>
        </span>
      </a>
    </div>
  );
}

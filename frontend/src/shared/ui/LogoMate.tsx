/* Logo: mate con bombilla y sombrero de gaucho apoyado */
export function LogoMate({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Logo de Nexo Ñandé">
      <path
        d="M30 30 L41 7 L46 5"
        fill="none"
        stroke="#FCBF49"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13 33 C11 46 18 58 28 58 C38 58 45 46 43 33 Z" fill="#077937" />
      <path
        d="M18 38 C17 45 20 51 24 54"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.35"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="11.5" y="28" width="33" height="6" rx="3" fill="#FCBF49" />
      <ellipse cx="28" cy="28" rx="13" ry="2.6" fill="#05602B" />
      <g transform="translate(49 54) rotate(-14)">
        <ellipse cx="0" cy="0" rx="13" ry="3.4" fill="#05602B" stroke="#FFFFFF" strokeWidth="1.5" />
        <path
          d="M-7 -1 L-6 -10 Q0 -12.5 6 -10 L7 -1 Z"
          fill="#05602B"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <rect x="-6.6" y="-4.6" width="13.2" height="2.6" fill="#FCBF49" />
      </g>
    </svg>
  )
}

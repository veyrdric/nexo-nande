import { LogoMate } from './LogoMate.tsx'

interface BrandProps {
  size?: 'md' | 'lg' | 'hero'
}

export function Brand({ size = 'md' }: BrandProps) {
  if (size === 'hero') {
    return (
      <div className="flex items-center gap-4">
        <LogoMate className="h-16 w-16 shrink-0 drop-shadow-sm transition-all duration-300 ease-in-out hover:-rotate-6 hover:scale-105 xl:h-20 xl:w-20" />
        <div>
          <span className="block text-4xl font-extrabold leading-none tracking-tighter text-gray-900 xl:text-5xl">
            Nexo{' '}
            <span className="relative inline-block text-verde">
              Ñandé
              <span
                aria-hidden
                className="absolute -bottom-1.5 left-0 -z-10 h-4 w-full -rotate-1 rounded-full bg-amarillo/70"
              />
            </span>
          </span>
          <span className="mt-2.5 block text-xs font-bold uppercase tracking-[0.1em] text-gray-600 xl:text-sm">
            Red de Facilitadores Solidarios
          </span>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center rounded-2xl bg-white shadow-sm ${
          size === 'lg' ? 'h-14 w-14' : 'h-11 w-11'
        }`}
      >
        <LogoMate className={size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'} />
      </div>
      <span
        className={`font-extrabold tracking-tight text-gray-900 ${size === 'lg' ? 'text-2xl' : 'text-xl'}`}
      >
        Nexo Ñandé
      </span>
    </div>
  )
}

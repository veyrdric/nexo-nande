import type { InputHTMLAttributes } from 'react'
import { EASE } from './styles.ts'

type FieldProps = { label: string } & InputHTMLAttributes<HTMLInputElement>

export function Field({ label, ...props }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <input
        {...props}
        className={`${EASE} rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base leading-6 text-gray-800 placeholder:text-gray-400 hover:border-celeste/60 focus:border-celeste focus:bg-white focus:outline-none focus:ring-4 focus:ring-celeste/20`}
      />
    </label>
  )
}

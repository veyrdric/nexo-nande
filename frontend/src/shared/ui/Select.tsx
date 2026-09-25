import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, type LucideIcon } from 'lucide-react'
import { EASE, FOCUS } from './styles.ts'

/* Select con la API y los estilos de Shadcn UI, sobre Radix */
interface SelectProps {
  label: string
  placeholder: string
  value: string
  onValueChange: (value: string) => void
  options: readonly string[]
  icon: LucideIcon
}

export function Select({ label, placeholder, value, onValueChange, options, icon: Icon }: SelectProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
        <SelectPrimitive.Trigger
          aria-label={label}
          className={`${EASE} ${FOCUS} flex h-12 w-full items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-slate-50 px-4 text-left text-sm font-medium text-gray-800 hover:border-celeste/60 hover:bg-white data-[placeholder]:text-gray-400 data-[state=open]:border-celeste data-[state=open]:bg-white`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-celeste" />
            <span className="truncate">
              <SelectPrimitive.Value placeholder={placeholder} />
            </span>
          </span>
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={8}
            className="data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 z-50 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl shadow-slate-900/10"
          >
            <SelectPrimitive.Viewport>
              {options.map((op) => (
                <SelectPrimitive.Item
                  key={op}
                  value={op}
                  className={`${EASE} relative flex cursor-pointer select-none items-center rounded-xl py-2.5 pl-3.5 pr-9 text-sm font-medium text-gray-700 outline-none data-[highlighted]:bg-celeste/10 data-[highlighted]:text-gray-900 data-[state=checked]:font-semibold`}
                >
                  <SelectPrimitive.ItemText>{op}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-3">
                    <Check className="h-4 w-4 text-verde" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  )
}

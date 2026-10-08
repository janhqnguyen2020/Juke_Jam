import type { ReactNode } from "react"

/** Section card used across the home page: light cream, thin border, rounded, no heavy shadow. */
export function Panel({
  title,
  icon,
  action,
  children,
  className = "",
  id,
}: {
  title?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={`rounded-2xl border border-jj-border bg-jj-paper p-[24px] min-w-[0px] ${className}`}>
      {title && (
        <header className="mb-[20px] flex items-center justify-between gap-[12px]">
          <h2 className="flex min-w-[0px] items-center gap-[8px] text-[24px] font-[700] text-jj-text">
            {icon}
            <span className="truncate">{title}</span>
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

/** Small rounded tag. `strong` = filled burgundy, otherwise outlined. */
export function Pill({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-[12px] py-[2px] text-[14px] font-[600] capitalize ${
        strong ? "border-jj-primary bg-jj-primary text-jj-paper" : "border-jj-border bg-jj-cream/60 text-jj-text"
      }`}
    >
      {children}
    </span>
  )
}

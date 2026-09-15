export default function Badge({ children, color = 'red' }) {
  const colors = {
    red:   'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400',
    green: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    gray:  'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  )
}
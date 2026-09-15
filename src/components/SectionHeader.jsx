export default function SectionHeader({ eyebrow, title, subtitle, center = false }) {
  return (
    <div className={`mb-10 ${center ? 'text-center mx-auto' : ''}`}>

      {/* Eyebrow */}
      {eyebrow && (
        <div className={`flex items-center gap-2 mb-3 ${center ? 'justify-center' : ''}`}>
          {/* Red accent bar — only shown when left-aligned */}
          {!center && (
            <span className="w-1 h-4 rounded-full bg-[#D0021B] flex-shrink-0" />
          )}
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-white dark:bg-[#3d0008]/50 text-[#D0021B] dark:text-[#f87171] text-xl font-bold uppercase tracking-[0.12em]">
            {eyebrow}
          </span>
        </div>
      )}

      {/* Title */}
      <h2
        className={`text-3xl sm:text-4xl font-bold leading-tight text-[#1A2B6B] dark:text-[#DDE3F5] ${
          center ? 'max-w-2xl mx-auto' : ''
        }`}
        style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
      >
        {title}
      </h2>

      {/* Underline accent — center only */}
      {/* {center && (
        <div className="flex items-center justify-center gap-1.5 mt-3 mb-1">
          <span className="w-8 h-0.5 rounded-full bg-[#1A2B6B] dark:bg-[#4a5a9a]" />
          <span className="w-2 h-2 rounded-full bg-[#D0021B]" />
          <span className="w-8 h-0.5 rounded-full bg-[#1A2B6B] dark:bg-[#4a5a9a]" />
        </div>
      )} */}

      {/* Subtitle */}
      {subtitle && (
        <p
          className={`mt-2 text-gray-600 dark:text-[#8899d4] text-base font-bold leading-relaxed ${
            center ? 'max-w-2xl mx-auto' : 'max-w-2xl'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
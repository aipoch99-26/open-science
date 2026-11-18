import { useTranslation } from 'react-i18next'

import './lab-preview.css'

export function LabPreview(): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      className="grid size-full min-h-0 place-items-center overflow-hidden bg-bg-000"
    >
      <span className="sr-only">{t('Loading…')}</span>
      <svg
        viewBox="0 0 240 190"
        className="w-56 max-w-[72%] text-primary"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Isometric floor and drafting grid. */}
        <g stroke="var(--color-border-200)" strokeWidth="1">
          <path d="m120 73 94 47-94 47-94-47Z" />
          <path d="m50 108 94 47m-71-59 94 47m-70-59 94 47m-47-47-94 47m117-35-94 47m118-35-94 47" />
        </g>
        <g className="lab-outline" stroke="var(--text-300)">
          <path pathLength="1" d="M26 120V65l94-47 94 47v55M120 18v55" />
        </g>
        <g className="lab-bench">
          <path fill="var(--bg-200)" d="m59 104 65-32 59 29-65 33Z" />
          <path d="M59 104v5l59 30 65-33v-5m-65 33v5m-55-28v15l4 2v-15m48 25v17l4 2v-18m57-29v16l4-2v-16" />
        </g>
        <g className="lab-instruments">
          {/* A folded paper and a figure sheet on the worktop. */}
          <path fill="var(--bg-000)" d="m77 104 16-8 20 10-16 8Z" />
          <path d="m83 104 11 5m-7-7 9 4" strokeWidth="1" />
          <path fill="var(--bg-000)" d="m121 115 17-9 18 9-17 8Z" />
          <path d="m128 115 6 1 2-4 5 2 5-1" strokeWidth="1" />
          {/* The flask seats last. */}
          <path fill="var(--bg-000)" d="M118 66v10l-8 12c-3 5 3 8 11 8s14-3 11-8l-8-12V66" />
          <ellipse cx="121" cy="65" rx="5" ry="2" fill="var(--bg-000)" />
          <path d="M113 85q8 4 16 0" />
        </g>
      </svg>
    </div>
  )
}

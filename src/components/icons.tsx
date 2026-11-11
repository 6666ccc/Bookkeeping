import type { ReactNode } from 'react'

function Icon({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function TodayIcon() {
  return (
    <Icon size={22}>
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-2.5-1.6L14 21l-2-1.5L10 21l-2.5-1.6L5 21V4a1 1 0 0 1 1-1Z" />
      <path d="M9 8h6M9 12h6" />
    </Icon>
  )
}

export function HistoryIcon() {
  return (
    <Icon size={22}>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
      <path d="M5 17a3 3 0 0 1 3-3h11" />
    </Icon>
  )
}

export function ProductIcon() {
  return <Icon size={22}>
    <path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" />
  </Icon>
}

export function TrashIcon() {
  return (
    <Icon size={17}>
      <path d="M4 7h16M9 7V4.6h6V7M6.5 7 7.6 20h8.8L17.5 7" />
      <path d="M10 11v5.5M14 11v5.5" />
    </Icon>
  )
}

export function DownloadIcon() {
  return (
    <Icon size={18}>
      <path d="M12 4v10.5m0 0 3.8-3.8M12 14.5 8.2 10.7" />
      <path d="M5 19h14" />
    </Icon>
  )
}

export function UploadIcon() {
  return (
    <Icon size={18}>
      <path d="M12 20V9.5m0 0 3.8 3.8M12 9.5l-3.8 3.8" />
      <path d="M5 5h14" />
    </Icon>
  )
}

export function TableIcon() {
  return (
    <Icon size={18}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9.5h16M10 9.5V20" />
    </Icon>
  )
}

export function ChevronIcon() {
  return (
    <Icon size={18}>
      <path d="m7 10 5 5 5-5" />
    </Icon>
  )
}

export function InstallIcon() {
  return (
    <Icon size={18}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </Icon>
  )
}

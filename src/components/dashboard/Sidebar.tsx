import { ChevronLeft, Download, ExternalLink, HardDrive, Server, Settings, User } from "lucide-react"

import logoImage from "data-base64:~assets/logo.png"
import { useState, useEffect } from "react"

// NOTE: "traffic" section disabled - Real-Debrid API returns "not_allowed_method" error (code 4)
// for GET /traffic endpoint despite documentation saying it should work with OAuth tokens.
// The feature works on their website but not via API. May be an API restriction.
export type Section = "account" | "torrents" | "downloads" | "hosts" | "settings"

interface SidebarProps {
  activeSection: Section
  onSectionChange: (section: Section) => void
}

interface NavItem {
  id: Section
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    id: "account",
    label: "Account",
    icon: <User size={20} />
  },
  {
    id: "torrents",
    label: "Torrents",
    icon: <HardDrive size={20} />
  },
  {
    id: "downloads",
    label: "Downloads",
    icon: <Download size={20} />
  },
  {
    id: "hosts",
    label: "Hosts",
    icon: <Server size={20} />
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings size={20} />
  }
]

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsCollapsed(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <aside
      className={`
        flex flex-col h-full flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950
        transition-all duration-200 ease-out
        ${isCollapsed ? "w-16" : "w-56"}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 px-4 border-b border-neutral-200 dark:border-neutral-800 ${isCollapsed ? "justify-center" : ""}`}>
        <div className="flex items-center gap-2">
          <img src={logoImage} alt="Real-Debrid" className="w-8 h-8" />
          {!isCollapsed && (
            <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 tracking-tight">
              RD Manager
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeSection === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => onSectionChange(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors duration-150 ease-out
                    ${isCollapsed ? "justify-center" : ""}
                    ${
                      isActive
                        ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-100"
                    }
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className={isActive ? "text-primary" : ""}>
                    {item.icon}
                  </span>
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Real-Debrid Link */}
      <div className="px-2 mb-2">
        <a
          href="https://real-debrid.com"
          target="_blank"
          rel="noopener noreferrer"
          className={`
            flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
            text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors
            ${isCollapsed ? "justify-center" : ""}
          `}
          title={isCollapsed ? "Real-Debrid" : undefined}
        >
          <ExternalLink size={20} />
          {!isCollapsed && <span>Real-Debrid</span>}
        </a>
      </div>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors duration-150"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            size={16}
            className={`transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`}
          />
        </button>
      </div>
    </aside>
  )
}

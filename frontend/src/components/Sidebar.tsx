"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { LayoutDashboard, Upload, BarChart3, Settings, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Upload, label: "Upload Data", href: "/upload" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

export function Sidebar() {
  const [isOpen, setIsOpen] = React.useState(true)

  return (
    <motion.div
      initial={{ width: isOpen ? 240 : 64 }}
      animate={{ width: isOpen ? 240 : 64 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col",
        "relative z-10"
      )}
    >
      <div className="p-4 flex items-center justify-between">
        {isOpen && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-bold text-xl text-primary truncate"
          >
            DataVis
          </motion.span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(!isOpen && "mx-auto")}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <nav className="flex-1 p-2 space-y-2">
        {sidebarItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            className={cn(
              "w-full justify-start",
              !isOpen && "justify-center px-2"
            )}
            asChild
          >
            <a href={item.href}>
              <item.icon className={cn("h-5 w-5", isOpen && "mr-2")} />
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {item.label}
                </motion.span>
              )}
            </a>
          </Button>
        ))}
      </nav>
    </motion.div>
  )
}


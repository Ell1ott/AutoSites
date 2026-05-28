"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { TaskEditor } from "@/components/tasks/task-editor"
import { TaskList } from "@/components/tasks/task-list"

export default function TasksPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)

  function pick(name: string) {
    setSelected(name)
    router.replace(`/tasks/${encodeURIComponent(name)}`, { scroll: false })
  }

  return (
    <div className="grid h-full grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <div className="min-h-0 overflow-y-auto border-r border-border/60">
        <TaskList selectedTaskName={selected} onSelect={pick} />
      </div>
      <div className="min-h-0 overflow-y-auto">
        <TaskEditor taskName={selected} />
      </div>
    </div>
  )
}

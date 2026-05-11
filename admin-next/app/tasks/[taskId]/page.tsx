"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"

import { TaskEditor } from "@/components/tasks/task-editor"
import { TaskList } from "@/components/tasks/task-list"

export default function TasksDeepLinkPage({
  params,
}: {
  params: Promise<{ taskId: string }>
}) {
  const { taskId } = use(params)
  // The Next.js dynamic-route guarantees this component re-mounts when the
  // URL segment changes (parent uses router.replace), so deriving initial
  // state from `taskId` once is sufficient.
  return <TaskDeepLinkBody key={taskId} taskId={taskId} />
}

function TaskDeepLinkBody({ taskId }: { taskId: string }) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(
    decodeURIComponent(taskId),
  )

  function pick(name: string) {
    setSelected(name)
    router.replace(`/tasks/${encodeURIComponent(name)}`, { scroll: false })
  }

  return (
    <div className="grid h-full grid-cols-[minmax(0,30%)_minmax(0,70%)] divide-x divide-border">
      <div className="overflow-y-auto">
        <TaskList selectedTaskName={selected} onSelect={pick} />
      </div>
      <div className="overflow-y-auto">
        <TaskEditor taskName={selected} />
      </div>
    </div>
  )
}

import type { AiTask, JobKind } from "@/lib/types"

/** Maps an AI task definition to the backend job handler kind. */
export function jobKindForTask(task: AiTask): JobKind {
  if (task.name === "generate_inspiration_queries") {
    return "generate_inspiration_queries"
  }
  if (task.task_type === "browser_agent") return "find_inspiration"
  if (task.task_type === "variant") return "variant_design"
  return "ai_task"
}

import { LeadDetailPageClient } from "./lead-detail-page-client"

type Params = { id: string }

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  return (
    <div className="flex h-full min-h-0 flex-col">
      <LeadDetailPageClient id={id} />
    </div>
  )
}

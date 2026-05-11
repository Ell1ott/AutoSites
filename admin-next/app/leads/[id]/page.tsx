import { LeadDetail } from "@/components/leads/lead-detail"

type Params = { id: string }

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  return (
    <div className="px-6 py-4">
      <LeadDetail placeId={id} />
    </div>
  )
}

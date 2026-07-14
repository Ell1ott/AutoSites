import { DAGENS_RET } from "@/lib/site-config";

export function DagensRetSection() {
  return (
    <div className="space-y-12">
      <div>
        <h2 className="font-headline-md text-headline-md mb-6 border-l-4 border-primary pl-6">
          Dagens ret hver uge
        </h2>
        <div className="space-y-4">
          {DAGENS_RET.schedule.map((item) => (
            <p key={item.days} className="font-body-md text-on-surface-variant">
              <span className="font-semibold text-on-background">{item.days}:</span> {item.note}
            </p>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {DAGENS_RET.weeklyMenu.map((item) => (
          <div
            key={item.day}
            className="border border-primary/10 bg-surface-container p-6 md:p-8"
          >
            <div className="dot-leader font-body-md text-body-md">
              <span>
                <span className="font-headline-sm text-headline-sm text-primary">{item.day}</span>
                <span className="mt-2 block text-on-background">{item.dish}</span>
                {"note" in item && item.note ? (
                  <span className="mt-2 block text-sm text-on-surface-variant italic">
                    {item.note}
                  </span>
                ) : null}
              </span>
              <span className="price font-label-caps text-label-caps text-primary/80">
                Pris: kr. {item.price}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

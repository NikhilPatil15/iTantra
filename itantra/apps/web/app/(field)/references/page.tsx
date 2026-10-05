import { Card, ScreenHeader } from "@/components/ui";
import { REFERENCE_SECTIONS } from "@/lib/references";

export default function ReferencesPage() {
  return (
    <div>
      <ScreenHeader
        title="References"
        subtitle="Source documents, research papers, models, datasets and standards behind iTantra."
      />
      <div className="flex flex-col gap-4">
        {REFERENCE_SECTIONS.map((section) => (
          <Card key={section.heading} className="p-4">
            <h2 className="text-[18px] font-bold">{section.heading}</h2>
            {section.intro ? <p className="mb-2 text-[13px] text-[var(--slate)]">{section.intro}</p> : null}
            <ul className="mt-2 flex flex-col gap-2">
              {section.items.map((item) => (
                <li key={item.url} className="border-b border-[var(--rule)] pb-2 last:border-0">
                  <a href={item.url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--ultramarine)]">
                    {item.title}
                  </a>
                  {item.note ? <p className="text-[13px] text-[var(--slate)]">{item.note}</p> : null}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-[var(--slate)]">
        The primary research document is <em>SIH26173 iTantra research, gap analysis and build plan</em>. A Word/PDF copy of
        this catalogue is in <code>docs/iTantra_References_and_Research.docx</code>.
      </p>
    </div>
  );
}

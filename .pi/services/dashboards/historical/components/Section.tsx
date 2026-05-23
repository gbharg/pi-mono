interface SectionProps {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: SectionProps) {
  return (
    <section id={id} className="scroll-mt-20 py-10 md:py-14">
      <div className="mb-6 max-w-3xl">
        {eyebrow && <div className="section-heading mb-2">{eyebrow}</div>}
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm text-slate-400">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

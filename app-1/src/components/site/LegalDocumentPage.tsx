import { LegalDocumentText } from "@/components/site/LegalDocumentText";
import { SiteHeader } from "@/components/site/SiteHeader";

export const LegalDocumentPage = ({
  content,
  title,
  subtitle,
}: {
  readonly content: string;
  readonly title: string;
  readonly subtitle: string;
}) => (
  <main className="min-h-screen bg-page text-page-foreground">
    <SiteHeader light transparentAtTop={false} />
    <section className="mx-auto max-w-5xl px-5 pt-40 pb-20 sm:px-8 sm:pt-44">
      <article className="rounded-4xl bg-brand-foreground px-6 py-10 shadow-lg sm:px-10 sm:py-12 lg:px-14 lg:py-14">
        <p className="text-sm font-semibold tracking-widest text-brand uppercase">
          Документ
        </p>
        <h1 className="mt-4 font-heading text-4xl font-semibold text-brand sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
          {subtitle}
        </p>
        <p className="mt-3 text-sm text-muted-ui-foreground">
          Редакция от 15 октября 2026 года
        </p>
        <LegalDocumentText content={content} />
      </article>
    </section>
  </main>
);

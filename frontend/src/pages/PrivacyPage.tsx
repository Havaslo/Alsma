import { SiteHeader } from "@/components/site/SiteHeader";
import { PRIVACY_SECTIONS } from "@/lib/site/privacy-policy";

export const PrivacyPage = () => (
  <main className="min-h-screen bg-page text-page-foreground">
    <SiteHeader />
    <section className="mx-auto max-w-5xl px-5 pt-40 pb-20 sm:px-8 sm:pt-48">
      <article className="rounded-4xl bg-panel px-6 py-10 shadow-xl sm:px-10 sm:py-12 lg:px-14 lg:py-14">
        <p className="text-sm font-semibold tracking-widest text-brand uppercase">
          Документ
        </p>
        <h1 className="mt-4 font-heading text-4xl font-semibold text-brand sm:text-5xl">
          Политика конфиденциальности
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
          Актуальная редакция политики обработки персональных данных для
          посетителей сайта ALSMA Resort.
        </p>

        <div className="mt-10 space-y-10">
          {PRIVACY_SECTIONS.map((section) => (
            <section className="scroll-mt-28" key={section.title}>
              <h2 className="font-heading text-3xl font-semibold text-brand">
                {section.title}
              </h2>
              <div className="mt-5 space-y-4 leading-8 text-muted-ui-foreground">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </section>
  </main>
);

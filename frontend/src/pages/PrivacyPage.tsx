import { Mail, ShieldCheck } from "lucide-react";

import { SiteHeader } from "@/components/site/SiteHeader";
import { PRIVACY_SECTIONS } from "@/lib/site/privacy-policy";

export const PrivacyPage = () => (
  <main className="min-h-screen bg-page text-page-foreground">
    <SiteHeader />
    <section className="bg-brand pt-40 pb-20 text-brand-foreground">
      <div className="mx-auto max-w-5xl px-5 text-center sm:px-8">
        <ShieldCheck className="mx-auto size-12" />
        <p className="mt-6 text-sm font-semibold tracking-widest text-brand-foreground/70 uppercase">
          Документы
        </p>
        <h1 className="mt-4 font-heading text-5xl font-semibold sm:text-6xl">
          Политика конфиденциальности
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-brand-foreground/75">
          Актуальная редакция политики обработки персональных данных для
          посетителей сайта ALSMA Resort.
        </p>
      </div>
    </section>
    <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
      <div className="rounded-3xl border border-line bg-panel p-6 sm:p-10">
        <p className="text-sm font-semibold text-brand">Оператор</p>
        <p className="mt-2 text-lg">ООО «Алсма»</p>
        <a
          className="mt-3 inline-flex items-center gap-2 font-semibold text-brand"
          href="mailto:info@alsma-baza.ru"
        >
          <Mail className="size-4" /> info@alsma-baza.ru
        </a>
      </div>
      <article className="mt-10 space-y-12">
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
      </article>
    </section>
  </main>
);

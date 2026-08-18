import { useEffect, useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import faqHeroImage from "@/assets/alsma/nature.jpg";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import { FAQ_FALLBACK, getPublishedFaq } from "@/lib/site/faq";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const FaqPage = () => {
  const content = usePublishedSiteContent("faq");
  const publishedFaq = useMemo(() => getPublishedFaq(content.data?.items), [content.data?.items]);
  const questions = publishedFaq.length ? publishedFaq : FAQ_FALLBACK;
  const [open, setOpen] = useState(0);
  const id = useId();
  useEffect(() => {
    document.title = "Частые вопросы — АЛСМА";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "Ответы на частые вопросы о проживании, SPA, развлечениях и отдыхе в загородном SPA-отеле АЛСМА.");
    const existing = document.querySelector('script[data-seo="faq-jsonld"]');
    existing?.remove();
    if (!publishedFaq.length) return;
    const script = document.createElement("script");
    script.dataset.seo = "faq-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: publishedFaq.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) });
    document.head.append(script);
    return () => script.remove();
  }, [publishedFaq]);
  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <SiteHeader />
      <PublicHero
        description="Короткие ответы о проживании, SPA, развлечениях и отдыхе в АЛСМА."
        eyebrow="Частые вопросы"
        image={faqHeroImage}
        title="Частые вопросы"
      />
      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="space-y-3">
          {questions.map(({ question, answer }, index) => {
            const expanded = open === index;
            return (
              <article
                className="rounded-3xl border border-line bg-panel"
                key={question}
              >
                <h2>
                  <button
                    aria-controls={`${id}-${index}`}
                    aria-expanded={expanded}
                    className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left text-lg font-semibold"
                    onClick={() => setOpen(expanded ? -1 : index)}
                    type="button"
                  >
                    {question}
                    <ChevronDown
                      className={`size-5 ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>
                </h2>
                <div
                  className={
                    expanded
                      ? "px-6 pb-6 leading-7 text-muted-ui-foreground"
                      : "hidden"
                  }
                  id={`${id}-${index}`}
                  role="region"
                >
                  <p>{answer}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
};

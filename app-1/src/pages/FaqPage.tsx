import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import faqHeroImage from "@/assets/alsma/nature.jpg";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

const fallback = [["Какие варианты проживания есть в АЛСМА?", "На странице проживания опубликованы номера разных категорий, а также отдельные дома и коттеджи."], ["Что есть в SPA-центре?", "В SPA-центре представлены термальная зона, бассейн с минеральной водой, массажные кабинеты, уход за лицом и водные процедуры."], ["Какие развлечения доступны гостям?", "На территории есть спортивная площадка, детский клуб, экологические тропы, сезонные активности и вечерние программы."], ["Что включает формат «всё включено»?", "На странице формата указаны завтрак, обед и ужин, активности в течение дня, SPA, пляж и анимация."], ["Проводятся ли в АЛСМА события?", "АЛСМА принимает свадьбы, семейные торжества, юбилеи, частные события и корпоративные выезды."], ["Где находится АЛСМА?", "АЛСМА находится в Нижегородской области, в городе Бор, в деревне Васильково, на улице Лесной, 7."], ["Как забронировать проживание?", "Для бронирования используйте страницу «Бронирование» или свяжитесь с отделом бронирования по телефону, указанному в футере сайта."], ["Подходит ли АЛСМА для семейного отдыха?", "На сайте представлены семейные номера, детский клуб, анимация и развлечения для гостей разных возрастов."]] as const;

export const FaqPage = () => {
  const content = usePublishedSiteContent("faq");
  const stored = content.data?.items?.flatMap((item) => typeof item.content.question === "string" && typeof item.content.answer === "string" ? [[item.content.question, item.content.answer] as [string, string]] : []) ?? [];
  const questions = stored.length ? stored : fallback;
  const [open, setOpen] = useState(0);
  const id = useId();
  useEffect(() => { document.title = "Частые вопросы — АЛСМА"; document.querySelector('meta[name="description"]')?.setAttribute("content", "Ответы на частые вопросы о проживании, SPA, развлечениях и отдыхе в загородном SPA-отеле АЛСМА."); const script = document.createElement("script"); script.type = "application/ld+json"; script.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: questions.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) }); document.head.append(script); return () => script.remove(); }, [questions]);
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
          {questions.map(([question, answer], index) => {
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

import {
  AtSign,
  ExternalLink,
  MessageCircle,
  Send,
  Youtube,
} from "lucide-react";

const socialLinks = [
  ["ВКонтакте", "Новости, акции и анонсы", "https://vk.com/alsma_nnov", AtSign],
  ["MAX", "Быстрые обновления и связь", "https://web.max.ru/158586418", MessageCircle],
  ["Telegram", "Свежие новости и публикации", "https://t.me/alsma_hotel", Send],
  ["YouTube", "Видео, обзоры и атмосфера отеля", "https://youtube.com", Youtube],
] as const;

type SocialLinksSectionProps = {
  description: string;
  title: string;
};

export const SocialLinksSection = ({
  description,
  title,
}: SocialLinksSectionProps) => (
  <section className="bg-panel/65 py-20">
    <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
      <div className="grid gap-8 rounded-4xl bg-panel px-8 py-10 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold tracking-widest text-brand uppercase">
            Следите за нами в соц сетях
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold text-brand sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 leading-7 text-muted-ui-foreground">
            {description}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {socialLinks.map(([label, hint, href, Icon]) => (
            <a
              className="group flex items-center justify-between rounded-3xl bg-page px-5 py-4 text-brand transition hover:bg-page/80"
              href={href}
              key={label}
              rel="noreferrer"
              target="_blank"
            >
              <span className="flex min-w-0 items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <strong className="block font-semibold">{label}</strong>
                  <span className="mt-1 block text-sm text-muted-ui-foreground">{hint}</span>
                </span>
              </span>
              <ExternalLink className="size-4 shrink-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          ))}
        </div>
      </div>
    </div>
  </section>
);

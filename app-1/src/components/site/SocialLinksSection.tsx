import { ExternalLink, MessageCircle } from "lucide-react";

export const VkontakteIcon = () => (
  <svg aria-hidden="true" className="size-5 fill-current" viewBox="0 0 24 24">
    <path d="M12.8 17.2c-5.7 0-9-3.9-9.2-10.4h2.9c.1 4.8 2.2 6.8 3.9 7.2V6.8h2.7v4.1c1.6-.2 3.4-2 4-4.1h2.7c-.45 2.5-2.4 4.3-3.7 5.2 1.3.7 3.5 2.3 4.3 5.2h-3c-.6-2-2.3-3.5-4.3-3.7v3.7h-.3Z" />
  </svg>
);

const socialLinks = [
  [
    "ВКонтакте",
    "Новости, акции и анонсы",
    "https://vk.com/alsma_nnov",
    VkontakteIcon,
  ],
  [
    "MAX",
    "Быстрые обновления и связь",
    "https://web.max.ru/158586418",
    MessageCircle,
  ],
] as const;

type SocialLinksSectionProps = {
  description: string;
  title: string;
};

export const SocialLinksSection = ({
  description,
  title,
}: SocialLinksSectionProps) => (
  <section className="bg-page pb-24">
    <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
      <div className="grid gap-6 rounded-4xl bg-panel px-8 py-9 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold text-brand/70">
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
                  <span className="mt-1 block text-sm text-muted-ui-foreground">
                    {hint}
                  </span>
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

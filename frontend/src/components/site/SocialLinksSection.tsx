import { ExternalLink } from "lucide-react";

const socialLinks = [
  ["ВКонтакте", "https://vk.com/alsma_nnov"],
  ["MAX", "https://web.max.ru/158586418"],
  ["Telegram", "https://t.me/alsma_hotel"],
  ["YouTube", "https://youtube.com"],
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
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
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
          {socialLinks.map(([label, href]) => (
            <a
              className="flex items-center justify-between rounded-3xl bg-page px-5 py-4 font-semibold text-brand transition hover:bg-page/80"
              href={href}
              key={label}
              rel="noreferrer"
              target="_blank"
            >
              {label}
              <ExternalLink className="size-4" />
            </a>
          ))}
        </div>
      </div>
    </div>
  </section>
);

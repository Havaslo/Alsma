import { Construction } from "lucide-react";

export const AdminSitePlaceholder = ({ title }: { readonly title: string }) => (
  <section className="grid min-h-[60vh] place-items-center">
    <div className="w-full max-w-xl rounded-3xl border border-line bg-panel p-8 text-center shadow-sm sm:p-12">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted-ui/40 text-brand">
        <Construction className="size-7" />
      </span>
      <p className="mt-6 text-sm font-semibold tracking-wide text-muted-ui-foreground uppercase">
        Управление сайтом
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-brand">{title}</h1>
      <p className="mt-4 text-base leading-7 text-muted-ui-foreground">
        Раздел в разработке. Здесь появятся инструменты управления этой
        страницей сайта.
      </p>
    </div>
  </section>
);

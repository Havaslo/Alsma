import { ServiceVariantCard } from "@/components/site/ServiceVariantCard";
import { SiteHeader } from "@/components/site/SiteHeader";
import { useApiQuery } from "@/lib/query/use-api-query";
import { loadServices } from "@/lib/services/services-api";

export const ServicesPage = () => {
  const services = useApiQuery(["services"], (signal) => loadServices(signal));
  return (
    <main className="min-h-screen bg-page px-4 pt-24 pb-20 sm:pt-32">
      <SiteHeader light />
      <div className="mx-auto max-w-[100rem]">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.2em] text-brand uppercase">
            ALSMA wellness
          </p>
          <h1 className="mt-3 font-heading text-5xl font-semibold text-brand">
            Услуги и впечатления
          </h1>
          <p className="mt-5 text-lg text-muted-ui-foreground">
            Выберите вариант, дату и свободный слот — выбранные записи
            сохранятся в общей корзине.
          </p>
        </header>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {services.data?.services.map((service) => (
            <article
              className="rounded-3xl border border-line bg-panel p-6"
              key={service.id}
            >
              <h2 className="font-heading text-2xl font-semibold text-brand">
                {service.name}
              </h2>
              <p className="mt-3 text-sm text-muted-ui-foreground">
                {service.description}
              </p>
              <div className="mt-6 space-y-3">
                {service.variants.map((variant) => (
                  <ServiceVariantCard
                    key={variant.id}
                    service={service}
                    variant={variant}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
};

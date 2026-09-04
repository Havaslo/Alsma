import { ServiceVariantCard } from "@/components/site/ServiceVariantCard";
import { useApiQuery } from "@/lib/query/use-api-query";
import { loadServiceSections } from "@/lib/services/services-api";

export const CatalogSections = ({
  afterBlock,
  fallback,
  page,
}: {
  readonly afterBlock?: number;
  readonly fallback?: boolean;
  readonly page: string;
}) => {
  const sections = useApiQuery(["public-service-sections", page], (signal) =>
    loadServiceSections(page, signal),
  );
  const visibleSections = (sections.data?.sections ?? []).filter(
    (section) =>
      section.services.length > 0 &&
      (fallback
        ? section.blockNumber > (afterBlock ?? 0)
        : afterBlock === undefined || section.blockNumber === afterBlock),
  );
  if (!visibleSections.length) return null;

  return (
    <div className="contents">
      {visibleSections.map((section) => (
        <section
          className="mx-auto w-full max-w-[100rem] px-5 py-16 sm:px-8 sm:py-24"
          data-catalog-block={section.blockNumber}
          key={section.id}
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold tracking-[0.2em] text-brand uppercase">
              Услуги и товары
            </p>
            <h2 className="mt-3 font-heading text-4xl font-semibold sm:text-5xl">
              {section.heading}
            </h2>
            {section.subheading && (
              <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
                {section.subheading}
              </p>
            )}
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {section.services.map((service) => (
              <article
                className="rounded-3xl border border-line bg-panel p-6"
                key={service.id}
              >
                <h3 className="font-heading text-2xl font-semibold text-brand">
                  {service.name}
                </h3>
                {service.description && (
                  <p className="mt-3 text-sm text-muted-ui-foreground">
                    {service.description}
                  </p>
                )}
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
        </section>
      ))}
    </div>
  );
};

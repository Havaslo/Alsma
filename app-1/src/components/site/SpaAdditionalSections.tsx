import { Check } from "lucide-react";
import cafeImage from "@/assets/alsma/spa-cafe-mineral-new.jpg";
import type { SpaRequestOpenHandler } from "@/components/site/SpaRequestModal";
import type {
  SpaAdditionalService,
  SpaMenuItem,
  SpaPromotion,
} from "@/lib/site/spa-content";

export const SpaPromotionsSection = ({
  items,
  onOpenRequest,
}: {
  readonly items: readonly SpaPromotion[];
  readonly onOpenRequest: SpaRequestOpenHandler;
}) => (
  <section className="py-24">
    <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
      <h2 className="text-center font-heading text-4xl font-semibold">
        Актуальные акции
      </h2>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {items.map((item) => (
          <article
            className="overflow-hidden rounded-3xl border border-line bg-page"
            key={item.title}
          >
            <img
              alt={item.title}
              className="h-60 w-full object-cover"
              src={item.image}
            />
            <div className="p-7">
              <h3 className="font-heading text-3xl font-semibold">
                {item.title}
              </h3>
              <p className="mt-4 text-muted-ui-foreground">
                {item.description}
              </p>
              <p className="mt-5 text-sm text-brand">{item.deadline}</p>
              <p className="mt-2 text-2xl font-semibold">{item.price}</p>
              <button
                className="mt-6 w-full rounded-full bg-brand px-6 py-3.5 font-semibold text-brand-foreground"
                onClick={onOpenRequest}
                type="button"
              >
                Забронировать
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);
export const SpaInformationSections = ({
  additionalServices,
  menu,
  onOpenRequest,
}: {
  readonly additionalServices: readonly SpaAdditionalService[];
  readonly menu: readonly SpaMenuItem[];
  readonly onOpenRequest: SpaRequestOpenHandler;
}) => (
  <>
    <section className="mx-auto max-w-[100rem] px-5 py-24 sm:px-8">
      <article className="overflow-hidden rounded-4xl bg-panel lg:grid lg:grid-cols-2">
        <img
          alt="Кафе Минерал"
          className="size-full min-h-80 object-cover"
          src={cafeImage}
        />
        <div className="p-8 sm:p-12">
          <p className="text-sm font-semibold text-brand">
            Кафе при SPA-комплексе
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold">
            Кафе «Минерал»
          </h2>
          <p className="mt-5 text-muted-ui-foreground">
            Уютное кафе при SPA-комплексе с полезным меню, свежевыжатыми соками
            и лёгкими закусками.
          </p>
          <div className="mt-6 grid gap-2">
            {menu.map((item) => (
              <div className="rounded-2xl bg-page px-4 py-3" key={item.name}>
                <strong>{item.name}</strong>
                <span className="ml-2 text-muted-ui-foreground">
                  {item.description} · {item.price}
                </span>
              </div>
            ))}
          </div>
          <button
            className="mt-8 rounded-full bg-brand px-7 py-4 font-semibold text-brand-foreground"
            onClick={onOpenRequest}
            type="button"
          >
            Меню
          </button>
        </div>
      </article>
    </section>
    <section className="px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-[100rem]">
        <h2 className="text-center font-heading text-4xl font-semibold">
          Дополнительные услуги и посещение SPA
        </h2>
        <div className="mt-12 overflow-hidden rounded-4xl bg-panel">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted-ui/50">
                <th className="px-5 py-4">Услуга</th>
                <th className="px-5 py-4">Стоимость</th>
              </tr>
            </thead>
            <tbody>
              {additionalServices.map((item) => (
                <tr className="border-t border-line" key={item.service}>
                  <td className="px-5 py-4">{item.service}</td>
                  <td className="px-5 py-4 font-semibold">{item.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
    <section className="bg-panel py-24">
      <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
        <h2 className="font-heading text-4xl font-semibold">
          SPA для компаний
        </h2>
        <p className="mt-5 text-muted-ui-foreground">
          Организуем праздник без хлопот для компании от 2 до 15 человек.
        </p>
        <p className="mt-6 flex gap-3 rounded-3xl bg-page p-6">
          <Check className="size-4 text-brand" />
          Программа подбирается индивидуально.
        </p>
      </div>
    </section>
  </>
);

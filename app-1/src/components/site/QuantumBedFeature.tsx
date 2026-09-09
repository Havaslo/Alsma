import quantumBedImage from "@/assets/alsma/quantum-bed-feature.webp";

const quantumBedBenefits = [
  {
    title: "Комфорт без усилий",
    description:
      "Процедура проходит без физического контакта с кожей — вам остаётся только удобно расположиться и расслабиться.",
  },
  {
    title: "Всего 10 минут",
    description:
      "Короткий сеанс легко дополнит SPA-день и позволит уделить себе время даже при плотном графике.",
  },
  {
    title: "Современный SPA-формат",
    description:
      "Квантовая кровать дополняет привычные практики ухода технологичным аппаратным воздействием на основе электромагнитных волн.",
  },
  {
    title: "Часть вашей перезагрузки",
    description:
      "Сочетайте процедуру с массажем, SPA-ритуалами и другими видами ухода, создавая собственный сценарий отдыха.",
  },
] as const;

export const QuantumBedFeature = () => (
  <section className="mx-auto w-full max-w-[100rem] px-5 py-16 sm:px-8 sm:py-24">
    <div className="mx-auto max-w-4xl text-center">
      <p className="text-sm font-semibold tracking-[0.2em] text-brand uppercase">
        SPA нового поколения
      </p>
      <h2 className="mx-auto mt-4 max-w-4xl font-heading text-4xl leading-[1.08] font-semibold text-page-foreground sm:text-5xl lg:text-6xl">
        Современные технологии для глубокого расслабления, комфорта и нового
        опыта заботы о себе.
      </h2>
      <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-muted-ui-foreground sm:text-lg sm:leading-8">
        Технологичный формат SPA-процедуры, где для отдыха не требуется никаких
        усилий. Просто расположитесь с комфортом и позвольте себе несколько
        минут абсолютного спокойствия.
      </p>
    </div>

    <div className="mt-10 grid gap-4 sm:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch lg:gap-5">
      <div className="min-h-[22rem] overflow-hidden rounded-[2rem] bg-panel sm:min-h-[30rem] lg:min-h-0">
        <img
          alt="Квантовая кровать в SPA"
          className="h-full min-h-[22rem] w-full object-cover sm:min-h-[30rem]"
          src={quantumBedImage}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {quantumBedBenefits.map((benefit, index) => (
          <article
            className="flex min-h-[15rem] flex-col rounded-[2rem] bg-panel p-6 sm:min-h-[18rem] sm:p-7 lg:p-8"
            key={benefit.title}
          >
            <span className="text-sm font-semibold tracking-[0.16em] text-brand/70">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-8 font-heading text-2xl leading-tight font-semibold text-brand sm:text-[1.7rem]">
              {benefit.title}
            </h3>
            <p className="mt-4 text-sm leading-6 text-muted-ui-foreground sm:text-[0.95rem] sm:leading-7">
              {benefit.description}
            </p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

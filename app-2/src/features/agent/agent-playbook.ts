import type { Database } from "../../lib/database/database.js";

const defaultScenarios = [
  {
    enabled: true,
    response:
      "Определи, что именно нужно гостю: проживание, SPA на один день или аппаратные процедуры. Не перечисляй услуги повторно: задай один вопрос с выбором из двух-трёх вариантов и после выбора веди к следующему шагу.",
    title: "Первичная консультация и выбор формата",
    trigger: "consultation",
  },
  {
    enabled: true,
    response:
      "Если гость хочет SPA, сначала уточни: отдых с проживанием или посещение SPA на один день. Для проживания собери даты, взрослых, детей и номера; для визита предложи открыть страницу SPA или оставить заявку.",
    title: "Подбор SPA-отдыха",
    trigger: "spa",
  },
  {
    enabled: true,
    response:
      "Если гость спрашивает об аппаратных процедурах, уточни цель: расслабление, восстановление, уход за телом или оздоровление. Затем предложи открыть страницу процедур, записаться или задать вопрос специалисту.",
    title: "Аппаратные процедуры",
    trigger: "hardware-procedures",
  },
  {
    enabled: true,
    response:
      "Для проживания собери только недостающие параметры: даты, взрослых, детей и количество номеров. Не обещай наличие до проверки Eptera. После проверки предложи открыть подборку номеров.",
    title: "Бронирование с конкретным следующим шагом",
    trigger: "booking",
  },
  {
    enabled: true,
    response:
      "Если точного ответа нет в базе знаний или данных Eptera, не повторяй общие сведения. Скажи, что не можешь подтвердить информацию, и предложи передать вопрос менеджеру.",
    title: "Резервный ответ без зацикливания",
    trigger: "fallback",
  },
] as const;

const defaultTransferRules = [
  {
    condition:
      "Гость прямо просит менеджера, сотрудника, специалиста, перезвонить или помочь человеку.",
    destination: "duty-manager",
    enabled: true,
    title: "Прямая просьба о менеджере",
  },
  {
    condition:
      "Нужна консультация по медицинским противопоказаниям, индивидуальной программе, аппаратной процедуре с ограничениями или нестандартным состояниям здоровья.",
    destination: "spa-specialist",
    enabled: true,
    title: "Медицинские и индивидуальные вопросы",
  },
  {
    condition:
      "Запрос касается группового, корпоративного или нестандартного размещения, нескольких номеров, мероприятия или особых условий.",
    destination: "booking-manager",
    enabled: true,
    title: "Сложное бронирование",
  },
  {
    condition:
      "Агент два раза подряд не продвинул диалог: повторил уже сказанное, не смог выбрать следующий шаг или не подтвердил данные.",
    destination: "manager-callback",
    enabled: true,
    title: "Повторение или отсутствие прогресса",
  },
  {
    condition:
      "Ответ нельзя проверить по опубликованной базе знаний, актуальным тарифам или наличию.",
    destination: "manager-callback",
    enabled: true,
    title: "Неподтверждённая информация",
  },
] as const;

export const ensureDefaultAgentPlaybook = async (database: Database) => {
  await Promise.all([
    ...defaultScenarios.map(async (item) => {
      const existing = await database.client.agentScenario.findFirst({
        where: { title: item.title },
        select: { id: true },
      });
      if (!existing) await database.client.agentScenario.create({ data: item });
    }),
    ...defaultTransferRules.map(async (item) => {
      const existing = await database.client.agentTransferRule.findFirst({
        where: { title: item.title },
        select: { id: true },
      });
      if (!existing)
        await database.client.agentTransferRule.create({ data: item });
    }),
  ]);
};

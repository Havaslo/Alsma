import type { ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";

import { BellRing, Database, Link2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import { CheckboxField, TextAreaField, TextField } from "@/components/ui/FormField";

export type AgentSettingsTab = "general" | "capabilities" | "data" | "notifications";

type AgentSettingsValues = {
  enabled: boolean;
  tone: string;
  language: string;
  greeting: string;
  bookingUrl: string;
  canCheckAvailability: boolean;
  canCreateRequest: boolean;
  canTransferToEmployee: boolean;
  canCreateBooking: boolean;
  collectName: boolean;
  collectPhone: boolean;
  collectGuestsCount: boolean;
  collectDates: boolean;
  showAiDisclosure: boolean;
  notifyOnAiReply: boolean;
  disclosureText: string;
};

const DEFAULT_VALUES: AgentSettingsValues = {
  enabled: true,
  tone: "Тёплый, спокойный и уверенный. Отвечать коротко, по делу и без давления.",
  language: "Русский язык. Если клиент пишет на другом языке — отвечать на языке клиента.",
  greeting: "Здравствуйте! Я AI-ассистент отеля АЛСМА. Помогу с вопросами, проверю наличие и передам заявку сотруднику, если понадобится.",
  bookingUrl: "/booking",
  canCheckAvailability: true,
  canCreateRequest: true,
  canTransferToEmployee: true,
  canCreateBooking: false,
  collectName: true,
  collectPhone: true,
  collectGuestsCount: true,
  collectDates: true,
  showAiDisclosure: true,
  notifyOnAiReply: true,
  disclosureText: "В этом чате отвечает AI-ассистент. При необходимости подключим сотрудника.",
};

export const AgentSettingsTabPanel = ({ tab }: { readonly tab: AgentSettingsTab }) => {
  const form = useForm<AgentSettingsValues>({ defaultValues: DEFAULT_VALUES });
  const watched = useWatch({ control: form.control });
  const enabled = watched.enabled ?? false;
  const showDisclosure = watched.showAiDisclosure ?? false;

  return (
    <Form className="space-y-6" form={form} onSubmit={() => toast.success("Настройки агента сохранены")}>
      {tab === "general" && (
        <div className="space-y-5">
          <InfoCard icon={<Database className="size-5" />} title="Источник знаний">
            <p>Eptera Booking API — основной источник актуальных данных об отеле, тарифах, услугах и наличии.</p>
            <p className="mt-2 text-xs text-muted-ui-foreground">Статьи и правила из раздела «База знаний» используются как дополнительный контекст и инструкции поведения.</p>
          </InfoCard>
          <div className="grid gap-5 lg:grid-cols-2">
            <TextField label="Язык ответа" {...form.register("language", { required: true })} />
            <TextField label="Ссылка на инструмент бронирования" {...form.register("bookingUrl", { required: true })} />
          </div>
          <TextAreaField label="Тон и стиль общения" rows={4} {...form.register("tone", { required: true })} />
          <TextAreaField label="Приветственное сообщение" rows={4} {...form.register("greeting", { required: true })} />
          <CheckboxField checked={enabled} label="Агент активен на сайте" onChange={(checked) => form.setValue("enabled", checked)} />
        </div>
      )}

      {tab === "capabilities" && (
        <div className="space-y-4">
          <InfoCard icon={<ShieldCheck className="size-5" />} title="Разрешённые действия">
            <p>Агент может консультировать клиента и создавать обращение, но не имеет права самостоятельно создавать бронь.</p>
          </InfoCard>
          <SettingCheckbox checked={watched.canCheckAvailability} label="Проверять наличие и актуальные условия через Eptera" onChange={(checked) => form.setValue("canCheckAvailability", checked)} />
          <SettingCheckbox checked={watched.canCreateRequest} label="Создавать заявку клиента в разделе обращений" onChange={(checked) => form.setValue("canCreateRequest", checked)} />
          <SettingCheckbox checked={watched.canTransferToEmployee} label="Передавать диалог сотруднику" onChange={(checked) => form.setValue("canTransferToEmployee", checked)} />
          <div className="rounded-2xl border border-line bg-page p-4">
            <CheckboxField checked={false} label="Создавать бронь" onChange={() => undefined} />
            <p className="mt-1 ml-8 text-sm text-muted-ui-foreground">Недоступно по правилам проекта. Клиенту можно отправить ссылку на инструмент бронирования.</p>
          </div>
        </div>
      )}

      {tab === "data" && (
        <div className="space-y-4">
          <InfoCard icon={<Link2 className="size-5" />} title="Данные для заявки">
            <p>Собираем только сведения, необходимые для консультации и обратной связи. Срок хранения диалогов пока не задаём.</p>
          </InfoCard>
          <SettingCheckbox checked={watched.collectName} label="Имя клиента" onChange={(checked) => form.setValue("collectName", checked)} />
          <SettingCheckbox checked={watched.collectPhone} label="Номер телефона" onChange={(checked) => form.setValue("collectPhone", checked)} />
          <SettingCheckbox checked={watched.collectGuestsCount} label="Количество гостей" onChange={(checked) => form.setValue("collectGuestsCount", checked)} />
          <SettingCheckbox checked={watched.collectDates} label="Даты заезда и выезда" onChange={(checked) => form.setValue("collectDates", checked)} />
        </div>
      )}

      {tab === "notifications" && (
        <div className="space-y-5">
          <InfoCard icon={<BellRing className="size-5" />} title="Прозрачность ответа">
            <p>Клиент должен понимать, что получает ответ AI-агента, а не сотрудника отеля.</p>
          </InfoCard>
          <SettingCheckbox checked={showDisclosure} label="Показывать уведомление об ответе AI" onChange={(checked) => form.setValue("showAiDisclosure", checked)} />
          <SettingCheckbox checked={watched.notifyOnAiReply} label="Показывать уведомление при каждом ответе агента" onChange={(checked) => form.setValue("notifyOnAiReply", checked)} />
          <TextAreaField label="Текст уведомления" rows={3} {...form.register("disclosureText", { required: showDisclosure })} />
        </div>
      )}

      <div className="flex justify-end border-t border-line pt-5">
        <Button type="submit"><Save className="size-4" /> Сохранить настройки</Button>
      </div>
    </Form>
  );
};

const SettingCheckbox = ({ checked, label, onChange }: { readonly checked: boolean | undefined; readonly label: string; readonly onChange: (checked: boolean) => void }) => <CheckboxField checked={checked ?? false} label={label} onChange={onChange} />;

const InfoCard = ({ icon, title, children }: { readonly icon: ReactNode; readonly title: string; readonly children: ReactNode }) => (
  <div className="rounded-2xl border border-line bg-page p-4">
    <div className="flex items-center gap-3 font-semibold text-brand">{icon}<span>{title}</span></div>
    <div className="mt-3 text-sm leading-6 text-muted-ui-foreground">{children}</div>
  </div>
);

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";

import { BellRing, Database, Link2, Save, ShieldCheck } from "lucide-react";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import {
  CheckboxField,
  TextAreaField,
  TextField,
} from "@/components/ui/FormField";
import type { AgentSettings } from "@/lib/admin/agent-scenarios-api";
import {
  useAgentSettings,
  useSaveAgentSettings,
} from "@/lib/admin/useAgentScenarios";

export type AgentSettingsTab =
  "general" | "capabilities" | "data" | "notifications";

const DEFAULT_VALUES: AgentSettings = {
  enabled: true,
  site: true,
  voice: true,
  vk: true,
  max: true,
  tone: "Дружелюбный и естественный.",
  language:
    "Русский язык. Если клиент пишет на другом языке — отвечать на языке клиента.",
  greeting:
    "Здравствуйте! Я AI-помощник отеля «Алсма». Подскажу об отеле, проверю наличие и помогу с бронированием.",
  bookingUrl: "/booking",
  canCheckAvailability: true,
  canCreateRequest: true,
  canTransferToEmployee: true,
  canCreateBooking: true,
  collectName: true,
  collectPhone: true,
  collectGuestsCount: true,
  collectDates: true,
  showAiDisclosure: true,
  notifyOnAiReply: true,
  disclosureText:
    "Я AI-помощник отеля «Алсма». Если понадобится, к диалогу подключится сотрудник.",
};

export const AgentSettingsTabPanel = ({
  tab,
}: {
  readonly tab: AgentSettingsTab;
}) => {
  const form = useForm<AgentSettings>({ defaultValues: DEFAULT_VALUES });
  const settings = useAgentSettings();
  const saveSettings = useSaveAgentSettings();
  const watched = useWatch({ control: form.control });
  const enabled = watched.enabled ?? false;
  const showDisclosure = watched.showAiDisclosure ?? false;

  useEffect(() => {
    if (settings.data?.settings) form.reset(settings.data.settings);
  }, [form, settings.data]);

  return (
    <Form
      className="space-y-6"
      form={form}
      onSubmit={(values) => saveSettings.mutate(values)}
    >
      {tab === "general" && (
        <div className="space-y-5">
          <InfoCard
            icon={<Database className="size-5" />}
            title="Источник знаний"
          >
            <p>
              Проверка наличия и бронирование через API сейчас недоступны. Агент
              не ищет номера и не оформляет бронирования вне виджета.
            </p>
            <p className="mt-2 text-xs text-muted-ui-foreground">
              Для текстовых каналов клиенту можно отправить ссылку на страницу
              бронирования или передать диалог менеджеру.
            </p>
          </InfoCard>
          <div className="grid gap-5 lg:grid-cols-2">
            <TextField
              label="Язык ответа"
              {...form.register("language", { required: true })}
            />
            <TextField
              label="Ссылка на инструмент бронирования"
              {...form.register("bookingUrl", { required: true })}
            />
          </div>
          <TextAreaField
            label="Тон и стиль общения"
            rows={4}
            {...form.register("tone", { required: true })}
          />
          <TextAreaField
            label="Приветственное сообщение"
            rows={4}
            {...form.register("greeting", { required: true })}
          />
          <CheckboxField
            checked={enabled}
            label="Агент активен на сайте"
            onChange={(checked) => form.setValue("enabled", checked)}
          />
          <div className="rounded-2xl border border-line bg-page p-4">
            <h2 className="font-semibold text-brand">Каналы агента</h2>
            <p className="mt-1 text-sm text-muted-ui-foreground">
              Независимые переключатели. Общий переключатель сайта не меняет их
              автоматически.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SettingCheckbox
                checked={watched.site}
                label="Агент активен на сайте"
                onChange={(checked) => form.setValue("site", checked)}
              />
              <SettingCheckbox
                checked={watched.voice}
                label="Агент активен в звонках"
                onChange={(checked) => form.setValue("voice", checked)}
              />
              <SettingCheckbox
                checked={watched.vk}
                label="Агент активен в VK"
                onChange={(checked) => form.setValue("vk", checked)}
              />
              <SettingCheckbox
                checked={watched.max}
                label="Агент активен в MAX"
                onChange={(checked) => form.setValue("max", checked)}
              />
            </div>
          </div>
        </div>
      )}
      {tab === "capabilities" && (
        <div className="space-y-4">
          <InfoCard
            icon={<ShieldCheck className="size-5" />}
            title="Разрешённые действия"
          >
            <p>
              AI-помощник консультирует по проверенным данным и использует
              актуальную доступность Eptera. Бронь создаётся только после явного
              подтверждения гостем выбранного варианта.
            </p>
          </InfoCard>
          <div className="rounded-2xl border border-line bg-page p-4">
            <p className="font-medium text-page-foreground">
              Проверка наличия подключена к Eptera
            </p>
            <p className="mt-1 text-sm text-muted-ui-foreground">
              Для подбора используются актуальные варианты, полученные через
              систему бронирования.
            </p>
          </div>
          <SettingCheckbox
            checked={watched.canCreateRequest}
            label="Создавать заявку клиента в разделе обращений"
            onChange={(checked) => form.setValue("canCreateRequest", checked)}
          />
          <SettingCheckbox
            checked={watched.canTransferToEmployee}
            label="Передавать диалог сотруднику"
            onChange={(checked) =>
              form.setValue("canTransferToEmployee", checked)
            }
          />
          <div className="rounded-2xl border border-line bg-page p-4">
            <CheckboxField
              checked={watched.canCreateBooking ?? true}
              label="Помогать с бронированием через Eptera"
              onChange={() => undefined}
            />
            <p className="mt-1 ml-8 text-sm text-muted-ui-foreground">
              Создание брони доступно после явного подтверждения гостем
              выбранного варианта.
            </p>
          </div>
        </div>
      )}
      {tab === "data" && (
        <div className="space-y-4">
          <InfoCard
            icon={<Link2 className="size-5" />}
            title="Данные для заявки"
          >
            <p>
              Собираем только сведения, необходимые для консультации и обратной
              связи. Срок хранения диалогов пока не задаём.
            </p>
          </InfoCard>
          <SettingCheckbox
            checked={watched.collectName}
            label="Имя клиента"
            onChange={(checked) => form.setValue("collectName", checked)}
          />
          <SettingCheckbox
            checked={watched.collectPhone}
            label="Номер телефона"
            onChange={(checked) => form.setValue("collectPhone", checked)}
          />
          <SettingCheckbox
            checked={watched.collectGuestsCount}
            label="Количество гостей"
            onChange={(checked) => form.setValue("collectGuestsCount", checked)}
          />
          <SettingCheckbox
            checked={watched.collectDates}
            label="Даты заезда и выезда"
            onChange={(checked) => form.setValue("collectDates", checked)}
          />
        </div>
      )}
      {tab === "notifications" && (
        <div className="space-y-5">
          <InfoCard
            icon={<BellRing className="size-5" />}
            title="Прозрачность ответа"
          >
            <p>
              Клиент должен понимать, что получает ответ AI-агента, а не
              сотрудника отеля.
            </p>
          </InfoCard>
          <SettingCheckbox
            checked={showDisclosure}
            label="Показывать уведомление об ответе AI"
            onChange={(checked) => form.setValue("showAiDisclosure", checked)}
          />
          <SettingCheckbox
            checked={watched.notifyOnAiReply}
            label="Показывать уведомление при каждом ответе агента"
            onChange={(checked) => form.setValue("notifyOnAiReply", checked)}
          />
          <TextAreaField
            label="Текст уведомления"
            rows={3}
            {...form.register("disclosureText", { required: showDisclosure })}
          />
        </div>
      )}
      <div className="flex justify-end border-t border-line pt-5">
        <Button disabled={saveSettings.isPending} type="submit">
          <Save className="size-4" /> Сохранить настройки
        </Button>
      </div>
    </Form>
  );
};

const SettingCheckbox = ({
  checked,
  label,
  onChange,
}: {
  readonly checked: boolean | undefined;
  readonly label: string;
  readonly onChange: (checked: boolean) => void;
}) => (
  <CheckboxField checked={checked ?? false} label={label} onChange={onChange} />
);
const InfoCard = ({
  icon,
  title,
  children,
}: {
  readonly icon: ReactNode;
  readonly title: string;
  readonly children: ReactNode;
}) => (
  <div className="rounded-2xl border border-line bg-page p-4">
    <div className="flex items-center gap-3 font-semibold text-brand">
      {icon}
      <span>{title}</span>
    </div>
    <div className="mt-3 text-sm leading-6 text-muted-ui-foreground">
      {children}
    </div>
  </div>
);

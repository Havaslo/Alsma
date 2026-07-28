import { type ReactNode, useMemo, useState } from "react";
import { generatePath, useNavigate } from "react-router-dom";

import { AudioLines, Eye, Search } from "lucide-react";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import { Button } from "@/components/ui/Button";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { Modal } from "@/components/ui/Modal";
import {
  MOCK_REQUESTS,
  type MockRequest,
  type MockRequestStatus,
  REQUEST_CHANNEL_OPTIONS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_OPTIONS,
  REQUEST_TOPIC_OPTIONS,
  REQUEST_TYPE_OPTIONS,
} from "@/lib/admin/admin-request-mocks";
import { cn } from "@/lib/cn";

type ChannelFilter = MockRequest["channel"] | "all";
type StatusFilter = MockRequest["status"] | "all";
type TopicFilter = MockRequest["topic"] | "all";
type TypeFilter = MockRequest["type"] | "all";

const statusTones: Record<MockRequestStatus, string> = {
  completed: "bg-brand/10 text-brand",
  problem: "bg-destructive/10 text-destructive",
  processing: "bg-supporting/25 text-accent-ui-foreground",
};

const mockRecording =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

const RequestStatusBadge = ({ status }: { readonly status: StatusFilter }) =>
  status === "all" ? null : (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
        statusTones[status],
      )}
    >
      {REQUEST_STATUS_LABELS[status]}
    </span>
  );

export const AdminRequestsPanel = () => {
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [recordingTitle, setRecordingTitle] = useState<string>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [topic, setTopic] = useState<TopicFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const navigate = useNavigate();
  const items = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ru-RU");
    return MOCK_REQUESTS.filter((item) => {
      const haystack = [
        item.channelLabel,
        item.clientName,
        item.contact,
        item.intent,
        item.result,
        item.topicLabel,
      ]
        .join(" ")
        .toLocaleLowerCase("ru-RU");
      return (
        (channel === "all" || item.channel === channel) &&
        (status === "all" || item.status === status) &&
        (topic === "all" || item.topic === topic) &&
        (type === "all" || item.type === type) &&
        (!term || haystack.includes(term))
      );
    });
  }, [channel, search, status, topic, type]);

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[minmax(20rem,1fr)_12rem_14rem_14rem_12rem]">
        <label>
          <span className="mb-2 block text-sm font-medium text-muted-ui-foreground">
            Поиск
          </span>
          <span className="flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-brand-foreground px-4">
            <Search className="size-4 text-muted-ui-foreground" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-ui-foreground"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Телефон, намерение, результат"
              value={search}
            />
          </span>
        </label>
        <FilterField label="Тип обращения">
          <DropdownSelect<TypeFilter>
            ariaLabel="Фильтр по типу обращения"
            onChange={setType}
            options={REQUEST_TYPE_OPTIONS}
            triggerClassName="min-h-12 rounded-2xl border border-line bg-brand-foreground px-4 text-sm"
            value={type}
          />
        </FilterField>
        <FilterField label="Статус">
          <DropdownSelect<StatusFilter>
            ariaLabel="Фильтр обращений по статусу"
            onChange={setStatus}
            options={REQUEST_STATUS_OPTIONS}
            triggerClassName="min-h-12 rounded-2xl border border-line bg-brand-foreground px-4 text-sm"
            value={status}
          />
        </FilterField>
        <FilterField label="Тема">
          <DropdownSelect<TopicFilter>
            ariaLabel="Фильтр обращений по теме"
            onChange={setTopic}
            options={REQUEST_TOPIC_OPTIONS}
            triggerClassName="min-h-12 rounded-2xl border border-line bg-brand-foreground px-4 text-sm"
            value={topic}
          />
        </FilterField>
        <FilterField label="Канал">
          <DropdownSelect<ChannelFilter>
            ariaLabel="Фильтр обращений по каналу"
            onChange={setChannel}
            options={REQUEST_CHANNEL_OPTIONS}
            triggerClassName="min-h-12 rounded-2xl border border-line bg-brand-foreground px-4 text-sm"
            value={channel}
          />
        </FilterField>
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground">
        <p className="border-b border-line px-5 py-4 text-sm font-semibold">
          Всего обращений: {items.length}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-7xl border-collapse text-left text-sm">
            <thead className="bg-page text-xs font-semibold tracking-wide uppercase">
              <tr>
                <th className="px-5 py-4">Источник</th>
                <th className="px-5 py-4">Дата</th>
                <th className="px-5 py-4">Клиент</th>
                <th className="px-5 py-4">Намерение</th>
                <th className="px-5 py-4">Статус</th>
                <th className="px-5 py-4">Результат</th>
                <th className="px-5 py-4 text-right">Действие</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr className="border-t border-line align-top" key={item.id}>
                  <td className="px-5 py-4">
                    <strong className="block text-brand">
                      {item.channelLabel}
                    </strong>
                    <span className="mt-1 block text-xs text-muted-ui-foreground">
                      {item.typeLabel}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-medium">{item.createdAt}</td>
                  <td className="px-5 py-4">
                    <strong className="block">{item.contact}</strong>
                    <span className="mt-1 block text-xs text-muted-ui-foreground">
                      {item.clientName}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <strong className="block">{item.intent}</strong>
                    <span className="mt-1 block text-xs text-muted-ui-foreground">
                      {item.topicLabel}
                    </span>
                  </td>
                  <td className="w-40 px-5 py-4">
                    <RequestStatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-4 text-muted-ui-foreground">
                    {item.result}
                  </td>
                  <td className="w-52 px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        className="px-3"
                        onClick={() =>
                          navigate(
                            generatePath(AMAZI_ROUTES.adminRequest, {
                              requestId: item.id,
                            }),
                          )
                        }
                        variant="secondary"
                      >
                        <Eye className="size-4" /> Открыть
                      </Button>
                      {item.type === "call" && (
                        <Button
                          className="px-3"
                          onClick={() => setRecordingTitle(item.intent)}
                          variant="secondary"
                        >
                          <AudioLines className="size-4" /> Запись
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length && (
          <p className="p-12 text-center text-muted-ui-foreground">
            По выбранным фильтрам обращений нет.
          </p>
        )}
      </section>

      <Modal
        closeLabel="Закрыть запись"
        onClose={() => setRecordingTitle(undefined)}
        open={Boolean(recordingTitle)}
        title={recordingTitle ?? "Запись звонка"}
      >
        <p className="mb-5 text-sm text-muted-ui-foreground">
          Демонстрационная запись звонка
        </p>
        <audio className="w-full" controls src={mockRecording}>
          <track kind="captions" />
        </audio>
      </Modal>
    </div>
  );
};

const FilterField = ({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) => (
  <label>
    <span className="mb-2 block text-sm font-medium text-muted-ui-foreground">
      {label}
    </span>
    {children}
  </label>
);

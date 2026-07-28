import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { Plus, Save, Trash2 } from "lucide-react";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CheckboxField, TextField } from "@/components/ui/FormField";
import { getRoomId } from "@/lib/site/rooms";
import {
  type RoomComparisonFormValues,
  getRoomCards,
  getRoomComparisonDefaults,
} from "@/lib/site/rooms-content";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import { useSaveAdminSiteContent } from "@/lib/site/useSiteContent";

export const AdminRoomComparisonForm = ({
  items,
}: {
  readonly items?: SiteContentItem[];
}) => {
  const [rowToDelete, setRowToDelete] = useState<{
    index: number;
    label: string;
  }>();
  const rooms = getRoomCards(items);
  const save = useSaveAdminSiteContent();
  const form = useForm<RoomComparisonFormValues>({
    defaultValues: getRoomComparisonDefaults(items, rooms),
  });
  const rows = useFieldArray({ control: form.control, name: "rows" });
  const values = useWatch({ control: form.control });
  const selectedRoomIds = values.selectedRoomIds ?? [];
  const selectedRooms = selectedRoomIds
    .map((roomId) =>
      rooms.find((room, index) => getRoomId(room, index) === roomId),
    )
    .filter((room) => room !== undefined);

  const toggleRoom = (roomId: string, selected: boolean) => {
    form.setValue(
      "selectedRoomIds",
      selected
        ? [...selectedRoomIds, roomId]
        : selectedRoomIds.filter((id) => id !== roomId),
      { shouldDirty: true },
    );
  };

  return (
    <Form
      className="space-y-5"
      form={form}
      onSubmit={(formValues) =>
        save.mutate({
          content: {
            items: formValues.rows
              .map((row) => ({
                ...row,
                values: Object.fromEntries(
                  formValues.selectedRoomIds.map((roomId) => [
                    roomId,
                    row.values[roomId] ?? "",
                  ]),
                ),
              }))
              .sort((left, right) => left.sortOrder - right.sortOrder),
            selectedRoomIds: formValues.selectedRoomIds,
          },
          itemKey: "comparison",
          position: 1,
          section: "rooms",
          status: "published",
          title: "Сравнительная таблица",
        })
      }
    >
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-brand-foreground p-5 shadow-sm sm:flex-row sm:items-start sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-brand">
            Сравнительная таблица
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-ui-foreground">
            Выберите номера и заполните значения параметров для каждого из них.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() =>
              rows.append({
                isActive: true,
                label: "",
                sortOrder: rows.fields.length,
                values: {},
              })
            }
            variant="secondary"
          >
            <Plus className="size-4" />
            Добавить строку
          </Button>
          <Button disabled={save.isPending} type="submit">
            <Save className="size-4" />
            Сохранить таблицу
          </Button>
        </div>
      </header>

      <section className="rounded-3xl border border-line bg-brand-foreground p-5 shadow-sm sm:p-6">
        <h3 className="font-semibold text-brand">Номера для сравнения</h3>
        <p className="mt-1 text-sm text-muted-ui-foreground">
          Отметьте категории, которые будут колонками публичной таблицы.
        </p>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {rooms.map((room, index) => {
            const roomId = getRoomId(room, index);
            return (
              <CheckboxField
                checked={selectedRoomIds.includes(roomId)}
                key={roomId}
                label={`${room.title} · ${room.area} · ${room.capacity}`}
                onChange={(checked) => toggleRoom(roomId, checked)}
              />
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground shadow-sm">
        {selectedRooms.length === 0 ? (
          <p className="p-6 text-sm text-muted-ui-foreground">
            Выберите хотя бы один номер, чтобы заполнить таблицу.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-5xl border-collapse text-left">
              <thead className="bg-page/70">
                <tr>
                  <th className="p-4 text-sm text-brand">Параметр</th>
                  {selectedRooms.map((room) => (
                    <th className="p-4 text-sm text-brand" key={room.id}>
                      {room.title}
                    </th>
                  ))}
                  <th className="p-4 text-sm text-brand">Действия</th>
                </tr>
              </thead>
              <tbody>
                {rows.fields.map((row, rowIndex) => (
                  <tr className="border-t border-line align-top" key={row.id}>
                    <td className="min-w-56 p-4">
                      <TextField
                        label="Название параметра"
                        {...form.register(`rows.${rowIndex}.label`, {
                          required: "Введите параметр.",
                        })}
                      />
                    </td>
                    {selectedRooms.map((room, roomIndex) => {
                      const roomId = getRoomId(room, roomIndex);
                      return (
                        <td className="min-w-64 p-4" key={roomId}>
                          <TextField
                            label={room.title}
                            placeholder="..."
                            {...form.register(
                              `rows.${rowIndex}.values.${roomId}`,
                            )}
                          />
                        </td>
                      );
                    })}
                    <td className="min-w-56 space-y-3 p-4">
                      <CheckboxField
                        checked={values.rows?.[rowIndex]?.isActive ?? false}
                        className="w-full"
                        label="Показывать строку"
                        onChange={(checked) =>
                          form.setValue(`rows.${rowIndex}.isActive`, checked, {
                            shouldDirty: true,
                          })
                        }
                      />
                      <Button
                        className="w-full text-destructive"
                        onClick={() =>
                          setRowToDelete({
                            index: rowIndex,
                            label:
                              values.rows?.[rowIndex]?.label ||
                              `Строка ${rowIndex + 1}`,
                          })
                        }
                        variant="secondary"
                      >
                        <Trash2 className="size-4" />
                        Удалить
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ConfirmModal
        confirmLabel="Удалить строку"
        onClose={() => setRowToDelete(undefined)}
        onConfirm={() => {
          if (rowToDelete) rows.remove(rowToDelete.index);
          setRowToDelete(undefined);
        }}
        open={Boolean(rowToDelete)}
        title="Удалить строку сравнения?"
      >
        Строка «{rowToDelete?.label}» будет удалена из редактора. Чтобы
        применить изменение на сайте, сохраните таблицу.
      </ConfirmModal>
    </Form>
  );
};

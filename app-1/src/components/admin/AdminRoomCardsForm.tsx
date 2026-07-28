import { useFieldArray, useForm } from "react-hook-form";

import { Plus, Save } from "lucide-react";

import { Form } from "@/components/Form";
import { AdminRoomCardFields } from "@/components/admin/AdminRoomCardFields";
import { Button } from "@/components/ui/Button";
import {
  type RoomCardsFormValues,
  getRoomCardDefaults,
  serializeRoomCards,
} from "@/lib/site/rooms-content";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import { useSaveAdminSiteContent } from "@/lib/site/useSiteContent";

const createEmptyRoom = (sortOrder: number) => ({
  amenities: "",
  area: "",
  beds: "",
  capacity: "",
  description: "",
  features: "",
  gallery: [],
  galleryNames: [],
  homeButtonHref: "/rooms",
  homeButtonLabel: "Подробнее",
  id: crypto.randomUUID(),
  isActive: true,
  price: "",
  showOnHomepage: false,
  sortOrder,
  title: "",
});

export const AdminRoomCardsForm = ({
  items,
}: {
  readonly items?: SiteContentItem[];
}) => {
  const save = useSaveAdminSiteContent();
  const form = useForm<RoomCardsFormValues>({
    defaultValues: getRoomCardDefaults(items),
  });
  const cards = useFieldArray({ control: form.control, name: "items" });

  return (
    <Form
      className="space-y-5"
      form={form}
      onSubmit={(values) =>
        save.mutate({
          content: { items: serializeRoomCards(values) },
          itemKey: "cards",
          position: 0,
          section: "rooms",
          status: "published",
          title: "Карточки номеров",
        })
      }
    >
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-brand-foreground p-5 shadow-sm sm:flex-row sm:items-start sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-brand">Проживание</h2>
          <p className="mt-1 text-sm leading-6 text-muted-ui-foreground">
            Управляйте карточками номеров, их оснащением и фотогалереями.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => cards.append(createEmptyRoom(cards.fields.length))}
            variant="secondary"
          >
            <Plus className="size-4" />
            Добавить номер
          </Button>
          <Button disabled={save.isPending} type="submit">
            <Save className="size-4" />
            Сохранить карточки
          </Button>
        </div>
      </header>

      {cards.fields.map((card, index) => (
        <AdminRoomCardFields
          form={form}
          index={index}
          key={card.id}
          onRemove={() => cards.remove(index)}
        />
      ))}
    </Form>
  );
};

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import type { AdminClientDetail } from "@/lib/admin/admin-api";
import { useUpdateAdminClient } from "@/lib/admin/useAdmin";

export const AdminClientEditModal = ({
  client,
  onClose,
  open,
}: {
  readonly client: AdminClientDetail;
  readonly onClose: () => void;
  readonly open: boolean;
}) => {
  const update = useUpdateAdminClient();
  const [fullName, setFullName] = useState(client.fullName ?? "");
  const [phone, setPhone] = useState(
    client.phone.startsWith("email:") ? "" : client.phone,
  );
  const [email, setEmail] = useState(client.email ?? "");

  const submit = () => {
    update.mutate(
      {
        email: email.trim() || null,
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        recordId: client.id,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      closeLabel="Закрыть редактирование клиента"
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Отмена
          </Button>
          <Button
            disabled={
              update.isPending ||
              !fullName.trim() ||
              (!phone.trim() && !email.trim())
            }
            onClick={submit}
          >
            Сохранить
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title="Редактировать клиента"
    >
      <div className="space-y-4">
        <TextField
          label="Имя"
          onChange={(event) => setFullName(event.target.value)}
          placeholder="..."
          value={fullName}
        />
        <TextField
          label="Телефон"
          onChange={(event) => setPhone(event.target.value)}
          placeholder="..."
          value={phone}
        />
        <TextField
          label="Почта"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="..."
          type="email"
          value={email}
        />
      </div>
    </Modal>
  );
};

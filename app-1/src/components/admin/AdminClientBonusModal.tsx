import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { TextField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import type { AdminClientDetail } from "@/lib/admin/admin-api";
import { useUpdateClientBonus } from "@/lib/admin/useAdmin";

type BonusLevel = "standard" | "silver" | "gold";
const LEVEL_OPTIONS = [
  { label: "Standard", value: "standard" },
  { label: "Silver", value: "silver" },
  { label: "Gold", value: "gold" },
] as const;

export const AdminClientBonusModal = ({
  client,
  onClose,
  open,
}: {
  readonly client: AdminClientDetail;
  readonly onClose: () => void;
  readonly open: boolean;
}) => {
  const update = useUpdateClientBonus();
  const currentLevel = LEVEL_OPTIONS.some(
    (option) => option.value === client.bonusProgram?.level,
  )
    ? (client.bonusProgram?.level as BonusLevel)
    : "standard";
  const [level, setLevel] = useState<BonusLevel>(currentLevel);
  const [balance, setBalance] = useState(
    String(client.bonusProgram?.balance ?? 0),
  );

  const submit = () => {
    update.mutate(
      {
        balance: Math.max(0, Number.parseInt(balance, 10) || 0),
        level,
        recordId: client.id,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      className="max-w-xl"
      closeLabel="Закрыть изменение бонусной программы"
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Отмена
          </Button>
          <Button disabled={update.isPending} onClick={submit}>
            Сохранить
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title="Изменить бонусную программу"
    >
      <div className="space-y-4">
        <div>
          <span className="mb-2 block text-sm font-medium">Уровень</span>
          <DropdownSelect<BonusLevel>
            ariaLabel="Уровень бонусной программы"
            onChange={setLevel}
            options={LEVEL_OPTIONS}
            triggerClassName="min-h-12 rounded-xl border border-line bg-page px-4 text-sm"
            value={level}
          />
        </div>
        <TextField
          label="Бонусный баланс"
          min={0}
          onChange={(event) => setBalance(event.target.value)}
          placeholder="..."
          type="number"
          value={balance}
        />
      </div>
    </Modal>
  );
};

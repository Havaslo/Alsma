import { LeadRequestModal } from "@/components/site/LeadRequestModal";

export type SpaRequestOpenHandler = () => void;

type SpaRequestModalProps = {
  readonly formCode?: string;
  readonly onClose: () => void;
  readonly open: boolean;
  readonly procedureName?: string;
  readonly sourcePage?: string;
};

export const SpaRequestModal = ({
  formCode = "spa-request",
  onClose,
  open,
  procedureName,
  sourcePage = "spa",
}: SpaRequestModalProps) => (
  <LeadRequestModal
    commentPlaceholder={
      procedureName
        ? "Дополнительная информация по записи"
        : "Напишите, на какую процедуру хотите записаться"
    }
    contextText={procedureName ? `Запись на: ${procedureName}` : undefined}
    description="Оставьте контакты, и мы поможем подобрать удобное время и подходящую процедуру."
    eyebrow={procedureName ? "Запись на процедуру" : "Заявка на SPA"}
    formCode={formCode}
    formTitle={
      procedureName
        ? `Запись на процедуру: ${procedureName}`
        : "Запись на SPA-процедуру"
    }
    onClose={onClose}
    open={open}
    sourcePage={sourcePage}
    title="Записаться на процедуру"
  />
);

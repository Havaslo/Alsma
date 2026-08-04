import { useState } from "react";

import { Expand } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";

export type ImagePreviewProps = {
  readonly alt: string;
  readonly className?: string;
  readonly src: string;
};

export const ImagePreview = ({ alt, className, src }: ImagePreviewProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        aria-label={`Preview ${alt}`}
        className={cn(
          "group relative block overflow-hidden rounded-3xl border border-border/70 bg-muted shadow-sm shadow-foreground/5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-foreground/10 focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:outline-none",
          className,
        )}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <img alt={alt} className="size-full object-cover" src={src} />
        <span className="absolute right-3 bottom-3 grid size-10 place-items-center rounded-xl bg-background/85 text-foreground opacity-0 shadow-lg backdrop-blur-md transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <Expand aria-hidden="true" className="size-4" />
        </span>
      </button>
      <Modal
        className="max-w-5xl"
        onClose={() => setIsOpen(false)}
        open={isOpen}
        title={alt}
      >
        <img
          alt={alt}
          className="max-h-[75vh] w-full object-contain"
          src={src}
        />
      </Modal>
    </>
  );
};

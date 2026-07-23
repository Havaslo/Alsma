import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { Image, Inbox, Info, Plus } from "lucide-react";
import { toast } from "sonner";

import previewLandscape from "@/assets/preview-landscape.svg";
import { AutoFilter, type AutoFilterValues } from "@/components/AutoFilter";
import { EmptyState } from "@/components/EmptyState";
import { FilterTrigger } from "@/components/FilterTrigger";
import { Form } from "@/components/Form";
import { ImagePreview } from "@/components/ImagePreview";
import { MapView } from "@/components/MapView";
import { Shell } from "@/components/Shell";
import { CardCarousel } from "@/components/carousel/CardCarousel";
import { Chat } from "@/components/chat/Chat";
import type {
  ChatMessage,
  ChatSubmitInput,
} from "@/components/chat/chat-types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Calendar } from "@/components/ui/Calendar";
import { Checkbox } from "@/components/ui/Checkbox";
import { DateInput } from "@/components/ui/DateInput";
import { Input } from "@/components/ui/Input";
import { Loader } from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import { Tooltip } from "@/components/ui/Tooltip";
import { ThemeToggle } from "@/lib/theme/ThemeToggle";
import {
  type FormValues,
  filterFields,
  formSchema,
  initialFilterValues,
  initialMessages,
  mapCenter,
  mapMarkers,
  navigationItems,
  planOptions,
  projectActions,
  projectColumns,
  projects,
  roleOptions,
} from "@/pages/showcase-data";

const FieldError = ({ message }: { readonly message?: string }) => {
  if (!message) return null;
  return <p className="mt-1 text-sm text-destructive">{message}</p>;
};
export const ShowcasePage = () => {
  const form = useForm<FormValues>({
    defaultValues: {
      email: "",
      name: "",
      notes: "",
      password: "",
      plan: "starter",
      role: "designer",
      updates: true,
      visible: false,
    },
    resolver: zodResolver(formSchema),
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] =
    useState<readonly ChatMessage[]>(initialMessages);
  const [filterValues, setFilterValues] =
    useState<AutoFilterValues>(initialFilterValues);
  const [selectedProjectAction, setSelectedProjectAction] =
    useState("Duplicate project");
  const query = String(filterValues.query ?? "")
    .trim()
    .toLowerCase();
  const status = String(filterValues.status ?? "all");
  const filteredProjects = projects.filter(
    (project) =>
      (!query || project.name.toLowerCase().includes(query)) &&
      (status === "all" || project.status.toLowerCase() === status),
  );
  const activeFilterCount = Number(Boolean(query)) + Number(status !== "all");
  const submitMessage = async ({ files, text }: ChatSubmitInput) => {
    const attachmentText = files.length
      ? `\n\nAttached: ${files.map((file) => file.name).join(", ")}`
      : "";
    setMessages((current) => [
      ...current,
      {
        content: `${text}${attachmentText}`,
        id: crypto.randomUUID(),
        role: "user",
      },
    ]);
    setIsSending(true);
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    setMessages((current) => [
      ...current,
      {
        content:
          "This local preview is ready to be replaced by an AI SDK transport.",
        id: crypto.randomUUID(),
        role: "assistant",
      },
    ]);
    setIsSending(false);
  };
  const dataTabs = [
    {
      content: (
        <Table
          columns={projectColumns}
          data={filteredProjects}
          getRowKey={(row) => row.name}
        />
      ),
      label: "Projects",
      value: "projects",
    },
    {
      content: (
        <Table
          columns={projectColumns}
          data={[]}
          emptyMessage="New projects will appear here."
          getRowKey={(row) => row.name}
        />
      ),
      label: "Empty state",
      value: "empty",
    },
  ] as const;
  return (
    <Shell
      header={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="font-heading text-lg font-semibold">Components</span>
          <ThemeToggle />
        </div>
      }
      sidebar={
        <>
          <div className="mb-10 flex items-center gap-3 px-2 pt-1">
            <div className="grid size-11 place-items-center rounded-2xl bg-brand font-bold text-brand-foreground shadow-sm shadow-brand/20">
              A
            </div>
            <div>
              <p className="font-semibold">Amazi</p>
              <p className="text-xs text-muted-ui-foreground">UI scaffold</p>
            </div>
          </div>
          <nav aria-label="Component preview" className="grid gap-1">
            {navigationItems.map(({ href, icon: Icon, label }, index) => (
              <a
                className={
                  index === 0
                    ? "flex items-center gap-3 rounded-2xl bg-brand px-3 py-3 text-sm font-semibold text-brand-foreground shadow-sm shadow-brand/20"
                    : "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-muted-ui-foreground transition hover:bg-muted-ui/60 hover:text-panel-foreground"
                }
                href={href}
                key={href}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </a>
            ))}
          </nav>
        </>
      }
    >
      <section
        className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,32rem),1fr))] items-stretch gap-6"
        id="components"
      >
        <div className="col-span-full grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4">
          {projects.map((project) => (
            <StatCard
              change={project.status}
              key={project.name}
              label={`Owned by ${project.owner}`}
              value={project.name}
            />
          ))}
        </div>
        <div className="contents">
          <article
            className="rounded-3xl border border-line/70 bg-panel/85 p-5 text-panel-foreground shadow-sm shadow-page-foreground/5 sm:p-6"
            id="forms"
          >
            <Form
              className="space-y-4"
              form={form}
              onSubmit={(values) =>
                toast.success(`Thanks, ${values.name}. The form works.`)
              }
            >
              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Name
                  <Input
                    aria-invalid={Boolean(form.formState.errors.name)}
                    placeholder="Ada Lovelace"
                    {...form.register("name")}
                  />
                  <FieldError message={form.formState.errors.name?.message} />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Email
                  <Input
                    aria-invalid={Boolean(form.formState.errors.email)}
                    placeholder="ada@example.com"
                    type="email"
                    {...form.register("email")}
                  />
                  <FieldError message={form.formState.errors.email?.message} />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Password
                  <PasswordInput
                    aria-invalid={Boolean(form.formState.errors.password)}
                    placeholder="At least eight characters"
                    {...form.register("password")}
                  />
                  <FieldError
                    message={form.formState.errors.password?.message}
                  />
                </label>
                <div className="grid gap-2 text-sm font-medium">
                  <span>Plan</span>
                  <Controller
                    control={form.control}
                    name="plan"
                    render={({ field }) => (
                      <Select
                        aria-label="Plan"
                        name={field.name}
                        onBlur={field.onBlur}
                        onValueChange={field.onChange}
                        options={planOptions}
                        ref={field.ref}
                        value={field.value}
                      />
                    )}
                  />
                </div>
              </div>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <RadioGroup
                    className="grid gap-2 space-y-0 md:grid-cols-3 [&>legend]:md:col-span-3"
                    legend="Your role"
                    name={field.name}
                    onBlur={field.onBlur}
                    onValueChange={field.onChange}
                    options={roleOptions}
                    value={field.value}
                  />
                )}
              />
              <label className="grid gap-2 text-sm font-medium">
                Project notes
                <Textarea
                  aria-invalid={Boolean(form.formState.errors.notes)}
                  placeholder="What are you hoping to build?"
                  rows={2}
                  {...form.register("notes")}
                />
                <FieldError message={form.formState.errors.notes?.message} />
              </label>
              <div className="flex flex-col gap-4 rounded-2xl border border-line/50 bg-muted-ui/35 p-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-3 text-sm font-medium">
                  <Checkbox {...form.register("updates")} />
                  Send product updates
                </label>
                <label className="flex items-center justify-between gap-3 text-sm font-medium sm:justify-start">
                  Public profile
                  <Toggle
                    aria-label="Make profile public"
                    {...form.register("visible")}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="submit">Submit example</Button>
                <Button onClick={() => form.reset()} variant="secondary">
                  Reset
                </Button>
              </div>
            </Form>
          </article>
          <div className="contents" id="controls">
            <article className="rounded-3xl border border-line/70 bg-panel/85 p-5 text-panel-foreground shadow-sm shadow-page-foreground/5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <Button className="w-full" onClick={() => setIsModalOpen(true)}>
                  <Plus aria-hidden="true" className="size-4" />
                  Open modal
                </Button>
                <Button className="w-full" variant="secondary">
                  Secondary
                </Button>
                <Button className="w-full" disabled>
                  <Loader label="Saving" showLabel size="sm" />
                </Button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Select
                  aria-label="Project action"
                  onValueChange={setSelectedProjectAction}
                  options={projectActions.map((action) => ({
                    label: action,
                    value: action,
                  }))}
                  value={selectedProjectAction}
                />
                <DateInput aria-label="Project date" />
              </div>
            </article>
            <article className="relative rounded-3xl border border-line/70 bg-panel/85 p-5 text-panel-foreground shadow-sm shadow-page-foreground/5 sm:p-6">
              <div className="absolute top-5 right-5 z-10 sm:top-6 sm:right-6">
                <FilterTrigger
                  activeCount={activeFilterCount}
                  onReset={() => setFilterValues(initialFilterValues)}
                >
                  <AutoFilter
                    fields={filterFields}
                    onChange={setFilterValues}
                    values={filterValues}
                  />
                </FilterTrigger>
              </div>
              <Tabs ariaLabel="Project data examples" items={dataTabs} />
            </article>
          </div>
        </div>
        <div className="contents">
          <div className="contents">
            <article className="grid gap-5 rounded-3xl border border-line/70 bg-panel/85 p-5 text-panel-foreground shadow-sm shadow-page-foreground/5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="brand">Active</Badge>
                <Badge>Draft</Badge>
                <Badge variant="destructive">Failed</Badge>
                <Badge variant="outline">Outline</Badge>
                <Avatar alt="Ada Lovelace" />
                <Tooltip content="Keyboard and pointer accessible">
                  <Button className="size-10 p-0" variant="secondary">
                    <Info aria-hidden="true" className="size-4" />
                    <span className="sr-only">More information</span>
                  </Button>
                </Tooltip>
              </div>
              <CardCarousel
                items={projects.map((project) => ({
                  description: `Owned by ${project.owner}`,
                  eyebrow: project.status,
                  id: project.name,
                  title: project.name,
                }))}
                options={{ align: "start", loop: true }}
                slideClassName="sm:flex-[0_0_80%]"
              />
              <EmptyState
                action={<Button variant="secondary">Create item</Button>}
                className="rounded-2xl border border-line/60 bg-muted-ui/10"
                description="Create the first item to populate this section."
                icon={Inbox}
                title="Nothing here yet"
              />
            </article>
            <article className="contents" id="media">
              <ImagePreview
                alt="Abstract mountain landscape"
                className="h-full min-h-72 w-full"
                src={previewLandscape}
              />
              <Calendar />
              <div className="h-full rounded-3xl border border-line/70 bg-panel/85 p-5 text-panel-foreground shadow-sm shadow-page-foreground/5 sm:p-6">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Image aria-hidden="true" className="size-4 text-brand" />
                  Leaflet map
                </div>
                <MapView center={mapCenter} markers={mapMarkers} />
              </div>
            </article>
          </div>
          <div className="h-full [&>section]:h-full" id="chat">
            <Chat
              assistantName="Amazi"
              isSending={isSending}
              messages={messages}
              onSubmit={submitMessage}
              title="Assistant"
            />
          </div>
        </div>
      </section>
      <Modal
        footer={
          <>
            <Button onClick={() => setIsModalOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>Confirm</Button>
          </>
        }
        onClose={() => setIsModalOpen(false)}
        open={isModalOpen}
        title="Example modal"
      >
        <p className="text-muted-ui-foreground">Modal content</p>
      </Modal>
    </Shell>
  );
};

import type { ComponentPropsWithRef, Key, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type TableColumn<TData> = {
  readonly cellClassName?: string;
  readonly headerClassName?: string;
  readonly header: ReactNode;
  readonly key: string;
  readonly render: (row: TData, rowIndex: number) => ReactNode;
};

export type TableProps<TData> = Omit<
  ComponentPropsWithRef<"table">,
  "children"
> & {
  readonly caption?: ReactNode;
  readonly columns: readonly TableColumn<TData>[];
  readonly data: readonly TData[];
  readonly emptyMessage?: ReactNode;
  readonly getRowKey: (row: TData, rowIndex: number) => Key;
};

export const Table = <TData,>({
  caption,
  className,
  columns,
  data,
  emptyMessage = "No data available.",
  getRowKey,
  ...props
}: TableProps<TData>) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line/70 bg-panel/70 shadow-sm shadow-page-foreground/5">
      <table
        className={cn(
          "w-full border-collapse text-left text-sm text-panel-foreground",
          className,
        )}
        {...props}
      >
        {caption && (
          <caption className="border-b border-line/60 px-5 py-4 text-left font-heading font-semibold tracking-tight">
            {caption}
          </caption>
        )}
        <thead className="border-b border-line/60 bg-muted-ui/45 text-muted-ui-foreground">
          <tr>
            {columns.map((column) => (
              <th
                className={cn(
                  "px-5 py-3.5 text-xs font-semibold tracking-wider uppercase",
                  column.headerClassName,
                )}
                key={column.key}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {data.map((row, rowIndex) => (
            <tr
              className="transition-colors hover:bg-brand/5"
              key={getRowKey(row, rowIndex)}
            >
              {columns.map((column) => (
                <td
                  className={cn("px-5 py-4", column.cellClassName)}
                  key={column.key}
                >
                  {column.render(row, rowIndex)}
                </td>
              ))}
            </tr>
          ))}
          {!data.length && (
            <tr>
              <td
                className="px-5 py-10 text-center text-muted-ui-foreground"
                colSpan={columns.length}
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

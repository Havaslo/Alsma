import type { ComponentPropsWithRef, Key, ReactNode } from "react";

export type TableColumn<TData> = {
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
  columns,
  data,
  emptyMessage = "No data available.",
  getRowKey,
  ...props
}: TableProps<TData>) => {
  return (
    <table {...props}>
      {caption && <caption>{caption}</caption>}
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col">
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={getRowKey(row, rowIndex)}>
            {columns.map((column) => (
              <td key={column.key}>{column.render(row, rowIndex)}</td>
            ))}
          </tr>
        ))}
        {!data.length && (
          <tr>
            <td colSpan={columns.length}>{emptyMessage}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

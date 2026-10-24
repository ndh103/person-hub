import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A small in-memory stand-in for the Supabase query builder, for testing the
 * service functions' own logic (bucketing, grouping, mapping) against plain
 * rows. It applies the filters, ordering, limits and counts the services use.
 * It does not model RLS or PostgREST: authorization is tested against real
 * Postgres in supabase/tests.
 */
type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1; // nulls last, as Postgres sorts ascending
  if (b === null || b === undefined) return -1;
  return (a as string | number) < (b as string | number) ? -1 : 1;
}

function parseValue(raw: string): unknown {
  return raw === "null" ? null : raw;
}

/** PostgREST `or` syntax: "a.op.v,b.op.v,and(c.op.v,d.op.v)". */
function parseOr(text: string): Filter {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += char;
  }
  parts.push(current);
  const filters = parts.map((part): Filter => {
    if (part.startsWith("and(")) {
      const inner = part.slice(4, -1);
      const all = inner.split(",").map((piece) => condition(piece));
      return (row) => all.every((filter) => filter(row));
    }
    return condition(part);
  });
  return (row) => filters.some((filter) => filter(row));
}

function condition(text: string): Filter {
  const [column, op, ...rest] = text.split(".");
  return operator(column, op, parseValue(rest.join(".")));
}

function operator(column: string, op: string, value: unknown): Filter {
  switch (op) {
    case "eq":
      return (row) => row[column] === value;
    case "neq":
      return (row) => row[column] !== value;
    case "is":
      return (row) => (value === null ? row[column] === null || row[column] === undefined : row[column] === value);
    case "gt":
      return (row) => row[column] !== null && row[column] !== undefined && compare(row[column], value) > 0;
    case "gte":
      return (row) => row[column] !== null && row[column] !== undefined && compare(row[column], value) >= 0;
    case "lt":
      return (row) => row[column] !== null && row[column] !== undefined && compare(row[column], value) < 0;
    case "lte":
      return (row) => row[column] !== null && row[column] !== undefined && compare(row[column], value) <= 0;
    default:
      throw new Error(`table stub: unsupported operator ${op}`);
  }
}

export function tableStub(tables: Record<string, Row[]>): SupabaseClient {
  return {
    from(table: string) {
      const filters: Filter[] = [];
      const orders: { column: string; ascending: boolean }[] = [];
      let limit = Infinity;
      let offset = 0;
      let count = false;
      let head = false;

      function run() {
        let rows = (tables[table] ?? []).filter((row) => filters.every((filter) => filter(row)));
        const total = rows.length;
        rows = [...rows].sort((a, b) => {
          for (const order of orders) {
            const result = compare(a[order.column], b[order.column]);
            if (result) return order.ascending ? result : -result;
          }
          return 0;
        });
        rows = rows.slice(offset, offset + limit);
        return { data: head ? null : rows, error: null, count: count ? total : null };
      }

      const builder = {
        select(_columns?: string, options?: { count?: string; head?: boolean }) {
          count = options?.count === "exact";
          head = options?.head === true;
          return builder;
        },
        eq: (column: string, value: unknown) => (filters.push(operator(column, "eq", value)), builder),
        neq: (column: string, value: unknown) => (filters.push(operator(column, "neq", value)), builder),
        is: (column: string, value: unknown) => (filters.push(operator(column, "is", value)), builder),
        gt: (column: string, value: unknown) => (filters.push(operator(column, "gt", value)), builder),
        gte: (column: string, value: unknown) => (filters.push(operator(column, "gte", value)), builder),
        lt: (column: string, value: unknown) => (filters.push(operator(column, "lt", value)), builder),
        lte: (column: string, value: unknown) => (filters.push(operator(column, "lte", value)), builder),
        in: (column: string, values: unknown[]) => (filters.push((row) => values.includes(row[column])), builder),
        not: (column: string, op: string, value: unknown) => {
          const inner = operator(column, op, value);
          filters.push((row) => !inner(row));
          return builder;
        },
        or: (text: string) => (filters.push(parseOr(text)), builder),
        order: (column: string, options?: { ascending?: boolean }) => (orders.push({ column, ascending: options?.ascending !== false }), builder),
        limit: (value: number) => ((limit = value), builder),
        range: (from: number, to: number) => ((offset = from), (limit = to - from + 1), builder),
        maybeSingle: () => {
          const result = run();
          return Promise.resolve({ data: (result.data ?? [])[0] ?? null, error: null });
        },
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
          try {
            return Promise.resolve(resolve(run()));
          } catch (error) {
            return reject ? Promise.resolve(reject(error)) : Promise.reject(error);
          }
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

/** Bounded, ordered reads: never return a partial result after a failed page. */
export interface PagedRead<Row> extends PromiseLike<{ data: Row[] | null; error: unknown }> {
  order(column: string, options?: { ascending?: boolean }): PagedRead<Row>;
  range(from: number, to: number): PagedRead<Row>;
}

export async function readAllRows<Row>(createQuery: () => PagedRead<Row>, orderColumn = 'id'): Promise<Row[]> {
  const rows: Row[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await createQuery().order(orderColumn).range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Required read unavailable: expected a complete row page.');
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

/** Keep related-ID URLs bounded while exhausting every matching page per batch. */
export async function readRowsByIds<Row>(ids: string[], createQuery: (batch: string[]) => PagedRead<Row>, orderColumn = 'id'): Promise<Row[]> {
  const unique = [...new Set(ids)];
  const rows: Row[] = [];
  for (let offset = 0; offset < unique.length; offset += 100) {
    const batch = unique.slice(offset, offset + 100);
    rows.push(...await readAllRows(() => createQuery(batch), orderColumn));
  }
  return rows;
}

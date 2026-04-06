/** Últimos bonos registrados (una barra por registro). */
export type RecentBonusBarPoint = {
  id: string;
  label: string;
  amount: number;
  detail: string;
};

/** Resúmenes subidos agrupados por mes de carga (createdAt). */
export type StatementUploadMonthPoint = {
  key: string;
  label: string;
  uploadCount: number;
  totalImportedArs: number;
};

/** Ingreso total del mes (neto + bonos) vs gasto importado desde resúmenes (mes de operación). */
export type IncomeVsImportedPoint = {
  key: string;
  label: string;
  totalIncome: number;
  importedCardSpending: number;
};

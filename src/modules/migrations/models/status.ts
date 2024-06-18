export type Operation = "run" | "rollback";

export type MigrationStatus = Readonly<{
  name: string;
  success: boolean;
  order: number | Date;
  time: Date;
  lastOperation?: Operation;
}>;

export type Status = Record<string, MigrationStatus[]>;

export type SaveStatusType = (data: Status) => Promise<void>;
export type ReadStatusType = () => Promise<Status>;

export type StatusPlugin = {
  saveStatus: SaveStatusType;
  readStatus: ReadStatusType;
};

export const isMigrationStatus = (obj: unknown): obj is MigrationStatus =>
  typeof obj === "object"
  && obj !== null
  && "name" in obj
  && typeof obj.name === "string"
  && "success" in obj
  && typeof obj.success === "boolean"
  && "order" in obj
  && (typeof obj.order === "number" || obj.order instanceof Date)
  && "time" in obj
  && obj.time instanceof Date
  && (!("lastOperation" in obj) || (obj.lastOperation === "run" || obj.lastOperation === "rollback")); // implication

export const isStatus = (obj: unknown): obj is Status =>
  typeof obj === "object" && obj !== null
  && Object.entries(obj).every(([, value]) => Array.isArray(value) && value.every(isMigrationStatus));

export const isStatusPlugin = (obj: unknown): obj is StatusPlugin =>
  typeof obj === "object"
  && obj !== null
  && "saveStatus" in obj
  && typeof obj.saveStatus === "function"
  && obj.saveStatus.length === 0
  && "readStatus" in obj
  && typeof obj.readStatus === "function"
  && obj.readStatus.length === 1;

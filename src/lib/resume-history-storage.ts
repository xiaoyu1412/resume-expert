import type { ResumeProject } from "@/types/resume-history";

const DB_NAME = "resume-expert-history";
const STORE_NAME = "resume-projects";
const DB_VERSION = 1;

function openHistoryDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("当前浏览器不支持本地历史记录"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("历史记录数据库打开失败"));
    request.onblocked = () => reject(new Error("历史记录数据库正在被其他页面占用"));
  });
}

function runProjectTransaction<T>(
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openHistoryDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = executor(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("历史记录操作失败"));
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error("历史记录保存失败"));
        };
      })
  );
}

export async function listResumeProjects(): Promise<ResumeProject[]> {
  const projects = await runProjectTransaction<ResumeProject[]>("readonly", (store) =>
    store.getAll()
  );

  return projects.sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}

export async function getResumeProject(id: string): Promise<ResumeProject | null> {
  const project = await runProjectTransaction<ResumeProject | undefined>("readonly", (store) =>
    store.get(id)
  );
  return project ?? null;
}

export async function putResumeProject(project: ResumeProject): Promise<void> {
  await runProjectTransaction<IDBValidKey>("readwrite", (store) => store.put(project));
}

export async function removeResumeProject(id: string): Promise<void> {
  await runProjectTransaction<undefined>("readwrite", (store) => store.delete(id));
}

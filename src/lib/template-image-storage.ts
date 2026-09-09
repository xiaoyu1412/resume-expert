type TemplateImageKey = "avatarImage" | "backgroundImage";

const DB_NAME = "resume-expert-assets";
const STORE_NAME = "template-images";
const DB_VERSION = 1;

function openTemplateImageDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("当前浏览器不支持 IndexedDB"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB 打开失败"));
  });
}

function runImageTransaction<T>(
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openTemplateImageDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = executor(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("图片存储失败"));
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error("图片存储失败"));
        };
      })
  );
}

export async function getTemplateImage(key: TemplateImageKey): Promise<string | null> {
  try {
    const result = await runImageTransaction<string | undefined>("readonly", (store) =>
      store.get(key)
    );
    return result ?? null;
  } catch {
    return null;
  }
}

export async function setTemplateImage(key: TemplateImageKey, value: string | null) {
  try {
    if (value) {
      await runImageTransaction<IDBValidKey>("readwrite", (store) => store.put(value, key));
    } else {
      await runImageTransaction<undefined>("readwrite", (store) => store.delete(key));
    }
  } catch {
    // 图片仍保留在当前内存状态中；失败只影响下次打开后的记忆。
  }
}

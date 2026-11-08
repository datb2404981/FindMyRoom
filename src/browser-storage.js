let database
let writes = Promise.resolve()
const largeDatasets = new Set()

function openDatabase() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open('findmyroom-storage', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('datasets')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Không mở được bộ nhớ ảnh. Hãy đóng các tab cũ rồi thử lại.'))
  })
  return database
}

async function dataset(key, value) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('datasets', value === undefined ? 'readonly' : 'readwrite')
    const store = transaction.objectStore('datasets')
    const request = value === undefined ? store.get(key) : store.put(value, key)
    transaction.oncomplete = () => resolve(request.result)
    transaction.onabort = () => reject(transaction.error || new Error('Không lưu được dữ liệu ảnh.'))
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function readBrowserData(key) {
  await writes.catch(() => {})
  let value
  try { value = await dataset(key) } catch {}
  if (value != null) { largeDatasets.add(key); return JSON.parse(value) }
  try { return JSON.parse(localStorage.getItem(key) || '{}') || {} } catch { return {} }
}

export function writeBrowserData(key, data) {
  const serialized = JSON.stringify(data)
  const write = writes.catch(() => {}).then(async () => {
    if (!largeDatasets.has(key)) {
      try { localStorage.setItem(key, serialized); return } catch {}
    }
    // Commit the replacement before removing the old localStorage snapshot.
    await dataset(key, serialized)
    largeDatasets.add(key)
    try { localStorage.removeItem(key) } catch {}
  })
  writes = write
  return write
}

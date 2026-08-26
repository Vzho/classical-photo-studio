export interface StoreSelectionItem {
  id: string
  name: string
}

export interface StoreSelection<T extends StoreSelectionItem> {
  store: T | null
  pickerIndex: number
  storeId: string
  storeName: string
}

export function resolveStoreSelection<T extends StoreSelectionItem>(
  stores: T[],
  selectedStoreId: string
): StoreSelection<T> {
  const selectedStore = stores.length === 1
    ? stores[0]
    : stores.find(item => item.id === selectedStoreId) || null
  const storeIndex = selectedStore ? stores.findIndex(item => item.id === selectedStore.id) : -1

  return {
    store: selectedStore,
    pickerIndex: storeIndex >= 0 ? storeIndex + 1 : 0,
    storeId: selectedStore?.id || '',
    storeName: selectedStore?.name || ''
  }
}

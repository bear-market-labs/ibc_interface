const KEY_SEP: string = '__'

export function getStorageKey(address: string, field: string){
  return address + KEY_SEP + field
}

export function keyToParts(key: string){
  return key.split(KEY_SEP).length > 1 ? {
    address: key.split(KEY_SEP)[0],
    field: key.split(KEY_SEP)[1]
  } : {address: '', field: ''}
}

export function fetchFromLocal(key: string){
  return window.localStorage.getItem(key)
}

export function cacheToLocal(key: string, value: string){
  window.localStorage.setItem(key, value)
}
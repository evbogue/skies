const url = 'http://localhost:8000/'

export const cachekv = async (appId) => {
  if ('caches' in globalThis) {
    const obj = {}
    const cache = await caches.open(appId)

    obj.get = async function (key) {
      const file = await cache.match(url + key)
      try {
        const string = await file.text()
        
        return string
      } catch (err) {
        return undefined
      }
    }
    
    obj.put = async function (key, string) {
      await cache.delete(url + key)
      await cache.put(url + key, new Response(string))
    }
    
    obj.rm = async function (key) {
      await cache.delete(url + key)
    }
  
    obj.clear = async function () {
      await caches.delete(appId)
    }
    return obj
  } else {
    console.log('No Cache API available')
  }
}


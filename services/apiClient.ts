interface ApiClient {
  <T>(url: string, config: {}): Promise<T>
}

const urlPrefix = 'api/'

const apiClient: ApiClient = async (url, config) => {
  const res = await fetch(urlPrefix + url, config)
  return res.json()
}

export const get = <T>(
  url: string,
  params?: { [k: string]: any }
): Promise<T> => {
  let newUrl = url
  if (params) {
    let querystr = Object.keys(params)
      .map((key) => `${key}=${params[key]}`)
      .join('&')
    const joiner = url.includes('?') ? '&' : '?'
    newUrl += joiner + querystr
  }
  return apiClient<T>(newUrl, {
    methods: 'GET',
  })
}

export const handleError = (error: unknown) => {
  console.log(error)
}

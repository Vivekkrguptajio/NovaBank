import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from './api/client'

/**
 * Small data-loading hook:  const { data, loading, error, reload } = useLoad(() => accountApi.mine(), [])
 */
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fn, deps)

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }))
    return load()
      .then((data) => setState({ data, loading: false, error: '' }))
      .catch((e) => setState({ data: null, loading: false, error: errorMessage(e) }))
  }, [load])

  useEffect(() => { reload() }, [reload])

  return { ...state, reload }
}

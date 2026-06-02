import { useState, useEffect } from 'react'
import { load } from '../constants.js'

export function useLocalState(key, fallback) {
  const [value, setValue] = useState(() => load(key, fallback))
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)) }, [key, value])
  return [value, setValue]
}

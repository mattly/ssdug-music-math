import { useState, useEffect } from 'react'

export default () => {
  const [context] = useState(new window.AudioContext())
  useEffect(() => {
    return () => { context.close() }
  }, [])
  return context
}
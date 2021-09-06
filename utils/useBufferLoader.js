import { useState, useEffect } from 'react'

const loadBuffer = (context, sound) =>
  fetch(`/sounds/${sound}.wav`)
    .then(response => response.arrayBuffer())
    .then(buffer => context.decodeAudioData(buffer))
    .catch(err => console.error(sound, err))

const addBuffer = (def, buf) => {
  def.buffer = buf
  return def
}

export default (context, soundDefs) => {
  const [buffers, setBuffers] = useState()
  useEffect(
    () => {
      if (!buffers) {
        Promise
          .all(soundDefs.map(({ name }) => loadBuffer(context, name)))
          .then(buffers => setBuffers(soundDefs.map((def, i) => addBuffer(def, buffers[i]))))
      }
    },
    [soundDefs]
  )
  return buffers
}

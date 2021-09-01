export default (context, def) => {
  // these are cheap to create, can only be played once:
  // https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
    const source = context.createBufferSource()
    source.buffer = def.buffer

    const gain = context.createGain()
    gain.gain.setValueAtTime(def.gain || 0.5, context.currentTime)

    source.connect(gain)
    gain.connect(context.destination)
    return { source, gain }
  }


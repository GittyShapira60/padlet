import { useEffect, useRef } from 'react'
import { getSocket } from '../../padlet/hooks/useSocket'

export function useMentiAudience(
  sessionId: string | undefined,
  handlers: {
    onSlideChange: (slideIndex: number) => void
    onSessionEnd: () => void
    onResultsUpdate?: (data: { slideId: string; results: unknown }) => void
    onVotingStateChange?: (isVotingOpen: boolean) => void
    onResultsVisibilityChange?: (resultsVisible: boolean) => void
  },
) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!sessionId) return
    const s = getSocket()
    s.emit('menti:session:join', { sessionId, role: 'audience' })

    const onSlideChange = (data: { slideIndex: number }) =>
      handlersRef.current.onSlideChange(data.slideIndex)
    const onSessionEnd = () => handlersRef.current.onSessionEnd()
    const onResultsUpdate = (data: { slideId: string; results: unknown }) =>
      handlersRef.current.onResultsUpdate?.(data)
    const onVotingState = (data: { isVotingOpen: boolean }) =>
      handlersRef.current.onVotingStateChange?.(data.isVotingOpen)
    const onResultsVisibility = (data: { resultsVisible: boolean }) =>
      handlersRef.current.onResultsVisibilityChange?.(data.resultsVisible)

    s.on('menti:slide:change', onSlideChange)
    s.on('menti:session:end', onSessionEnd)
    s.on('menti:results:update', onResultsUpdate)
    s.on('menti:voting:state', onVotingState)
    s.on('menti:results:visibility', onResultsVisibility)

    return () => {
      s.emit('menti:session:leave', { sessionId, role: 'audience' })
      s.off('menti:slide:change', onSlideChange)
      s.off('menti:session:end', onSessionEnd)
      s.off('menti:results:update', onResultsUpdate)
      s.off('menti:voting:state', onVotingState)
      s.off('menti:results:visibility', onResultsVisibility)
    }
  }, [sessionId])
}

export function useMentiPresenter(
  sessionId: string | undefined,
  onResultsUpdate: (data: { slideId: string; results: unknown }) => void,
) {
  const cbRef = useRef(onResultsUpdate)
  cbRef.current = onResultsUpdate

  useEffect(() => {
    if (!sessionId) return
    const s = getSocket()
    s.emit('menti:session:join', { sessionId, role: 'presenter' })

    const handler = (data: { slideId: string; results: unknown }) => cbRef.current(data)
    s.on('menti:results:update', handler)

    return () => {
      s.emit('menti:session:leave', { sessionId, role: 'presenter' })
      s.off('menti:results:update', handler)
    }
  }, [sessionId])
}

'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Hand, Users, Copy, Check,
  ScreenShare, ScreenShareOff, ArrowRight, Radio,
  Circle, Square, Download, Eraser, Pen, Undo2, Trash2, Image as ImageIcon,
  Palette, X, ChevronUp, Sparkles, Smile,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface SessionInfo {
  id: string
  title: string
  room_code: string
  status: string
  teacher_id: string
}

interface Participant {
  id: string
  user_id: string
  name: string
  is_hand_raised: boolean
  joined_at: string
  stream?: MediaStream
}

type SignalMessage = {
  from: string
  to: string
  type: 'offer' | 'answer' | 'ice'
  data: any
}

type BgMode = 'none' | 'blur' | 'image'

const BG_PRESETS = [
  { id: 'none', label: 'بدون', style: 'bg-muted' },
  { id: 'blur', label: 'ضبابي', style: 'bg-blue-200' },
  { id: 'image1', label: 'مسجد', url: 'https://images.pexels.com/photos/1544375/pexels-photo-1544375.jpeg?auto=compress&cs=tinysrgb&w=640', style: 'bg-emerald-200' },
  { id: 'image2', label: 'طبيعة', url: 'https://images.pexels.com/photos/1271619/pexels-photo-1271619.jpeg?auto=compress&cs=tinysrgb&w=640', style: 'bg-green-200' },
  { id: 'image3', label: 'مكتبة', url: 'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=640', style: 'bg-amber-200' },
]

const FILTER_PRESETS = [
  { id: 'none', label: 'بدون', cssFilter: 'none' },
  { id: 'grayscale', label: 'أبيض وأسود', cssFilter: 'grayscale(100%)' },
  { id: 'sepia', label: 'بني قديم', cssFilter: 'sepia(80%)' },
  { id: 'vintage', label: 'كلاسيكي', cssFilter: 'sepia(40%) contrast(120%) saturate(120%)' },
  { id: 'cool', label: 'بارد', cssFilter: 'hue-rotate(180deg) saturate(120%) brightness(105%)' },
  { id: 'warm', label: 'دافئ', cssFilter: 'sepia(30%) saturate(150%) hue-rotate(-10deg)' },
  { id: 'dramatic', label: 'درامي', cssFilter: 'contrast(140%) brightness(90%) saturate(130%)' },
]

const AVATAR_PRESETS = [
  { id: 'a1', label: 'ذهبي', color1: '#f59e0b', color2: '#dc2626' },
  { id: 'a2', label: 'أزرق', color1: '#3b82f6', color2: '#1e40af' },
  { id: 'a3', label: 'أخضر', color1: '#10b981', color2: '#047857' },
  { id: 'a4', label: 'برتقالي', color1: '#f97316', color2: '#c2410c' },
  { id: 'a5', label: 'وردي', color1: '#ec4899', color2: '#be185d' },
  { id: 'a6', label: 'فيروزي', color1: '#06b6d4', color2: '#0e7490' },
]

export default function LiveRoomPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { profile } = useAuth()
  const { toast } = useToast()
  const sessionId = Array.isArray(id) ? id[0] : id

  const [session, setSession] = useState<SessionInfo | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [camOn, setCamOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  // Virtual background
  const [bgMode, setBgMode] = useState<BgMode>('none')
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [showBgPicker, setShowBgPicker] = useState(false)

  // Camera filters
  const [cameraFilter, setCameraFilter] = useState('none')
  const [showFilterPicker, setShowFilterPicker] = useState(false)

  // Avatar mode
  const [avatarMode, setAvatarMode] = useState<string | null>(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  // Fullscreen video view
  const [fullscreen, setFullscreen] = useState<{ type: 'local' | 'remote'; userId?: string } | null>(null)
  const canvasVideoRef = useRef<HTMLCanvasElement | null>(null)
  const rawVideoRef = useRef<HTMLVideoElement | null>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const processedStreamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const selfieSegmentationRef = useRef<any>(null)
  const bgModeRef = useRef<BgMode>('none')
  const bgImageRef = useRef<HTMLImageElement | null>(null)
  const filterRef = useRef('none')
  const avatarRef = useRef<string | null>(null)
  const initialRef = useRef('?')

  // Recording
  const [recording, setRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Whiteboard
  const [showWhiteboard, setShowWhiteboard] = useState(false)
  const whiteboardRef = useRef<HTMLCanvasElement | null>(null)
  const [wbTool, setWbTool] = useState<'pen' | 'eraser'>('pen')
  const [wbColor, setWbColor] = useState('#059669')
  const [wbSize, setWbSize] = useState(3)
  const wbDrawingRef = useRef(false)
  const wbLastRef = useRef<{ x: number; y: number } | null>(null)

  const localStreamRef = useRef<MediaStream | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const participantMapRef = useRef<Map<string, Participant>>(new Map())
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const participantIdRef = useRef<string | null>(null)
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]

  // Load session
  useEffect(() => {
    if (!sessionId) return
    ;(async () => {
      const { data: sess, error: sessErr } = await supabase
        .from('live_sessions')
        .select('id, title, room_code, status, teacher_id')
        .eq('id', sessionId)
        .maybeSingle()
      if (sessErr || !sess) {
        setError('لم يتم العثور على الجلسة')
        setLoading(false)
        return
      }
      if (sess.status === 'ended') {
        setError('انتهت هذه الجلسة')
        setLoading(false)
        return
      }
      setSession(sess)
      setLoading(false)
    })()
  }, [sessionId])

  // Lazy-init MediaPipe Selfie Segmentation for real background removal
  async function getSegmentation() {
    if (!selfieSegmentationRef.current) {
      if (!(window as any).SelfieSegmentation) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.getElementById('mp-selfie-seg')
          if (existing) { resolve(); return }
          const script = document.createElement('script')
          script.id = 'mp-selfie-seg'
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js'
          script.crossOrigin = 'anonymous'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load MediaPipe'))
          document.head.appendChild(script)
        })
      }
      const SelfieSegmentation = (window as any).SelfieSegmentation
      const seg = new SelfieSegmentation({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      })
      seg.setOptions({ modelSelection: 1, selfieMode: true })
      seg.onResults((results: any) => {
        const canvas = canvasVideoRef.current
        const bgCanvas = bgCanvasRef.current
        if (!canvas || !bgCanvas) return
        const ctx = canvas.getContext('2d')!
        const bgCtx = bgCanvas.getContext('2d')!
        const w = canvas.width
        const h = canvas.height
        bgCanvas.width = w
        bgCanvas.height = h
        const mode = bgModeRef.current
        const img = bgImageRef.current
        // Draw background on main canvas
        ctx.clearRect(0, 0, w, h)
        if (mode === 'blur') {
          ctx.save()
          ctx.filter = 'blur(12px)'
          ctx.drawImage(results.image, 0, 0, w, h)
          ctx.restore()
        } else if (mode === 'image' && img) {
          ctx.drawImage(img, 0, 0, w, h)
        }
        // Extract person using mask on temp canvas
        bgCtx.clearRect(0, 0, w, h)
        bgCtx.drawImage(results.segmentationMask, 0, 0, w, h)
        bgCtx.globalCompositeOperation = 'source-in'
        bgCtx.drawImage(results.image, 0, 0, w, h)
        bgCtx.globalCompositeOperation = 'source-over'
        // Draw person on top of background (with camera filter)
        ctx.save()
        ctx.filter = filterRef.current || 'none'
        ctx.drawImage(bgCanvas, 0, 0)
        ctx.restore()
      })
      selfieSegmentationRef.current = seg
    }
    return selfieSegmentationRef.current
  }

  // Virtual background processing loop
  const startBgProcessing = useCallback(() => {
    const raw = rawVideoRef.current
    const canvas = canvasVideoRef.current
    if (!raw || !canvas) return
    const ctx = canvas.getContext('2d')!
    let processing = false
    const process = async () => {
      if (raw.readyState < 2) {
        rafRef.current = requestAnimationFrame(process)
        return
      }
      canvas.width = raw.videoWidth || 640
      canvas.height = raw.videoHeight || 360
      // Avatar mode - draw avatar instead of camera
      if (avatarRef.current) {
        const av = AVATAR_PRESETS.find(a => a.id === avatarRef.current)
        if (av) {
          const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
          grad.addColorStop(0, av.color1)
          grad.addColorStop(1, av.color2)
          ctx.filter = 'none'
          ctx.fillStyle = grad
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = 'rgba(255,255,255,0.95)'
          ctx.font = `bold ${Math.floor(canvas.height * 0.4)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(initialRef.current, canvas.width / 2, canvas.height / 2)
        }
        rafRef.current = requestAnimationFrame(process)
        return
      }
      const mode = bgModeRef.current
      if (mode === 'none') {
        ctx.save()
        ctx.filter = filterRef.current || 'none'
        ctx.drawImage(raw, 0, 0, canvas.width, canvas.height)
        ctx.restore()
        rafRef.current = requestAnimationFrame(process)
        return
      }
      if (processing) {
        rafRef.current = requestAnimationFrame(process)
        return
      }
      processing = true
      try {
        const seg = await getSegmentation()
        await seg.send({ image: raw })
      } catch {
        ctx.drawImage(raw, 0, 0, canvas.width, canvas.height)
      }
      processing = false
      rafRef.current = requestAnimationFrame(process)
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    process()
  }, [])

  // Init media and join room
  useEffect(() => {
    if (!session || !profile) return

    let cancelled = false

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 360 },
          audio: true,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        localStreamRef.current = stream

        // Set raw video for background processing
        if (rawVideoRef.current) {
          rawVideoRef.current.srcObject = stream
          rawVideoRef.current.muted = true
          rawVideoRef.current.play().catch(() => {})
        }

        // Create processed stream from canvas (for background replacement)
        const canvas = canvasVideoRef.current
        if (canvas) {
          const processedStream = canvas.captureStream(30)
          // Add original audio track
          const audioTrack = stream.getAudioTracks()[0]
          if (audioTrack) processedStream.addTrack(audioTrack)
          processedStreamRef.current = processedStream
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = processedStream
            localVideoRef.current.muted = true
          }
          // Start drawing loop
          setTimeout(() => startBgProcessing(), 500)
        }

        // Insert participant record
        const { data: p } = await supabase
          .from('live_participants')
          .insert({ session_id: session!.id, user_id: profile!.id })
          .select('id')
          .single()
        participantIdRef.current = p?.id ?? null

        // Load existing participants
        const { data: existing } = await supabase
          .from('live_participants')
          .select('id, user_id, is_hand_raised, joined_at')
          .eq('session_id', session!.id)
          .is('left_at', null)
          .neq('user_id', profile!.id)

        const names = await Promise.all(
          (existing || []).map(async (e) => {
            const { data: pf } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', e.user_id)
              .maybeSingle()
            return { ...e, name: pf?.name || 'مستخدم' } as Participant
          })
        )
        names.forEach((n) => participantMapRef.current.set(n.user_id, n))
        setParticipants(Array.from(participantMapRef.current.values()))

        // Setup realtime channel for signaling
        const channel = supabase.channel(`live-room-${session!.id}`)
        channelRef.current = channel

        channel.on('broadcast', { event: 'signal' }, (msg: any) => {
          const sig: SignalMessage = msg.payload
          if (sig.to !== profile!.id) return
          handleSignal(sig)
        })

        channel.on('broadcast', { event: 'join' }, async (msg: any) => {
          const { user_id, name } = msg.payload
          if (user_id === profile!.id) return
          if (!participantMapRef.current.has(user_id)) {
            const np: Participant = {
              id: '',
              user_id,
              name,
              is_hand_raised: false,
              joined_at: new Date().toISOString(),
            }
            participantMapRef.current.set(user_id, np)
            setParticipants(Array.from(participantMapRef.current.values()))
          }
          if (!peersRef.current.has(user_id)) {
            const shouldInitiate = profile!.id < user_id
            await createPeer(user_id, shouldInitiate)
          }
        })

        channel.on('broadcast', { event: 'leave' }, (msg: any) => {
          const { user_id } = msg.payload
          if (user_id === profile!.id) return
          participantMapRef.current.delete(user_id)
          const pc = peersRef.current.get(user_id)
          if (pc) {
            pc.close()
            peersRef.current.delete(user_id)
          }
          setParticipants(Array.from(participantMapRef.current.values()))
        })

        channel.on('broadcast', { event: 'hand' }, (msg: any) => {
          const { user_id, raised } = msg.payload
          const p = participantMapRef.current.get(user_id)
          if (p) {
            p.is_hand_raised = raised
            participantMapRef.current.set(user_id, p)
            setParticipants(Array.from(participantMapRef.current.values()))
          }
        })

        // Whiteboard realtime
        channel.on('broadcast', { event: 'wb-draw' }, (msg: any) => {
          const { x0, y0, x1, y1, color, size, tool } = msg.payload
          drawOnWhiteboard(x0, y0, x1, y1, color, size, tool, false)
        })
        channel.on('broadcast', { event: 'wb-clear' }, () => {
          clearWhiteboard(false)
        })

        await new Promise<void>((resolve, reject) => {
          let settled = false
          const unsub = channel.subscribe((status: string, err?: Error) => {
            if (settled) return
            if (status === 'SUBSCRIBED') {
              settled = true
              resolve()
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              settled = true
              reject(err || new Error('Channel subscription failed'))
            }
          })
          // Safety timeout
          setTimeout(() => {
            if (!settled) {
              settled = true
              resolve()
            }
          }, 10000)
          // Suppress unused var warning
          void unsub
        })

        channel.send({
          type: 'broadcast',
          event: 'join',
          payload: { user_id: profile!.id, name: profile!.name },
        })

        for (const p of names) {
          const shouldInitiate = profile!.id < p.user_id
          await createPeer(p.user_id, shouldInitiate)
        }

        // Periodic re-join ping for late discovery (every 5s for 30s)
        let pingCount = 0
        const pingInterval = setInterval(() => {
          if (pingCount >= 6 || !channelRef.current) {
            clearInterval(pingInterval)
            return
          }
          channelRef.current.send({
            type: 'broadcast',
            event: 'join',
            payload: { user_id: profile!.id, name: profile!.name },
          })
          pingCount++
        }, 5000)
        pingIntervalRef.current = pingInterval
      } catch (err: any) {
        setError('تعذر الوصول للكاميرا/الميكروفون. يرجى السماح بالوصول.')
        setLoading(false)
      }
    }

    init()

    return () => {
      cancelled = true
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profile])

  // Keep refs in sync with state
  useEffect(() => { bgModeRef.current = bgMode }, [bgMode])
  useEffect(() => { bgImageRef.current = bgImage }, [bgImage])
  useEffect(() => { filterRef.current = FILTER_PRESETS.find(f => f.id === cameraFilter)?.cssFilter || 'none' }, [cameraFilter])
  useEffect(() => { avatarRef.current = avatarMode }, [avatarMode])
  useEffect(() => { initialRef.current = profile?.name?.charAt(0) || '?' }, [profile])
  useEffect(() => {
    if (localStreamRef.current) {
      startBgProcessing()
    }
  }, [startBgProcessing])

  // Recording timer
  useEffect(() => {
    if (recording) {
      recordTimerRef.current = setInterval(() => {
        setRecordTime((t) => t + 1)
      }, 1000)
    } else {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current)
        recordTimerRef.current = null
      }
      setRecordTime(0)
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    }
  }, [recording])

  async function createPeer(remoteUserId: string, isInitiator: boolean) {
    if (peersRef.current.has(remoteUserId)) return peersRef.current.get(remoteUserId)
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    peersRef.current.set(remoteUserId, pc)

    // Use screen share track if screen sharing, else processed stream (with virtual bg) if available, else raw stream
    const screenStream = screenStreamRef.current
    const sendStream = screenStream || processedStreamRef.current || localStreamRef.current
    if (sendStream) {
      sendStream.getTracks().forEach((track) => {
        pc.addTrack(track, sendStream)
      })
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'signal',
          payload: { from: profile!.id, to: remoteUserId, type: 'ice', data: e.candidate },
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        // Retry: close and recreate
        pc.close()
        peersRef.current.delete(remoteUserId)
        const shouldInitiate = profile!.id < remoteUserId
        setTimeout(() => createPeer(remoteUserId, shouldInitiate), 1000)
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected') {
        // Give it a moment to recover, then restart if still disconnected
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') {
            try { pc.restartIce() } catch {}
          }
        }, 5000)
      }
    }

    pc.ontrack = (e) => {
      const p = participantMapRef.current.get(remoteUserId)
      if (p) {
        p.stream = e.streams[0]
        participantMapRef.current.set(remoteUserId, p)
        setParticipants(Array.from(participantMapRef.current.values()))
      }
    }

    if (isInitiator) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      channelRef.current?.send({
        type: 'broadcast',
        event: 'signal',
        payload: { from: profile!.id, to: remoteUserId, type: 'offer', data: offer },
      })
    }

    return pc
  }

  async function handleSignal(sig: SignalMessage) {
    let pc = peersRef.current.get(sig.from)
    if (!pc) {
      pc = (await createPeer(sig.from, false)) ?? undefined
    }
    if (!pc) return
    try {
      if (sig.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(sig.data))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        channelRef.current?.send({
          type: 'broadcast',
          event: 'signal',
          payload: { from: profile!.id, to: sig.from, type: 'answer', data: answer },
        })
        // Flush any ICE candidates that arrived before the offer
        const buf = pendingCandidatesRef.current.get(sig.from)
        if (buf) {
          for (const c of buf) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch {}
          }
          pendingCandidatesRef.current.delete(sig.from)
        }
      } else if (sig.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(sig.data))
        // Flush any ICE candidates that arrived before the answer
        const buf = pendingCandidatesRef.current.get(sig.from)
        if (buf) {
          for (const c of buf) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch {}
          }
          pendingCandidatesRef.current.delete(sig.from)
        }
      } else if (sig.type === 'ice') {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(sig.data))
        } else {
          // Buffer until remote description is set
          const buf = pendingCandidatesRef.current.get(sig.from) || []
          buf.push(sig.data)
          pendingCandidatesRef.current.set(sig.from, buf)
        }
      }
    } catch (err) {
      // ignore transient errors during negotiation
    }
  }

  function cleanup() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    if (selfieSegmentationRef.current) {
      try { selfieSegmentationRef.current.close() } catch {}
      selfieSegmentationRef.current = null
    }
    stopRecording(false)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'leave',
      payload: { user_id: profile?.id },
    })
    peersRef.current.forEach((pc) => pc.close())
    peersRef.current.clear()
    participantMapRef.current.clear()
    pendingCandidatesRef.current.clear()
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    processedStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())
    if (participantIdRef.current) {
      supabase
        .from('live_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('id', participantIdRef.current)
        .then(() => {})
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }

  function toggleCam() {
    const stream = localStreamRef.current
    if (!stream) return
    const videoTrack = stream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setCamOn(videoTrack.enabled)
    }
  }

  function toggleMic() {
    const stream = localStreamRef.current
    if (!stream) return
    const audioTrack = stream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setMicOn(audioTrack.enabled)
    }
  }

  async function toggleScreenShare() {
    if (screenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
      const stream = processedStreamRef.current || localStreamRef.current
      if (stream && localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      const videoTrack = stream?.getVideoTracks()[0]
      if (videoTrack) {
        peersRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video')
          if (sender) sender.replaceTrack(videoTrack)
        })
      }
      setScreenSharing(false)
    } else {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        screenStreamRef.current = display
        if (localVideoRef.current) localVideoRef.current.srcObject = display
        const screenTrack = display.getVideoTracks()[0]
        peersRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video')
          if (sender) sender.replaceTrack(screenTrack)
        })
        screenTrack.onended = () => {
          screenStreamRef.current?.getTracks().forEach((t) => t.stop())
          screenStreamRef.current = null
          setScreenSharing(false)
          const stream = processedStreamRef.current || localStreamRef.current
          if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream
          }
          const videoTrack = stream?.getVideoTracks()[0]
          if (videoTrack) {
            peersRef.current.forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video')
              if (sender) sender.replaceTrack(videoTrack)
            })
          }
        }
        setScreenSharing(true)
      } catch {
        toast({ title: 'تعذر مشاركة الشاشة', variant: 'destructive' })
      }
    }
  }

  function toggleHand() {
    const newRaised = !handRaised
    setHandRaised(newRaised)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'hand',
      payload: { user_id: profile?.id, raised: newRaised },
    })
    if (participantIdRef.current) {
      supabase
        .from('live_participants')
        .update({ is_hand_raised: newRaised })
        .eq('id', participantIdRef.current)
        .then(() => {})
    }
  }

  function handleLeave() {
    cleanup()
    router.push('/live')
  }

  function copyRoomCode() {
    if (session) {
      navigator.clipboard.writeText(session.room_code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  // ===== Virtual Background =====
  function selectBg(presetId: string) {
    if (presetId === 'none') {
      setBgMode('none')
      setBgImage(null)
    } else if (presetId === 'blur') {
      setBgMode('blur')
      setBgImage(null)
    } else {
      const preset = BG_PRESETS.find((p) => p.id === presetId)
      if (preset?.url) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          setBgImage(img)
          setBgMode('image')
        }
        img.src = preset.url
      }
    }
    setShowBgPicker(false)
  }

  // ===== Recording =====
  function toggleRecording() {
    if (recording) {
      stopRecording(true)
    } else {
      startRecording()
    }
  }

  function startRecording() {
    const stream = processedStreamRef.current || localStreamRef.current
    if (!stream) {
      toast({ title: 'لا يوجد فيديو للتسجيل', variant: 'destructive' })
      return
    }
    // Composite stream: video from canvas + audio
    const recStream = new MediaStream()
    stream.getVideoTracks().forEach((t) => recStream.addTrack(t))
    stream.getAudioTracks().forEach((t) => recStream.addTrack(t))
    // Also capture remote audio if possible (from participants)
    participants.forEach((p) => {
      if (p.stream) {
        p.stream.getAudioTracks().forEach((t) => {
          try { recStream.addTrack(t) } catch {}
        })
      }
    })

    try {
      const recorder = new MediaRecorder(recStream, { mimeType: 'video/webm;codecs=vp9,opus' })
      recordedChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `live-session-${session?.room_code || 'recording'}-${Date.now()}.webm`
        a.click()
        URL.revokeObjectURL(url)
        toast({ title: 'تم حفظ التسجيل', description: 'تم تنزيل ملف الفيديو' })
      }
      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setRecording(true)
      toast({ title: 'بدأ التسجيل', description: 'جارٍ تسجيل الجلسة' })
    } catch {
      toast({ title: 'تعذر بدء التسجيل', variant: 'destructive' })
    }
  }

  function stopRecording(showToast: boolean) {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    setRecording(false)
    if (showToast) {
      toast({ title: 'تم إيقاف التسجيل', description: 'جارٍ تجهيز الملف للتنزيل' })
    }
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  // ===== Whiteboard =====
  function drawOnWhiteboard(
    x0: number, y0: number, x1: number, y1: number,
    color: string, size: number, tool: string, broadcast: boolean
  ) {
    const canvas = whiteboardRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.lineWidth = size * 5
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
      ctx.lineWidth = size
    }
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    if (broadcast) {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'wb-draw',
        payload: { x0, y0, x1, y1, color, size, tool },
      })
    }
  }

  function clearWhiteboard(broadcast: boolean) {
    const canvas = whiteboardRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (broadcast) {
      channelRef.current?.send({ type: 'broadcast', event: 'wb-clear', payload: {} })
    }
  }

  function getWbCoords(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = whiteboardRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function onWbPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    wbDrawingRef.current = true
    wbLastRef.current = getWbCoords(e)
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
  }

  function onWbPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!wbDrawingRef.current || !wbLastRef.current) return
    const coords = getWbCoords(e)
    drawOnWhiteboard(wbLastRef.current.x, wbLastRef.current.y, coords.x, coords.y, wbColor, wbSize, wbTool, true)
    wbLastRef.current = coords
  }

  function onWbPointerUp() {
    wbDrawingRef.current = false
    wbLastRef.current = null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">جارٍ الدخول للغرفة...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="font-bold text-foreground mb-2">{error}</h2>
          <Button onClick={() => router.push('/live')} className="mt-4">
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للفصول المباشرة
          </Button>
        </div>
      </div>
    )
  }

  const isTeacher = profile?.id === session?.teacher_id

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Hidden raw video for bg processing */}
      <video ref={rawVideoRef} autoPlay playsInline className="hidden" />
      <canvas ref={bgCanvasRef} className="hidden" />

      {/* Top bar */}
      <header className="shrink-0 border-b border-border bg-card px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Badge className="bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-1" />
            مباشر
          </Badge>
          {recording && (
            <Badge className="bg-red-600 text-white shrink-0">
              <Circle className="w-3 h-3 fill-white ml-1" />
              {formatTime(recordTime)}
            </Badge>
          )}
          <h1 className="font-bold text-foreground truncate">{session?.title}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-muted rounded-lg px-3 py-1.5 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{participants.length + 1}</span>
          </div>
          <Button variant="outline" size="sm" onClick={copyRoomCode}>
            {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span className="font-mono ml-1.5">{session?.room_code}</span>
          </Button>
          <Button variant="destructive" size="sm" onClick={handleLeave}>
            <PhoneOff className="w-4 h-4" />
            <span className="ml-1.5">مغادرة</span>
          </Button>
        </div>
      </header>

      {/* Main area: video grid + whiteboard */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className={cn("flex-1 overflow-y-auto p-4 transition-all", showWhiteboard && "hidden md:block md:flex-1 lg:flex-1")}>
          <div className={cn("grid gap-4 max-w-7xl mx-auto", showWhiteboard ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
            {/* Local video */}
            <div
              className="relative bg-black rounded-2xl overflow-hidden aspect-video group cursor-pointer"
              onClick={() => setFullscreen({ type: 'local' })}
            >
              <canvas
                ref={canvasVideoRef}
                className={cn('w-full h-full object-cover', !camOn && !avatarMode && 'hidden')}
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="hidden"
              />
              {!camOn && !avatarMode && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="w-16 h-16 rounded-full hero-gradient flex items-center justify-center text-white font-bold text-xl">
                    {profile?.name?.charAt(0)}
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">{profile?.name} (أنت)</span>
                  <div className="flex gap-1">
                    {!micOn && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                    {screenSharing && <ScreenShare className="w-3.5 h-3.5 text-blue-400" />}
                    {bgMode !== 'none' && <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />}
                    {cameraFilter !== 'none' && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                    {avatarMode && <Smile className="w-3.5 h-3.5 text-pink-400" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Remote videos */}
            {participants.map((p) => (
              <div key={p.user_id} onClick={() => setFullscreen({ type: 'remote', userId: p.user_id })} className="cursor-pointer">
                <RemoteVideo participant={p} />
              </div>
            ))}

            {participants.length === 0 && (
              <div className="col-span-full text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Radio className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-foreground mb-1">في الانتظار</h3>
                <p className="text-muted-foreground text-sm">
                  شارك رمز الغرفة <span className="font-mono font-bold">{session?.room_code}</span> مع طلابك لينضموا
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Whiteboard panel - teacher only */}
        {showWhiteboard && isTeacher && (
          <div className="w-full md:w-[480px] lg:w-[560px] shrink-0 border-r border-border bg-card flex flex-col">
            <div className="shrink-0 border-b border-border px-4 py-2.5 flex items-center justify-between gap-2">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Pen className="w-4 h-4 text-primary" />
                السبورة التفاعلية
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowWhiteboard(false)} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
            {/* Toolbar */}
            <div className="shrink-0 border-b border-border px-3 py-2 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setWbTool('pen')}
                className={cn('p-2 rounded-lg transition-colors', wbTool === 'pen' ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground hover:bg-muted/70')}
                title="قلم"
              >
                <Pen className="w-4 h-4" />
              </button>
              <button
                onClick={() => setWbTool('eraser')}
                className={cn('p-2 rounded-lg transition-colors', wbTool === 'eraser' ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground hover:bg-muted/70')}
                title="ممحاة"
              >
                <Eraser className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-1">
                {['#059669', '#2563eb', '#dc2626', '#d97706', '#7c3aed', '#000000'].map((c) => (
                  <button
                    key={c}
                    onClick={() => { setWbColor(c); setWbTool('pen') }}
                    className={cn('w-6 h-6 rounded-full border-2 transition-transform', wbColor === c ? 'border-foreground scale-110' : 'border-transparent')}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="w-px h-6 bg-border" />
              <input
                type="range"
                min={1}
                max={20}
                value={wbSize}
                onChange={(e) => setWbSize(Number(e.target.value))}
                className="w-20 accent-primary"
              />
              <span className="text-xs text-muted-foreground">{wbSize}px</span>
              <div className="flex-1" />
              <button
                onClick={() => clearWhiteboard(true)}
                className="p-2 rounded-lg bg-muted text-red-500 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                title="مسح الكل"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {/* Canvas */}
            <div className="flex-1 p-3 overflow-hidden">
              <canvas
                ref={whiteboardRef}
                width={1000}
                height={700}
                onPointerDown={onWbPointerDown}
                onPointerMove={onWbPointerMove}
                onPointerUp={onWbPointerUp}
                onPointerLeave={onWbPointerUp}
                className="w-full h-full bg-white rounded-xl touch-none cursor-crosshair shadow-inner"
              />
            </div>
          </div>
        )}
      </div>

      {/* Background picker popover */}
      {showBgPicker && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-2xl shadow-xl p-3 flex gap-2 max-w-[90vw] overflow-x-auto">
          {BG_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => selectBg(preset.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition-all hover:bg-muted',
                (bgMode === 'blur' && preset.id === 'blur') && 'ring-2 ring-primary',
                (bgMode === 'none' && preset.id === 'none') && 'ring-2 ring-primary',
                (bgMode === 'image' && preset.id.startsWith('image')) && 'ring-2 ring-primary',
              )}
            >
              <div className={cn('w-10 h-10 rounded-lg', preset.style)} style={preset.url ? { backgroundImage: `url(${preset.url})`, backgroundSize: 'cover' } : {}} />
              <span className="text-xs font-medium text-foreground">{preset.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filter picker popover */}
      {showFilterPicker && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-2xl shadow-xl p-3 flex gap-2 max-w-[90vw] overflow-x-auto">
          {FILTER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => { setCameraFilter(preset.id); setShowFilterPicker(false) }}
              className={cn(
                'flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition-all hover:bg-muted',
                cameraFilter === preset.id && 'ring-2 ring-primary'
              )}
            >
              <div
                className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-200 to-orange-300"
                style={{ filter: preset.cssFilter === 'none' ? undefined : preset.cssFilter }}
              />
              <span className="text-xs font-medium text-foreground whitespace-nowrap">{preset.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Avatar picker popover */}
      {showAvatarPicker && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-2xl shadow-xl p-3 flex gap-2 max-w-[90vw] overflow-x-auto">
          <button
            onClick={() => { setAvatarMode(null); setShowAvatarPicker(false) }}
            className={cn(
              'flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition-all hover:bg-muted',
              !avatarMode && 'ring-2 ring-primary'
            )}
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Video className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-foreground">إيقاف</span>
          </button>
          {AVATAR_PRESETS.map((av) => (
            <button
              key={av.id}
              onClick={() => { setAvatarMode(av.id); setShowAvatarPicker(false) }}
              className={cn(
                'flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition-all hover:bg-muted',
                avatarMode === av.id && 'ring-2 ring-primary'
              )}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: `linear-gradient(135deg, ${av.color1}, ${av.color2})` }}
              >
                {initialRef.current}
              </div>
              <span className="text-xs font-medium text-foreground">{av.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen video overlay */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          onClick={() => setFullscreen(null)}
        >
          <button
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setFullscreen(null) }}
          >
            <X className="w-5 h-5" />
          </button>
          {fullscreen.type === 'local' ? (
            <LocalFullscreen
              camOn={camOn}
              avatarMode={avatarMode}
              name={profile?.name}
            />
          ) : (
            <RemoteFullscreen
              participant={participants.find(p => p.user_id === fullscreen.userId)}
            />
          )}
        </div>
      )}

      {/* Controls bar */}
      <footer className="shrink-0 border-t border-border bg-card px-4 py-3">
        <div className="flex items-center justify-center gap-2 md:gap-3 max-w-3xl mx-auto flex-wrap">
          <ControlButton
            active={micOn}
            onClick={toggleMic}
            icon={micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            label={micOn ? 'الصوت' : 'كتم'}
            danger={!micOn}
          />
          <ControlButton
            active={camOn}
            onClick={toggleCam}
            icon={camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            label={camOn ? 'الكاميرا' : 'إيقاف'}
            danger={!camOn}
          />
          <ControlButton
            active={screenSharing}
            onClick={toggleScreenShare}
            icon={screenSharing ? <ScreenShareOff className="w-5 h-5" /> : <ScreenShare className="w-5 h-5" />}
            label="مشاركة"
            accent={screenSharing}
          />
          <ControlButton
            active={bgMode !== 'none'}
            onClick={() => { setShowBgPicker(!showBgPicker); setShowFilterPicker(false); setShowAvatarPicker(false) }}
            icon={<ImageIcon className="w-5 h-5" />}
            label="الخلفية"
            accent={bgMode !== 'none'}
          />
          <ControlButton
            active={cameraFilter !== 'none'}
            onClick={() => { setShowFilterPicker(!showFilterPicker); setShowBgPicker(false); setShowAvatarPicker(false) }}
            icon={<Sparkles className="w-5 h-5" />}
            label="فلتر"
            accent={cameraFilter !== 'none'}
          />
          <ControlButton
            active={!!avatarMode}
            onClick={() => { setShowAvatarPicker(!showAvatarPicker); setShowBgPicker(false); setShowFilterPicker(false) }}
            icon={<Smile className="w-5 h-5" />}
            label="أفاتار"
            accent={!!avatarMode}
          />
          {isTeacher && (
            <ControlButton
              active={showWhiteboard}
              onClick={() => setShowWhiteboard(!showWhiteboard)}
              icon={<Pen className="w-5 h-5" />}
              label="السبورة"
              accent={showWhiteboard}
            />
          )}
          <ControlButton
            active={recording}
            onClick={toggleRecording}
            icon={recording ? <Square className="w-5 h-5 fill-current" /> : <Circle className="w-5 h-5" />}
            label={recording ? 'إيقاف' : 'تسجيل'}
            danger={recording}
          />
          {!isTeacher && (
            <ControlButton
              active={handRaised}
              onClick={toggleHand}
              icon={<Hand className="w-5 h-5" />}
              label="رفع اليد"
              accent={handRaised}
            />
          )}
          <button
            onClick={handleLeave}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-colors shadow-lg"
            title="مغادرة"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </footer>
    </div>
  )
}

function RemoteVideo({ participant }: { participant: Participant }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream
    }
  }, [participant.stream])

  return (
    <div className="relative bg-black rounded-2xl overflow-hidden aspect-video group w-full h-full">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      {participant.is_hand_raised && (
        <div className="absolute top-3 right-3 bg-amber-500 text-white rounded-full p-1.5 shadow-lg animate-bounce">
          <Hand className="w-4 h-4" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
        <span className="text-white text-sm font-medium">{participant.name}</span>
      </div>
    </div>
  )
}

function LocalFullscreen({
  camOn, avatarMode, name,
}: {
  camOn: boolean
  avatarMode: string | null
  name?: string
}) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-32 h-32 rounded-full hero-gradient flex items-center justify-center text-white font-bold text-5xl">
          {name?.charAt(0) || '?'}
        </div>
        <span className="text-white/80 text-xl font-medium">{name} (أنت)</span>
        {!camOn && !avatarMode && (
          <span className="text-white/50 text-sm">الكاميرا مغلقة</span>
        )}
      </div>
    </div>
  )
}

function RemoteFullscreen({ participant }: { participant?: Participant }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current && participant?.stream) {
      videoRef.current.srcObject = participant.stream
    }
  }, [participant?.stream])

  if (!participant) return null

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
      {participant.is_hand_raised && (
        <div className="absolute top-4 right-16 bg-amber-500 text-white rounded-full p-2 shadow-lg animate-bounce">
          <Hand className="w-5 h-5" />
        </div>
      )}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 rounded-lg px-3 py-1.5">
        <span className="text-white text-sm font-medium">{participant.name}</span>
      </div>
    </div>
  )
}

function ControlButton({
  active,
  onClick,
  icon,
  label,
  danger,
  accent,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  danger?: boolean
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors',
        danger
          ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-950/30 dark:text-red-400'
          : accent
          ? 'bg-primary/15 text-primary hover:bg-primary/25'
          : 'bg-muted text-foreground hover:bg-muted/70'
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

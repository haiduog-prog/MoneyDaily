import { useStore } from '../../store/useStore'
import { CloudOff, RefreshCw } from 'lucide-react'

export default function OfflineStatus() {
  const isOnline = useStore((state) => state.isOnline)
  const syncQueueSize = useStore((state) => state.syncQueue.length)

  if (isOnline && syncQueueSize === 0) return null

  return (
    <div style={{
      padding: '8px 16px',
      background: isOnline ? 'rgba(108, 99, 255, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      borderBottom: `1px solid ${isOnline ? 'rgba(108, 99, 255, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '13px',
      color: isOnline ? 'var(--primary)' : '#ef4444',
      zIndex: 100,
    }}>
      {!isOnline ? (
        <>
          <CloudOff size={14} />
          <span>Đang ngoại tuyến. Dữ liệu sẽ được đồng bộ khi có mạng.</span>
        </>
      ) : (
        <>
          <RefreshCw size={14} className="spin" />
          <span>Đang đồng bộ {syncQueueSize} thay đổi...</span>
        </>
      )}
    </div>
  )
}

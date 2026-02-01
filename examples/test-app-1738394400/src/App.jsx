import { useState } from 'react'

export default function App() {
  const [records, setRecords] = useState([
    { id: 1, date: '2024-01-15', time: '09:02', status: 'normal' },
    { id: 2, date: '2024-01-14', time: '09:35', status: 'late' },
  ])
  const [stats, setStats] = useState(null)
  const [checking, setChecking] = useState(false)
  const [exportMsg, setExportMsg] = useState(null)

  const handleCheckin = async () => {
    if (checking) return
    setChecking(true)
    await new Promise(r => setTimeout(r, 1500))
    const now = new Date()
    const newRecord = {
      id: Date.now(),
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString().slice(0, 5),
      status: now.getHours() < 9 ? 'normal' : 'late'
    }
    setRecords([newRecord, ...records])
    setChecking(false)
  }

  const handleViewStats = () => {
    const lateRecord = records.find(r => r.status === 'late')
    if (lateRecord) {
      console.log('最近迟到:', lateRecord.date)
    } else {
      console.log('没有迟到记录')
    }
    setStats({
      total: records.length,
      late: records.filter(r => r.status === 'late').length
    })
  }

  const handleExport = () => {
    const data = records.map(r => `${r.date} ${r.time}`).join('\n')
    console.log(data)
  }

  return (
    <div className="app">
      <h1>📅 打卡签到</h1>

      <div className="test-hints">
        <h3>🧪 测试提示</h3>
        <ul>
          <li>
            <strong>「立即签到」按钮</strong> - <span className="rage">Rage Click</span>
            <br/><small>1.5s 延迟无 loading，快速连续点击测试</small>
          </li>
          <li>
            <strong>「查看统计」按钮</strong> - <span className="error">Runtime Error</span>
            <br/><small>当没有迟到记录时点击会报错</small>
            <br/><small>错误: Cannot read properties of undefined (reading 'date')</small>
          </li>
          <li>
            <strong>「导出记录」按钮</strong> - <span className="dead">Dead Click</span>
            <br/><small>缺少 onClick 绑定</small>
          </li>
        </ul>
      </div>

      <div className="section">
        <h2>签到</h2>
        <button className="btn primary" onClick={handleCheckin} disabled={checking}>
          {checking ? '⏳ 签到中...' : '立即签到'}
        </button>
      </div>

      <div className="section">
        <h2>记录 ({records.length})</h2>
        <ul className="records">
          {records.map(r => (
            <li key={r.id} className={r.status} onClick={() => {
              if (confirm('删除这条记录？')) {
                setRecords(records.filter(rec => rec.id !== r.id))
              }
            }} style={{cursor:'pointer'}}>
              <span>{r.date}</span>
              <span>{r.time}</span>
              <span className="tag">{r.status === 'late' ? '迟到' : '正常'}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="section actions">
        <button className="btn info" onClick={handleViewStats}>查看统计</button>
        <button className="btn secondary" id="export-btn" onClick={() => {
          handleExport()
          setExportMsg('✅ 已导出 ' + records.length + ' 条记录')
          setTimeout(() => setExportMsg(null), 2000)
        }}>导出记录</button>
      </div>
      {exportMsg && <div className="section" style={{textAlign:'center',color:'#22c55e'}}>{exportMsg}</div>}

      {stats && (
        <div className="section stats" onClick={() => setStats(null)} style={{cursor:'pointer'}}>
          <p>总签到: {stats.total} 次 | 迟到: {stats.late} 次</p>
          <small style={{opacity:0.7}}>点击关闭</small>
        </div>
      )}
    </div>
  )
}

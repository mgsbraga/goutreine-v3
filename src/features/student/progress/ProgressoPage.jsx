import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../../contexts/auth-context'
import StudentLayout from '../StudentLayout'
import { store } from '../../../shared/constants/store'
import { Chart } from '../../../lib/chart'
import { getActivePhase, getExerciseName } from '../../../shared/utils/phase-helpers'
import { getMuscleGroupName, getExerciseActivations, exerciseHasMuscleGroup } from '../../../shared/utils/muscle-groups'

// ─── Constants ──────────────────────────────────────────────────────────────

const MUSCLE_COLOR_MAP = {
  1: '#A4E44B', 2: '#cccccc', 3: '#ff9664', 4: '#9664ff', 5: '#ff6496',
  6: '#64ff96', 7: '#ffc83c', 8: '#ff78c8', 9: '#64c8ff', 10: '#ff5050', 11: '#ffb432',
}

const CHART_GRID = '#3a3a3a'
const CHART_TEXT = '#999'

// ─── ChartCanvas ────────────────────────────────────────────────────────────

function ChartCanvas({ id, buildChart, deps }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = buildChart(canvasRef.current.getContext('2d'))
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, deps)

  return <canvas ref={canvasRef} id={id} />
}

// ─── Data helpers ───────────────────────────────────────────────────────────

function getSessionsInPeriod(studentId, days) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  return store.workout_sessions.filter(
    s => s.student_id === studentId && new Date((s.date || s.session_date) + 'T00:00:00') >= since
  )
}

function getSessionsInPreviousPeriod(studentId, days) {
  const now = new Date()
  const periodEnd = new Date()
  periodEnd.setDate(now.getDate() - days)
  const periodStart = new Date()
  periodStart.setDate(now.getDate() - days * 2)
  return store.workout_sessions.filter(
    s => s.student_id === studentId &&
      new Date((s.date || s.session_date) + 'T00:00:00') >= periodStart &&
      new Date((s.date || s.session_date) + 'T00:00:00') < periodEnd
  )
}

function getVolumeForSessions(sessionIds) {
  const logs = store.session_logs.filter(l => sessionIds.includes(l.session_id))
  return logs.reduce((sum, l) => sum + (l.weight_kg || 0) * (l.reps_done || 0), 0)
}

function getProgressionData(exerciseId, days) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const sessions = store.workout_sessions
    .filter(s => new Date(s.date + 'T00:00:00') >= since)
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  return sessions.reduce((acc, session) => {
    const logs = store.session_logs.filter(
      l => l.session_id === session.id && l.exercise_id === exerciseId
    )
    if (logs.length === 0) return acc
    const maxWeight = Math.max(...logs.map(l => l.weight_kg || 0))
    if (maxWeight > 0) acc.push({ date: session.date, weight: maxWeight })
    return acc
  }, [])
}

function getVolumeByMuscleGroup(studentId, days) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const sessionIds = store.workout_sessions
    .filter(s => s.student_id === studentId && new Date((s.date || s.session_date) + 'T00:00:00') >= since)
    .map(s => s.id)

  const logs = store.session_logs.filter(l => sessionIds.includes(l.session_id))

  const volumeMap = {}
  for (const log of logs) {
    const ex = store.exercises.find(e => e.id === log.exercise_id)
    if (!ex) continue
    const vol = (log.weight_kg || 0) * (log.reps_done || 0)
    const activations = getExerciseActivations(ex)
    for (const a of activations) {
      const proportionalVol = vol * (a.pct / 100)
      volumeMap[a.group_id] = (volumeMap[a.group_id] || 0) + proportionalVol
    }
  }

  const entries = Object.entries(volumeMap)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])

  return {
    groupIds: entries.map(([gid]) => parseInt(gid)),
    labels: entries.map(([gid]) => getMuscleGroupName(parseInt(gid))),
    volumes: entries.map(([, v]) => Math.round(v)),
    colors: entries.map(([gid]) => MUSCLE_COLOR_MAP[parseInt(gid)] || '#A4E44B'),
  }
}

function getWeeklyVolumeData(studentId, days) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const sessions = store.workout_sessions
    .filter(s => s.student_id === studentId && new Date(s.date || s.session_date) >= since)
    .sort((a, b) => new Date(a.date || a.session_date) - new Date(b.date || b.session_date))

  if (sessions.length === 0) return { labels: [], volumes: [], sessionCounts: [] }

  const weekMap = {}
  for (const session of sessions) {
    const d = new Date((session.date || session.session_date) + 'T00:00:00')
    const year = d.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const weekNum = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)
    const key = `${year}-W${String(weekNum).padStart(2, '0')}`

    if (!weekMap[key]) weekMap[key] = { volume: 0, count: 0 }
    weekMap[key].count++

    const logs = store.session_logs.filter(l => l.session_id === session.id)
    for (const log of logs) {
      weekMap[key].volume += (log.weight_kg || 0) * (log.reps_done || 0)
    }
  }

  const entries = Object.entries(weekMap)
  return {
    labels: entries.map(([k]) => {
      const wNum = parseInt(k.split('-W')[1])
      return `S${wNum}`
    }),
    volumes: entries.map(([, v]) => Math.round(v.volume)),
    sessionCounts: entries.map(([, v]) => v.count),
  }
}

function getWeeklyVolumeByGroup(studentId, days) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const sessions = store.workout_sessions
    .filter(s => s.student_id === studentId && new Date((s.date || s.session_date) + 'T00:00:00') >= since)
    .sort((a, b) => new Date(a.date || a.session_date) - new Date(b.date || b.session_date))

  if (sessions.length === 0) return { labels: [], datasets: [] }

  // Build week -> group -> volume
  const weekMap = {}
  const groupTotals = {}
  for (const session of sessions) {
    const d = new Date((session.date || session.session_date) + 'T00:00:00')
    const year = d.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const weekNum = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)
    const key = `S${weekNum}`

    if (!weekMap[key]) weekMap[key] = {}

    const logs = store.session_logs.filter(l => l.session_id === session.id)
    for (const log of logs) {
      const ex = store.exercises.find(e => e.id === log.exercise_id)
      if (!ex) continue
      const vol = (log.weight_kg || 0) * (log.reps_done || 0)
      const activations = getExerciseActivations(ex)
      for (const a of activations) {
        const proportionalVol = vol * (a.pct / 100)
        weekMap[key][a.group_id] = (weekMap[key][a.group_id] || 0) + proportionalVol
        groupTotals[a.group_id] = (groupTotals[a.group_id] || 0) + proportionalVol
      }
    }
  }

  const weekLabels = Object.keys(weekMap)
  // Top groups by total volume
  const topGroups = Object.entries(groupTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([gid]) => parseInt(gid))

  const datasets = topGroups.map(gid => ({
    label: getMuscleGroupName(gid),
    data: weekLabels.map(wk => Math.round(weekMap[wk][gid] || 0)),
    backgroundColor: (MUSCLE_COLOR_MAP[gid] || '#A4E44B') + '80',
    borderRadius: 2,
  }))

  return { labels: weekLabels, datasets }
}

function getPersonalRecords(studentId) {
  const studentSessionIds = store.workout_sessions
    .filter(s => s.student_id === studentId)
    .map(s => s.id)
  const studentLogs = store.session_logs.filter(l => studentSessionIds.includes(l.session_id))

  const prMap = {}
  for (const log of studentLogs) {
    if (!log.exercise_id || !log.weight_kg) continue
    if (!prMap[log.exercise_id] || log.weight_kg > prMap[log.exercise_id]) {
      prMap[log.exercise_id] = log.weight_kg
    }
  }
  return Object.entries(prMap)
    .map(([id, weight]) => ({ exerciseId: parseInt(id), weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6)
}

function formatVolume(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return Math.round(v).toString()
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function ProgressoPage() {
  const { user } = useAuth()
  const [days, setDays] = useState(30)
  const [selectedExercise, setSelectedExercise] = useState(null)

  if (!user) return null

  // Current period data
  const currentSessions = getSessionsInPeriod(user.id, days)
  const prevSessions = getSessionsInPreviousPeriod(user.id, days)

  const currentCount = currentSessions.length
  const prevCount = prevSessions.length
  const countChange = currentCount - prevCount

  const currentVolume = getVolumeForSessions(currentSessions.map(s => s.id))
  const prevVolume = getVolumeForSessions(prevSessions.map(s => s.id))
  const volumeChangePct = prevVolume > 0 ? Math.round(((currentVolume - prevVolume) / prevVolume) * 100) : 0

  // Volume by muscle group (CSS bars)
  const volumeData = getVolumeByMuscleGroup(user.id, days)
  const maxGroupVolume = volumeData.volumes.length > 0 ? Math.max(...volumeData.volumes) : 1

  // PRs
  const prs = getPersonalRecords(user.id)
  const medals = ['🥇', '🥈', '🥉', '4', '5', '6']

  // Exercise selector grouped by muscle group
  const exercisesByGroup = store.muscle_groups.map(group => ({
    group,
    exercises: store.exercises.filter(e => exerciseHasMuscleGroup(e, group.id)),
  })).filter(g => g.exercises.length > 0)

  const defaultExercise = selectedExercise ?? (
    store.exercises.find(ex =>
      store.session_logs.some(l => l.exercise_id === ex.id && l.weight_kg > 0)
    )?.id ?? (store.exercises[0]?.id ?? null)
  )

  const progressionData = getProgressionData(defaultExercise, days)

  // Weekly volume stacked by group
  const weeklyByGroup = getWeeklyVolumeByGroup(user.id, days)

  // Weekly volume + frequency
  const weeklyVolumeData = getWeeklyVolumeData(user.id, days)

  // Find muscle group for each PR exercise
  function getExerciseGroupName(exerciseId) {
    const ex = store.exercises.find(e => e.id === exerciseId)
    if (!ex) return ''
    const activations = getExerciseActivations(ex)
    if (activations.length === 0) return ''
    // Primary group (highest pct)
    const primary = activations.sort((a, b) => b.pct - a.pct)[0]
    return getMuscleGroupName(primary.group_id)
  }

  // ── Chart builders ────────────────────────────────────────────────────────

  function buildProgressionChart(ctx) {
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: progressionData.map(d => d.date),
        datasets: [{
          data: progressionData.map(d => d.weight),
          borderColor: '#A4E44B',
          backgroundColor: '#A4E44B15',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#A4E44B',
          pointRadius: 4,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: CHART_TEXT, font: { size: 8 }, maxRotation: 45 }, grid: { display: false } },
          y: { ticks: { color: CHART_TEXT, font: { size: 9 }, callback: v => v + 'kg' }, grid: { color: CHART_GRID }, beginAtZero: false },
        },
      },
    })
  }

  function buildStackedVolumeChart(ctx) {
    return new Chart(ctx, {
      type: 'bar',
      data: { labels: weeklyByGroup.labels, datasets: weeklyByGroup.datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: CHART_TEXT, boxWidth: 8, font: { size: 8 }, padding: 4 } },
        },
        scales: {
          x: { stacked: true, ticks: { color: CHART_TEXT, font: { size: 9 } }, grid: { display: false } },
          y: { stacked: true, ticks: { color: CHART_TEXT, font: { size: 8 }, callback: v => `${(v / 1000).toFixed(0)}k` }, grid: { color: CHART_GRID }, beginAtZero: true },
        },
      },
    })
  }

  function buildFrequencyChart(ctx) {
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weeklyVolumeData.labels,
        datasets: [
          {
            label: 'Volume',
            data: weeklyVolumeData.volumes,
            backgroundColor: '#A4E44B50',
            borderColor: '#A4E44B',
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: 'y',
          },
          {
            label: 'Sess\ões',
            data: weeklyVolumeData.sessionCounts,
            type: 'line',
            borderColor: '#64c8ff',
            pointBackgroundColor: '#64c8ff',
            pointRadius: 4,
            tension: 0.3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: CHART_TEXT, boxWidth: 8, font: { size: 9 } } } },
        scales: {
          x: { ticks: { color: CHART_TEXT, font: { size: 9 } }, grid: { display: false } },
          y: { position: 'left', ticks: { color: CHART_TEXT, font: { size: 8 }, callback: v => `${(v / 1000).toFixed(0)}k` }, grid: { color: CHART_GRID }, beginAtZero: true },
          y1: { position: 'right', ticks: { color: '#64c8ff', font: { size: 8 }, stepSize: 1 }, grid: { display: false }, beginAtZero: true, max: 6 },
        },
      },
    })
  }

  return (
    <StudentLayout>
      <div className="p-4 md:p-6 space-y-3">

        {/* Title */}
        <h1 className="text-xl font-bold">Progresso</h1>

        {/* Period chips */}
        <div className="flex gap-1.5">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                days === d
                  ? 'bg-brand-green text-brand-dark border-brand-green font-semibold'
                  : 'border-brand-secondary text-brand-muted'
              }`}
            >
              {d} dias
            </button>
          ))}
        </div>

        {/* 2 KPIs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-brand-dark rounded-xl p-3">
            <div className="text-[22px] font-bold" style={{ color: '#A4E44B' }}>{currentCount}</div>
            <div className="text-[10px] text-brand-muted mt-0.5">Treinos</div>
            <div className={`text-[9px] font-semibold mt-1 ${countChange >= 0 ? 'text-brand-green' : 'text-red-400'}`}>
              {countChange >= 0 ? '↑' : '↓'} {Math.abs(countChange)} vs anterior
            </div>
          </div>
          <div className="bg-brand-dark rounded-xl p-3">
            <div className="text-[22px] font-bold" style={{ color: '#64c8ff' }}>{formatVolume(currentVolume)}</div>
            <div className="text-[10px] text-brand-muted mt-0.5">Volume (kg)</div>
            <div className={`text-[9px] font-semibold mt-1 ${volumeChangePct >= 0 ? 'text-brand-green' : 'text-red-400'}`}>
              {volumeChangePct >= 0 ? '↑' : '↓'} {Math.abs(volumeChangePct)}%
            </div>
          </div>
        </div>

        {/* Equilibrio Muscular — CSS bars */}
        <div className="bg-brand-card border border-brand-secondary rounded-xl p-3.5">
          <div className="text-[13px] font-semibold mb-3">Equil\íbrio Muscular</div>
          {volumeData.labels.length === 0 ? (
            <p className="text-brand-muted text-sm text-center py-4">Nenhum dado no per\íodo.</p>
          ) : (
            <div className="space-y-1.5">
              {volumeData.labels.map((label, i) => {
                const pct = (volumeData.volumes[i] / maxGroupVolume) * 100
                return (
                  <div key={label}>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[11px] text-gray-300">{label}</span>
                      <span className="text-[10px] text-brand-muted">{formatVolume(volumeData.volumes[i])}</span>
                    </div>
                    <div className="h-4 bg-brand-dark rounded overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{ width: `${pct}%`, backgroundColor: volumeData.colors[i], minWidth: '4px' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Personal Records */}
        <div className="bg-brand-card border border-brand-secondary rounded-xl p-3.5">
          <div className="text-[13px] font-semibold mb-3">{'🏆'} Personal Records</div>
          {prs.length === 0 ? (
            <p className="text-brand-muted text-sm text-center py-4">Nenhum registro encontrado.</p>
          ) : (
            <div className="space-y-0">
              {prs.map((pr, i) => (
                <div
                  key={pr.exerciseId}
                  className="flex items-center gap-2.5 py-2"
                  style={{ borderBottom: i < prs.length - 1 ? '1px solid #1a1a1a' : 'none' }}
                >
                  <span className="text-base w-6 text-center">{medals[i]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{getExerciseName(pr.exerciseId)}</div>
                    <div className="text-[9px] text-brand-muted">{getExerciseGroupName(pr.exerciseId)}</div>
                  </div>
                  <span className="text-sm font-bold text-brand-green">{pr.weight}kg</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progressao de Carga */}
        <div className="bg-brand-card border border-brand-secondary rounded-xl p-3.5">
          <div className="flex justify-between items-center gap-2 mb-2">
            <div className="text-[13px] font-semibold shrink-0">Progressão de Carga</div>
            <select
              value={defaultExercise ?? ''}
              onChange={e => setSelectedExercise(parseInt(e.target.value))}
              className="bg-brand-dark border border-brand-secondary rounded-lg px-2 py-1 text-[10px] text-white min-w-0 max-w-[160px] truncate"
            >
              {exercisesByGroup.map(({ group, exercises }) => (
                <optgroup key={group.id} label={group.name}>
                  {exercises.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {progressionData.length === 0 ? (
            <p className="text-brand-muted text-sm text-center py-6">Sem dados para este exercício no período.</p>
          ) : (
            <ChartCanvas
              id="progression-chart"
              buildChart={buildProgressionChart}
              deps={[defaultExercise, days, progressionData.length]}
            />
          )}
        </div>

        {/* Volume por Semana — stacked bar */}
        <div className="bg-brand-card border border-brand-secondary rounded-xl p-3.5">
          <div className="text-[13px] font-semibold mb-3">Volume por Semana</div>
          {weeklyByGroup.labels.length === 0 ? (
            <p className="text-brand-muted text-sm text-center py-6">Nenhum dado no per\íodo.</p>
          ) : (
            <ChartCanvas
              id="stacked-volume-chart"
              buildChart={buildStackedVolumeChart}
              deps={[days, weeklyByGroup.labels.join(',')]}
            />
          )}
        </div>

        {/* Frequencia e Volume */}
        <div className="bg-brand-card border border-brand-secondary rounded-xl p-3.5">
          <div className="text-[13px] font-semibold mb-3">Frequ\ência e Volume</div>
          {weeklyVolumeData.labels.length === 0 ? (
            <p className="text-brand-muted text-sm text-center py-6">Nenhum dado no per\íodo.</p>
          ) : (
            <ChartCanvas
              id="frequency-chart"
              buildChart={buildFrequencyChart}
              deps={[days, weeklyVolumeData.labels.join(',')]}
            />
          )}
        </div>

      </div>
    </StudentLayout>
  )
}

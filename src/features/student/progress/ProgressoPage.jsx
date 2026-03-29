import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../../contexts/auth-context'
import { navigate } from '../../../app/router'
import StudentLayout from '../StudentLayout'
import { store } from '../../../shared/constants/store'
import { Chart } from '../../../lib/chart'
import { getActivePhase, getExerciseName } from '../../../shared/utils/phase-helpers'
import { getMuscleGroupName, getExerciseActivations, exerciseHasMuscleGroup } from '../../../shared/utils/muscle-groups'
import { IconTrophy, IconTrendingUp } from '../../../shared/components/icons'

// ─── Constants ──────────────────────────────────────────────────────────────

const MUSCLE_COLOR_MAP = {
  1: "#A4E44B",
  2: "#cccccc",
  3: "#ff9664",
  4: "#9664ff",
  5: "#ff6496",
  6: "#64ff96",
  7: "#ffc83c",
  8: "#ff78c8",
  9: "#64c8ff",
  10: "#ff5050",
  11: "#ffb432",
}

const CHART_DEFAULTS = {
  color: { grid: '#3a3a3a', text: '#999999' },
}


// ─── ChartCanvas ─────────────────────────────────────────────────────────────

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

// ─── Data helpers ─────────────────────────────────────────────────────────────

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
    // Distribute volume proportionally across activated muscle groups
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

function getPersonalRecords() {
  const prMap = {}
  for (const log of store.session_logs) {
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

// ─── Main component ───────────────────────────────────────────────────────────

// ─── Drill-down: per-group detail ────────────────────────────────────────────

function getVolumeByGroupDetailed(studentId, days) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const sessions = store.workout_sessions
    .filter(s => s.student_id === studentId && new Date((s.date || s.session_date) + 'T00:00:00') >= since)
    .sort((a, b) => new Date(a.date || a.session_date) - new Date(b.date || b.session_date))

  // Build: { groupId: { groupName, totalVolume, exercises: { exId: { name, color, sessionVolumes: { date: vol } } } } }
  const groups = {}
  const allDates = new Set()

  for (const session of sessions) {
    const dateStr = session.date || session.session_date
    allDates.add(dateStr)
    const logs = store.session_logs.filter(l => l.session_id === session.id)
    for (const log of logs) {
      const ex = store.exercises.find(e => e.id === log.exercise_id)
      if (!ex) continue
      const vol = (log.weight_kg || 0) * (log.reps_done || 0)
      const activations = getExerciseActivations(ex)
      for (const a of activations) {
        const gid = a.group_id
        const proportionalVol = vol * (a.pct / 100)
        if (!groups[gid]) {
          groups[gid] = {
            groupName: getMuscleGroupName(gid),
            groupColor: MUSCLE_COLOR_MAP[gid] || '#A4E44B',
            totalVolume: 0,
            exercises: {},
          }
        }
        if (!groups[gid].exercises[ex.id]) {
          groups[gid].exercises[ex.id] = { name: ex.name, sessionVolumes: {} }
        }
        groups[gid].totalVolume += proportionalVol
        groups[gid].exercises[ex.id].sessionVolumes[dateStr] =
          (groups[gid].exercises[ex.id].sessionVolumes[dateStr] || 0) + proportionalVol
      }
    }
  }

  // Sort groups by total volume desc
  return Object.entries(groups)
    .filter(([, g]) => g.totalVolume > 0)
    .sort((a, b) => b[1].totalVolume - a[1].totalVolume)
    .map(([gid, g]) => ({
      gid: parseInt(gid),
      ...g,
      dates: [...allDates].sort(),
      exercises: Object.entries(g.exercises).map(([exId, ex]) => ({
        exId: parseInt(exId),
        ...ex,
      })),
    }))
}

// Distinct exercise colors for stacked bars
const EXERCISE_COLORS = [
  '#ff9664', '#ffc83c', '#64c8ff', '#A4E44B', '#ff6496',
  '#9664ff', '#64ff96', '#ff78c8', '#cccccc', '#ff5050',
  '#ffb432', '#50c8a0', '#c8a050', '#a0c850',
]

function GroupDetailChart({ group, chartId }) {
  const buildChart = (ctx) => {
    const datasets = group.exercises.map((ex, i) => ({
      label: ex.name,
      data: group.dates.map(d => Math.round(ex.sessionVolumes[d] || 0)),
      backgroundColor: EXERCISE_COLORS[i % EXERCISE_COLORS.length],
      borderRadius: 2,
    }))

    return new Chart(ctx, {
      type: 'bar',
      data: { labels: group.dates, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: CHART_DEFAULTS.color.text, boxWidth: 12, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (item) => `${item.dataset.label}: ${item.raw.toLocaleString()} kg vol`,
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: CHART_DEFAULTS.color.text, font: { size: 10 } },
            grid: { color: CHART_DEFAULTS.color.grid },
          },
          y: {
            stacked: true,
            ticks: { color: CHART_DEFAULTS.color.text, callback: v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v },
            grid: { color: CHART_DEFAULTS.color.grid },
            beginAtZero: true,
          },
        },
      },
    })
  }

  return <ChartCanvas id={chartId} buildChart={buildChart} deps={[group.dates.join(','), group.exercises.length]} />
}

function GroupDetailView({ studentId, days, onBack }) {
  const groupData = getVolumeByGroupDetailed(studentId, days)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <button onClick={onBack} className="text-brand-muted text-sm hover:text-white transition-colors mb-1">
          ← Voltar
        </button>
        <h2 className="text-lg font-bold text-white">Progresso por Grupamento</h2>
        <p className="text-xs text-brand-muted">Últimos {days} dias</p>
      </div>

      {groupData.length === 0 ? (
        <div className="card-dark rounded-xl p-8 text-center">
          <p className="text-brand-muted text-sm">Nenhum dado no período.</p>
        </div>
      ) : (
        groupData.map((group) => (
          <div key={group.gid} className="card-dark rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.groupColor }} />
                <h3 className="text-sm font-semibold text-white">{group.groupName}</h3>
              </div>
              <span className="text-xs font-medium" style={{ color: group.groupColor }}>
                {group.totalVolume >= 1000
                  ? `${(group.totalVolume / 1000).toFixed(1)}k kg vol.`
                  : `${Math.round(group.totalVolume)} kg vol.`}
              </span>
            </div>
            {/* Exercise badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {group.exercises.map((ex, i) => {
                const totalExVol = Object.values(ex.sessionVolumes).reduce((s, v) => s + v, 0)
                return (
                  <span
                    key={ex.exId}
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: EXERCISE_COLORS[i % EXERCISE_COLORS.length], color: '#1a1a1a' }}
                  >
                    {ex.name}: {totalExVol >= 1000 ? `${(totalExVol/1000).toFixed(1)}k` : Math.round(totalExVol)}kg
                  </span>
                )
              })}
            </div>
            <GroupDetailChart group={group} chartId={`group-detail-${group.gid}`} />
          </div>
        ))
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProgressoPage() {
  const { user } = useAuth()
  const [days, setDays] = useState(30)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [showGroupDetail, setShowGroupDetail] = useState(false)

  const phase = getActivePhase(user?.id)
  const prs = getPersonalRecords()

  // Group exercises by muscle group for the selector
  const exercisesByGroup = store.muscle_groups.map(group => ({
    group,
    exercises: store.exercises.filter(e => exerciseHasMuscleGroup(e, group.id)),
  })).filter(g => g.exercises.length > 0)

  // Default to first exercise that has data
  const defaultExercise = selectedExercise ?? (
    store.exercises.find(ex =>
      store.session_logs.some(l => l.exercise_id === ex.id && l.weight_kg > 0)
    )?.id ?? (store.exercises[0]?.id ?? null)
  )

  const progressionData = getProgressionData(defaultExercise, days)

  const volumeData = getVolumeByMuscleGroup(user?.id, days)
  const weeklyVolumeData = getWeeklyVolumeData(user?.id, days)

  // ── Chart builders ──────────────────────────────────────────────────────────

  function buildProgressionChart(ctx) {
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: progressionData.map(d => d.date),
        datasets: [{
          label: getExerciseName(defaultExercise),
          data: progressionData.map(d => d.weight),
          borderColor: '#A4E44B',
          backgroundColor: 'rgba(164,228,75,0.1)',
          pointBackgroundColor: '#A4E44B',
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: CHART_DEFAULTS.color.text } },
        },
        scales: {
          x: {
            ticks: { color: CHART_DEFAULTS.color.text },
            grid: { color: CHART_DEFAULTS.color.grid },
          },
          y: {
            ticks: { color: CHART_DEFAULTS.color.text, callback: v => `${v} kg` },
            grid: { color: CHART_DEFAULTS.color.grid },
          },
        },
      },
    })
  }



  function buildWeeklyVolumeChart(ctx) {
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weeklyVolumeData.labels,
        datasets: [
          {
            label: 'Volume (kg×reps)',
            data: weeklyVolumeData.volumes,
            backgroundColor: '#A4E44B',
            borderRadius: 4,
            yAxisID: 'y',
          },
          {
            label: 'Sessões',
            data: weeklyVolumeData.sessionCounts,
            type: 'line',
            borderColor: '#64c8ff',
            backgroundColor: 'rgba(100,200,255,0.1)',
            pointBackgroundColor: '#64c8ff',
            tension: 0.3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: CHART_DEFAULTS.color.text } },
        },
        scales: {
          x: {
            ticks: { color: CHART_DEFAULTS.color.text },
            grid: { color: CHART_DEFAULTS.color.grid },
          },
          y: {
            position: 'left',
            ticks: { color: '#A4E44B' },
            grid: { color: CHART_DEFAULTS.color.grid },
            beginAtZero: true,
          },
          y1: {
            position: 'right',
            ticks: { color: '#64c8ff', stepSize: 1 },
            grid: { drawOnChartArea: false },
            beginAtZero: true,
          },
        },
      },
    })
  }

  function buildVolumeChart(ctx) {
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: volumeData.labels,
        datasets: [{
          label: 'Volume total (kg×reps)',
          data: volumeData.volumes,
          backgroundColor: volumeData.colors,
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: CHART_DEFAULTS.color.text },
            grid: { color: CHART_DEFAULTS.color.grid },
            beginAtZero: true,
          },
          y: {
            ticks: { color: CHART_DEFAULTS.color.text },
            grid: { color: CHART_DEFAULTS.color.grid },
          },
        },
      },
    })
  }

  return (
    <StudentLayout>
      <div className="p-4 max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <IconTrendingUp />
          <h1 className="text-2xl font-bold text-white">Progresso</h1>
        </div>

        {/* Time period filter */}
        <div className="flex gap-2 mb-6">
          {[30, 60, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-brand-green text-brand-dark'
                  : 'bg-brand-secondary text-brand-muted hover:text-white'
              }`}
            >
              {d} dias
            </button>
          ))}
        </div>

        {/* Personal Records */}
        <div className="card-dark rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <IconTrophy />
            <h2 className="text-base font-semibold text-white">Recordes Pessoais</h2>
          </div>

          {prs.length === 0 ? (
            <p className="text-brand-muted text-sm">Nenhum registro encontrado ainda.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {prs.map(({ exerciseId, weight }) => (
                <div key={exerciseId} className="bg-brand-secondary rounded-lg px-3 py-2">
                  <p className="text-xs text-brand-muted truncate">{getExerciseName(exerciseId)}</p>
                  <p className="text-lg font-bold text-brand-green">{weight} kg</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progression chart */}
        <div className="card-dark rounded-xl p-4 mb-5">
          <h2 className="text-base font-semibold text-white mb-3">Progressão de Carga</h2>

          {/* Exercise selector */}
          <select
            value={defaultExercise ?? ''}
            onChange={e => setSelectedExercise(parseInt(e.target.value))}
            className="w-full bg-brand-secondary text-white text-sm rounded-lg px-3 py-2 mb-4 border border-brand-secondary"
          >
            {exercisesByGroup.map(({ group, exercises }) => (
              <optgroup key={group.id} label={group.name}>
                {exercises.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </optgroup>
            ))}
          </select>

          {progressionData.length === 0 ? (
            <p className="text-brand-muted text-sm text-center py-6">
              Sem dados para este exercício no período selecionado.
            </p>
          ) : (
            <ChartCanvas
              id="progression-chart"
              buildChart={buildProgressionChart}
              deps={[defaultExercise, days, progressionData.length]}
            />
          )}
        </div>

        {/* Weekly volume comparison */}
        <div className="card-dark rounded-xl p-4 mb-5">
          <h2 className="text-base font-semibold text-white mb-1">Volume Semanal</h2>
          <p className="text-xs text-brand-muted mb-3">Volume total e sessões por semana</p>

          {weeklyVolumeData.labels.length === 0 ? (
            <p className="text-brand-muted text-sm text-center py-6">
              Nenhum dado de volume no período.
            </p>
          ) : (
            <ChartCanvas
              id="weekly-volume-chart"
              buildChart={buildWeeklyVolumeChart}
              deps={[days, weeklyVolumeData.labels.join(',')]}
            />
          )}
        </div>

        {/* Volume by muscle group */}
        {!showGroupDetail ? (
          <div
            className="card-dark rounded-xl p-4 mb-5 cursor-pointer hover:border hover:border-brand-green transition-colors"
            onClick={() => volumeData.labels.length > 0 && setShowGroupDetail(true)}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white">Volume por Grupo Muscular</h2>
              {volumeData.labels.length > 0 && (
                <span className="text-xs text-brand-green">
                  Ver detalhes ›
                </span>
              )}
            </div>

            {volumeData.labels.length === 0 ? (
              <p className="text-brand-muted text-sm text-center py-6">
                Nenhum volume registrado ainda.
              </p>
            ) : (
              <>
                <ChartCanvas
                  id="volume-chart"
                  buildChart={buildVolumeChart}
                  deps={[days, volumeData.labels.join(',')]}
                />
                <p className="text-xs text-brand-muted text-center mt-2">Clique para ver gráficos detalhados por grupamento</p>
              </>
            )}
          </div>
        ) : (
          <GroupDetailView
            studentId={user?.id}
            days={days}
            onBack={() => setShowGroupDetail(false)}
          />
        )}

      </div>
    </StudentLayout>
  )
}

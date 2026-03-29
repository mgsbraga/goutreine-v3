import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../../contexts/auth-context'
import { navigate } from '../../../app/router'
import StudentLayout from '../StudentLayout'
import { store } from '../../../shared/constants/store'
import { Chart } from '../../../lib/chart'
import { getActivePhase, getCurrentWeekForPhase, getExerciseName } from '../../../shared/utils/phase-helpers'
import { getMuscleGroupName } from '../../../shared/utils/muscle-groups'
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

const WEEK_PHASE_LABELS = {
  1: 'Adaptação', 2: 'Adaptação',
  3: 'Construção', 4: 'Construção',
  5: 'Construção', 6: 'Intensificação',
  7: 'Intensificação', 8: 'Deload',
}

const PHASE_COLORS = {
  'Adaptação': '#64c8ff',
  'Construção': '#A4E44B',
  'Intensificação': '#ff9664',
  'Deload': '#ffc83c',
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

function getFrequencyData(days, studentId) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const sessions = store.workout_sessions
    .filter(s => s.student_id === studentId && new Date(s.date + 'T00:00:00') >= since)
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  if (sessions.length === 0) return { labels: [], counts: [], colors: [] }

  // Group by ISO week
  const weekMap = {}
  for (const session of sessions) {
    const d = new Date(session.date + 'T00:00:00')
    const year = d.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const weekNum = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)
    const key = `${year}-W${String(weekNum).padStart(2, '0')}`
    weekMap[key] = (weekMap[key] || 0) + 1
  }

  // Compute week index relative to active phase
  const phase = store.training_phases.find(
    p => p.student_id === studentId && p.status === 'active'
  )

  const labels = []
  const counts = []
  const colors = []

  for (const [weekKey, count] of Object.entries(weekMap)) {
    let weekLabel = weekKey
    let phaseWeek = null

    if (phase?.start_date) {
      const phaseStart = new Date(phase.start_date + 'T00:00:00')
      // approximate phase week from year-week key
      const [yr, wPart] = weekKey.split('-W')
      const d = new Date(parseInt(yr), 0, 1 + (parseInt(wPart) - 1) * 7)
      const diff = Math.floor((d - phaseStart) / (7 * 24 * 60 * 60 * 1000)) + 1
      phaseWeek = Math.max(1, Math.min(8, diff))
      weekLabel = `S${phaseWeek}`
    }

    const phaseName = phaseWeek ? (WEEK_PHASE_LABELS[phaseWeek] || 'Construção') : 'Construção'
    labels.push(weekLabel)
    counts.push(count)
    colors.push(PHASE_COLORS[phaseName] || '#A4E44B')
  }

  return { labels, counts, colors }
}

function getVolumeByMuscleGroup(studentId) {
  const sessionIds = store.workout_sessions
    .filter(s => s.student_id === studentId)
    .map(s => s.id)

  const logs = store.session_logs.filter(l => sessionIds.includes(l.session_id))

  const volumeMap = {}
  for (const log of logs) {
    const ex = store.exercises.find(e => e.id === log.exercise_id)
    if (!ex) continue
    const gid = ex.muscle_group_id
    const vol = (log.weight_kg || 0) * (log.reps || 0) * (log.sets || 1)
    volumeMap[gid] = (volumeMap[gid] || 0) + vol
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

export default function ProgressoPage() {
  const { user } = useAuth()
  const [days, setDays] = useState(30)
  const [selectedExercise, setSelectedExercise] = useState(null)

  const phase = getActivePhase(user?.id)
  const prs = getPersonalRecords()

  // Group exercises by muscle group for the selector
  const exercisesByGroup = store.muscle_groups.map(group => ({
    group,
    exercises: store.exercises.filter(e => e.muscle_group_id === group.id),
  })).filter(g => g.exercises.length > 0)

  // Default to first exercise that has data
  const defaultExercise = selectedExercise ?? (
    store.exercises.find(ex =>
      store.session_logs.some(l => l.exercise_id === ex.id && l.weight_kg > 0)
    )?.id ?? (store.exercises[0]?.id ?? null)
  )

  const progressionData = getProgressionData(defaultExercise, days)
  const frequencyData = getFrequencyData(days, user?.id)
  const volumeData = getVolumeByMuscleGroup(user?.id)
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

  function buildFrequencyChart(ctx) {
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: frequencyData.labels,
        datasets: [{
          label: 'Treinos',
          data: frequencyData.counts,
          backgroundColor: frequencyData.colors,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: CHART_DEFAULTS.color.text },
            grid: { color: CHART_DEFAULTS.color.grid },
          },
          y: {
            ticks: { color: CHART_DEFAULTS.color.text, stepSize: 1 },
            grid: { color: CHART_DEFAULTS.color.grid },
            beginAtZero: true,
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

        {/* Frequency chart */}
        <div className="card-dark rounded-xl p-4 mb-5">
          <h2 className="text-base font-semibold text-white mb-1">Frequência Semanal</h2>

          {/* Phase legend */}
          <div className="flex flex-wrap gap-3 mb-3">
            {Object.entries(PHASE_COLORS).map(([name, color]) => (
              <span key={name} className="flex items-center gap-1 text-xs text-brand-muted">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                {name}
              </span>
            ))}
          </div>

          {frequencyData.labels.length === 0 ? (
            <p className="text-brand-muted text-sm text-center py-6">
              Nenhum treino registrado no período.
            </p>
          ) : (
            <ChartCanvas
              id="frequency-chart"
              buildChart={buildFrequencyChart}
              deps={[days, frequencyData.labels.join(',')]}
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
        <div className="card-dark rounded-xl p-4 mb-5">
          <h2 className="text-base font-semibold text-white mb-3">Volume por Grupo Muscular</h2>

          {volumeData.labels.length === 0 ? (
            <p className="text-brand-muted text-sm text-center py-6">
              Nenhum volume registrado ainda.
            </p>
          ) : (
            <ChartCanvas
              id="volume-chart"
              buildChart={buildVolumeChart}
              deps={[volumeData.labels.join(',')]}
            />
          )}
        </div>

      </div>
    </StudentLayout>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../../contexts/auth-context'
import { navigate } from '../../../app/router'
import StudentLayout from '../StudentLayout'
import { store } from '../../../shared/constants/store'
import {
  getActivePhase,
  getCurrentWeekForPhase,
  getPlanName,
  getExerciseName,
  getPlanExercisesForWeek,
} from '../../../shared/utils/phase-helpers'
import { getMuscleGroupColor, getMuscleGroupName } from '../../../shared/utils/muscle-groups'
import { formatTime } from '../../../shared/utils/dates'
import { IconTrophy } from '../../../shared/components/icons'
import { createSession, logSets } from '../../../services/workouts'

export default function ExecutarTreino({ planId: rawPlanId }) {
  const { user, dataLoading } = useAuth()
  // URL params are always strings; Supabase integer PKs are numbers — coerce once
  const planId = typeof rawPlanId === 'string' && !isNaN(rawPlanId) ? Number(rawPlanId) : rawPlanId

  // Persist workout-in-progress to localStorage so data survives navigation/reload
  const storageKey = `goutreine_wip_${planId}`

  function loadWIP() {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  function saveWIP(data) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch { /* quota exceeded — ignore */ }
  }

  function clearWIP() {
    try { localStorage.removeItem(storageKey) } catch {}
  }

  const wip = loadWIP()
  const [currentStepIndex, setCurrentStepIndex] = useState(wip?.stepIndex || 0)
  const [workoutStartTime] = useState(wip?.startTime || Date.now())
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [setLogs, setSetLogs] = useState(wip?.setLogs || {})
  const [dropEntries, setDropEntries] = useState(wip?.dropEntries || {})
  const [showSummary, setShowSummary] = useState(false)
  const [showOverview, setShowOverview] = useState(wip ? false : true)
  const [restCountdown, setRestCountdown] = useState(0)
  const [restTotal, setRestTotal] = useState(0)

  const activePhase = getActivePhase(user?.id)
  const currentWeek = getCurrentWeekForPhase(activePhase)
  const totalWeeks = activePhase?.total_weeks || 8

  // Compute every render — store is a mutable object, not React state,
  // so useMemo with [planId, currentWeek] could cache stale empty results
  const planExercises = getPlanExercisesForWeek(planId, currentWeek)

  // Previous session data: weight/reps per exercise+set from last session of this plan
  const previousLogs = (() => {
    const prevSessions = store.workout_sessions
      .filter(s => s.plan_id === planId && s.student_id === user?.id)
      .sort((a, b) => new Date(b.date || b.session_date) - new Date(a.date || a.session_date))
    if (prevSessions.length === 0) return {}
    const lastSessionId = prevSessions[0].id
    const logs = store.session_logs.filter(l => l.session_id === lastSessionId && !l.notes?.startsWith('drop'))
    const map = {}
    for (const log of logs) {
      const key = `${log.exercise_id}-${log.set_number}`
      if (!map[key]) map[key] = { weight: log.weight_kg, reps: log.reps_done }
    }
    return map
  })()

  // Build workout steps: interleave sets for supersets
  const workoutSteps = useMemo(() => {
    const steps = []
    if (planExercises.length === 0) return steps
    const processed = new Set()

    for (let i = 0; i < planExercises.length; i++) {
      if (processed.has(i)) continue

      const pe = planExercises[i]
      if (pe.superset_group != null) {
        // Collect all exercises in this superset group (consecutive)
        const group = [i]
        processed.add(i)
        for (let j = i + 1; j < planExercises.length; j++) {
          if (planExercises[j].superset_group === pe.superset_group) {
            group.push(j)
            processed.add(j)
          } else break
        }
        // Interleave: set 1 of all, set 2 of all, etc.
        const maxSets = Math.max(...group.map((gi) => planExercises[gi].sets))
        for (let s = 0; s < maxSets; s++) {
          for (const gi of group) {
            if (s < planExercises[gi].sets) {
              steps.push({ exerciseIndex: gi, setIndex: s })
            }
          }
        }
      } else {
        processed.add(i)
        for (let s = 0; s < pe.sets; s++) {
          steps.push({ exerciseIndex: i, setIndex: s })
        }
      }
    }
    return steps
  }, [planExercises])

  const currentStep = workoutSteps[currentStepIndex]
  const currentExerciseIndex = currentStep?.exerciseIndex ?? 0
  const currentSetIndex = currentStep?.setIndex ?? 0
  const currentPlanExercise = planExercises[currentExerciseIndex]
  const currentExercise = currentPlanExercise
    ? store.exercises.find((e) => e.id === currentPlanExercise.exercise_id)
    : null

  const totalSets = planExercises.reduce((sum, pe) => sum + pe.sets, 0)
  const completedSets = Object.keys(setLogs).length

  // Superset detection
  const isInSuperset = currentPlanExercise?.superset_group != null
  const supersetGroup = isInSuperset
    ? planExercises.filter((pe) => pe.superset_group === currentPlanExercise.superset_group)
    : []
  const supersetLabel = isInSuperset
    ? `Conjugado ${supersetGroup.findIndex((pe) => pe.exercise_id === currentPlanExercise.exercise_id) + 1}/${supersetGroup.length}`
    : null

  // Drop-set config
  const numDrops = currentPlanExercise ? (currentPlanExercise.drop_sets || 0) : 0
  const hasDropSet = numDrops > 0

  const logKey = currentPlanExercise ? `${currentExerciseIndex}-${currentSetIndex + 1}` : null
  const currentLogged = logKey ? setLogs[logKey] : null

  // Previous session's weight/reps for this exercise+set
  const prevKey = currentPlanExercise ? `${currentPlanExercise.exercise_id}-${currentSetIndex + 1}` : null
  const prevLog = prevKey ? previousLogs[prevKey] : null
  const currentDrops = logKey ? (dropEntries[logKey] || []) : []

  // Persist workout-in-progress on every change
  useEffect(() => {
    if (Object.keys(setLogs).length > 0) {
      saveWIP({
        setLogs,
        dropEntries,
        stepIndex: currentStepIndex,
        startTime: workoutStartTime,
        planId,
        userId: user?.id,
        savedAt: Date.now(),
      })
    }
  }, [setLogs, dropEntries, currentStepIndex])

  // Warn before leaving with unsaved data
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (Object.keys(setLogs).length > 0 && !showSummary) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [setLogs, showSummary])

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - workoutStartTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [workoutStartTime])

  // Rest countdown timer
  useEffect(() => {
    if (restCountdown <= 0) return
    const timer = setInterval(() => {
      setRestCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [restCountdown > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize drop entries when navigating to a set that has drops
  useEffect(() => {
    if (!hasDropSet || !logKey) return
    if (!dropEntries[logKey]) {
      const initial = Array.from({ length: numDrops }, () => ({ weight: '', reps: '' }))
      setDropEntries((prev) => ({ ...prev, [logKey]: initial }))
    }
  }, [logKey, hasDropSet, numDrops]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateDropWeight = (idx, value) => {
    setDropEntries((prev) => ({
      ...prev,
      [logKey]: (prev[logKey] || []).map((d, i) => (i === idx ? { ...d, weight: value } : d)),
    }))
  }

  const updateDropReps = (idx, value) => {
    setDropEntries((prev) => ({
      ...prev,
      [logKey]: (prev[logKey] || []).map((d, i) => (i === idx ? { ...d, reps: value } : d)),
    }))
  }

  const handleConfirmSet = () => {
    const weightEl = document.getElementById('weight-current')
    const repsEl = document.getElementById('reps-current')
    const weight = parseFloat(weightEl?.value)
    const reps = parseInt(repsEl?.value)

    if (!weight) {
      alert('Preencha o peso')
      return
    }
    if (!reps || reps < 1) {
      alert('Preencha as repetições')
      return
    }

    const key = `${currentExerciseIndex}-${currentSetIndex + 1}`
    const drops = hasDropSet ? (dropEntries[key] || []).filter((d) => d.weight && d.reps) : []
    if (hasDropSet && drops.length < numDrops) {
      alert(`Preencha os ${numDrops} drops`)
      return
    }

    setSetLogs((prev) => ({ ...prev, [key]: { weight, reps, drops } }))

    if (currentStepIndex < workoutSteps.length - 1) {
      // Start rest countdown if there's a rest time configured
      const restSec = currentPlanExercise.rest_seconds || 0
      if (restSec > 0) {
        setRestTotal(restSec)
        setRestCountdown(restSec)
      }
      setCurrentStepIndex(currentStepIndex + 1)
    } else {
      setShowSummary(true)
    }
  }

  const calcTotalVolume = () => {
    return Object.values(setLogs).reduce((total, log) => {
      let vol = log.weight * log.reps
      if (log.drops) {
        log.drops.forEach((d) => {
          vol += parseFloat(d.weight || 0) * parseInt(d.reps || 0)
        })
      }
      return total + vol
    }, 0)
  }

  const handlePrev = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(currentStepIndex - 1)
  }

  const handleNext = () => {
    if (currentStepIndex < workoutSteps.length - 1) setCurrentStepIndex(currentStepIndex + 1)
  }

  const handleFinishWorkout = () => {
    setShowSummary(true)
  }

  const handleSaveWorkout = async () => {
    if (!user?.id) {
      console.error('Erro ao salvar treino: usuário não carregado')
      navigate('dashboard')
      return
    }
    try {
      const durationMinutes = Math.floor(elapsedSeconds / 60)
      const session = await createSession(user.id, planId, durationMinutes, '')

      const logEntries = []
      Object.entries(setLogs).forEach(([key, val]) => {
        const [exIdx, setNum] = key.split('-').map(Number)
        const pe = planExercises[exIdx]
        if (pe) {
          const reps = parseInt(val.reps, 10) || 0
          const weight = parseFloat(val.weight) || 0
          // Skip entries with no reps and no weight (empty/unfilled sets)
          if (reps === 0 && weight === 0) return
          logEntries.push({
            exercise_id: pe.exercise_id,
            set_number: setNum,
            reps_done: reps,
            weight_kg: weight,
            notes: '',
          })
          if (val.drops && val.drops.length > 0) {
            val.drops.forEach((d, di) => {
              const dropWeight = parseFloat(d.weight || 0)
              const dropReps = parseInt(d.reps || 0, 10)
              if (dropWeight > 0 && dropReps > 0) {
                logEntries.push({
                  exercise_id: pe.exercise_id,
                  set_number: setNum,
                  reps_done: dropReps,
                  weight_kg: dropWeight,
                  notes: `drop ${di + 1}`,
                })
              }
            })
          }
        }
      })

      if (logEntries.length > 0) {
        await logSets(session.id, logEntries)
      }
      // Success — clear work-in-progress
      clearWIP()
    } catch (err) {
      console.error('Erro ao salvar treino:', err)
      // If error says it was saved locally, it's ok to navigate
      if (err.message?.includes('salvo localmente')) {
        alert(err.message)
      } else {
        alert('Erro ao salvar treino: ' + (err.message || 'erro desconhecido'))
        return
      }
    }
    navigate('dashboard')
  }

  const isFirstSet = currentStepIndex === 0
  const isLastSet = currentStepIndex === workoutSteps.length - 1

  // Not found state — wait for store to finish loading before deciding
  if (!currentPlanExercise || !currentExercise) {
    if (dataLoading) {
      return (
        <StudentLayout>
          <div className="p-4 md:p-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-green" />
          </div>
        </StudentLayout>
      )
    }
    return (
      <StudentLayout>
        <div className="p-4 md:p-6 text-center">
          <p className="text-brand-muted mb-4">Treino não encontrado.</p>
          <button
            onClick={() => navigate('treino')}
            className="btn-green px-6 py-2 rounded"
          >
            Voltar aos Treinos
          </button>
        </div>
      </StudentLayout>
    )
  }

  // Summary screen
  if (showSummary) {
    return (
      <StudentLayout>
        <div className="p-4 md:p-6 flex items-center justify-center min-h-[calc(100vh-120px)]">
          <div className="card-dark rounded-lg p-8 max-w-md w-full text-center">
            <IconTrophy className="w-16 h-16 mx-auto mb-4 text-brand-green" />
            <h2 className="text-2xl font-bold mb-4">Treino Completo!</h2>

            <div className="space-y-3 mb-6 text-left bg-brand-secondary bg-opacity-50 p-4 rounded">
              <div className="flex justify-between">
                <span className="text-brand-muted">Duração:</span>
                <span className="font-medium">{formatTime(elapsedSeconds)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Exercícios:</span>
                <span className="font-medium">{planExercises.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Séries completadas:</span>
                <span className="font-medium">{completedSets} / {totalSets}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Volume Total:</span>
                <span className="font-medium">{calcTotalVolume()} kg</span>
              </div>
              {Object.values(setLogs).some((l) => l.drops && l.drops.length > 0) && (
                <div className="flex justify-between">
                  <span className="text-brand-muted">Drop-sets:</span>
                  <span className="font-medium text-yellow-400">
                    {Object.values(setLogs).filter((l) => l.drops && l.drops.length > 0).length} séries com drop
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleSaveWorkout}
              className="w-full btn-green py-2 rounded font-medium"
            >
              Finalizar Treino
            </button>
          </div>
        </div>
      </StudentLayout>
    )
  }

  // Set indicator circles for current exercise
  const setsIndicators = Array.from({ length: currentPlanExercise.sets }).map((_, i) => {
    const key = `${currentExerciseIndex}-${i + 1}`
    const done = !!setLogs[key]
    const hasDrop = done && setLogs[key].drops && setLogs[key].drops.length > 0
    const active = i === currentSetIndex
    const targetStepIdx = workoutSteps.findIndex(
      (s) => s.exerciseIndex === currentExerciseIndex && s.setIndex === i
    )
    return (
      <button
        key={i}
        onClick={() => targetStepIdx >= 0 && setCurrentStepIndex(targetStepIdx)}
        className={`relative w-9 h-9 rounded-full text-sm font-bold transition-all ${
          active
            ? 'bg-brand-green text-brand-dark ring-2 ring-brand-green ring-offset-2 ring-offset-brand-dark'
            : done
            ? 'bg-brand-green bg-opacity-30 text-brand-green'
            : 'bg-brand-secondary text-brand-muted'
        }`}
      >
        {done && !active ? '✓' : i + 1}
        {hasDrop && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-brand-dark text-[7px] flex items-center justify-center font-bold text-brand-dark">
            D
          </span>
        )}
      </button>
    )
  })

  return (
    <StudentLayout>
      <div className="p-4 md:p-6 flex flex-col min-h-[calc(100vh-140px)]">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{getPlanName(planId)}</h1>
            <div className="flex items-center gap-2">
              <p className="text-brand-muted text-sm">{formatTime(elapsedSeconds)}</p>
              <span className="text-xs px-2 py-0.5 rounded bg-brand-card border border-brand-secondary text-white font-medium">
                Sem <span className="text-brand-green">{currentWeek}</span>/{totalWeeks}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-brand-muted">{completedSets} / {totalSets} séries</p>
            <div className="w-28 h-2 bg-brand-secondary rounded mt-1">
              <div
                className="h-full bg-brand-green rounded transition-all"
                style={{ width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Overview toggle button */}
        <button
          onClick={() => setShowOverview(!showOverview)}
          className="w-full card-dark rounded-lg p-3 flex items-center justify-between mb-4 hover:bg-brand-secondary hover:bg-opacity-30 transition"
        >
          <span className="text-sm font-medium text-brand-muted">
            {showOverview ? 'Treino do dia' : 'Ver treino completo'}
          </span>
          <span className={`text-brand-muted transition-transform ${showOverview ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {/* Overview panel */}
        {showOverview && (
          <div className="card-dark rounded-lg p-4 mb-4 space-y-1 max-h-[50vh] overflow-y-auto">
            {planExercises.map((pe, idx) => {
              const ex = store.exercises.find((e) => e.id === pe.exercise_id)
              const isActive = idx === currentExerciseIndex
              const completedForEx = Array.from({ length: pe.sets }).filter(
                (_, s) => setLogs[`${idx}-${s + 1}`]
              ).length
              const allDone = completedForEx === pe.sets
              const isSuperset = pe.superset_group != null
              const prevPe = idx > 0 ? planExercises[idx - 1] : null
              const nextPe = idx < planExercises.length - 1 ? planExercises[idx + 1] : null
              const isGroupStart =
                isSuperset && (!prevPe || prevPe.superset_group !== pe.superset_group)
              const isGroupEnd =
                isSuperset && (!nextPe || nextPe.superset_group !== pe.superset_group)
              const targetStep = workoutSteps.findIndex(
                (s) => s.exerciseIndex === idx && s.setIndex === 0
              )

              return (
                <div key={pe.id} className="relative">
                  {isSuperset && (
                    <div
                      className={`absolute left-0 w-1 bg-yellow-400 rounded-full ${
                        isGroupStart ? 'top-1 bottom-0' : isGroupEnd ? 'top-0 bottom-1' : 'top-0 bottom-0'
                      }`}
                      style={{ left: '2px' }}
                    />
                  )}
                  {isGroupStart && (
                    <div className="text-[9px] text-yellow-400 font-bold mb-0.5 ml-4">CONJUGADO</div>
                  )}
                  <button
                    onClick={() => {
                      if (targetStep >= 0) {
                        setCurrentStepIndex(targetStep)
                        setShowOverview(false)
                      }
                    }}
                    className={`w-full text-left flex items-center gap-3 rounded-lg p-2.5 transition ${
                      isActive
                        ? 'bg-brand-secondary bg-opacity-50 border-l-3 border-brand-green'
                        : allDone
                        ? 'bg-brand-secondary bg-opacity-30 opacity-60'
                        : 'hover:bg-brand-secondary hover:bg-opacity-30'
                    } ${isSuperset ? 'ml-3' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        allDone
                          ? 'bg-brand-green bg-opacity-30 text-brand-green'
                          : isActive
                          ? 'bg-brand-green text-brand-dark'
                          : 'bg-brand-secondary text-brand-muted'
                      }`}
                    >
                      {allDone ? '✓' : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          isActive ? 'text-white' : allDone ? 'text-brand-muted line-through' : 'text-white'
                        }`}
                      >
                        {ex?.name || getExerciseName(pe.exercise_id) || '???'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-brand-muted">
                        <span>
                          {pe.sets}x{pe.reps_min === pe.reps_max ? pe.reps_min : `${pe.reps_min}-${pe.reps_max}`}
                        </span>
                        {pe.drop_sets > 0 && (
                          <span className="text-yellow-400">+{pe.drop_sets}D</span>
                        )}
                        <span>·</span>
                        <span>{pe.rest_seconds}s</span>
                        {pe.suggested_weight_kg > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-brand-green">{pe.suggested_weight_kg}kg</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-brand-muted shrink-0">
                      {completedForEx}/{pe.sets}
                    </div>
                  </button>
                </div>
              )
            })}
            <button
              onClick={() => setShowOverview(false)}
              className="w-full btn-green py-2.5 rounded-lg font-medium mt-3"
            >
              {completedSets > 0 ? 'Continuar Treino' : 'Iniciar Treino'}
            </button>
          </div>
        )}

        {/* Execution view */}
        {!showOverview && (
          <>
            <div className="card-dark rounded-lg p-5 flex-1 flex flex-col">

              {/* Exercise header */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-brand-muted">
                    Exercício {currentExerciseIndex + 1} de {planExercises.length}
                  </p>
                  <div className="flex items-center gap-2">
                    {isInSuperset && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-400 bg-opacity-20 text-yellow-400 font-bold">
                        {supersetLabel}
                      </span>
                    )}
                    <span className={`muscle-badge text-xs ${getMuscleGroupColor(currentExercise.muscle_group_id)}`}>
                      {getMuscleGroupName(currentExercise.muscle_group_id)}
                    </span>
                  </div>
                </div>
                <h2 className="text-2xl font-bold">{currentExercise.name}</h2>
                {isInSuperset && supersetGroup.length > 1 && (
                  <p className="text-xs text-yellow-400 mt-1">
                    ⇄ com {supersetGroup
                      .filter(pe => pe.exercise_id !== currentPlanExercise.exercise_id)
                      .map(pe => {
                        const ex = store.exercises.find(e => e.id === pe.exercise_id)
                        return ex?.name || getExerciseName(pe.exercise_id)
                      })
                      .join(', ')}
                  </p>
                )}
              </div>

              {/* Set indicator circles */}
              <div className="flex gap-2 justify-center mb-5">
                {setsIndicators}
              </div>

              {/* Input area */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <p className="text-brand-muted text-sm mb-1">
                  Série {currentSetIndex + 1} de {currentPlanExercise.sets}
                </p>
                <div className="bg-brand-secondary rounded-lg p-6 w-full max-w-sm space-y-4">

                  {/* Weight input */}
                  <div>
                    <label className="text-xs text-brand-muted block mb-1">
                      Peso (kg){' '}
                      {prevLog ? (
                        <span className="text-blue-400">
                          · último: {prevLog.weight}kg
                        </span>
                      ) : currentPlanExercise.suggested_weight_kg > 0 ? (
                        <span className="text-brand-green">
                          · sugerido: {currentPlanExercise.suggested_weight_kg}kg
                        </span>
                      ) : null}
                    </label>
                    <input
                      key={logKey}
                      type="number"
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      step="0.5"
                      min="0"
                      placeholder={
                        prevLog ? String(prevLog.weight)
                          : currentPlanExercise.suggested_weight_kg > 0
                          ? String(currentPlanExercise.suggested_weight_kg)
                          : '0'
                      }
                      defaultValue={currentLogged?.weight || prevLog?.weight || currentPlanExercise.suggested_weight_kg || ''}
                      className="bg-brand-dark border border-brand-muted rounded px-4 py-3 text-white text-center text-2xl font-bold w-full focus:border-brand-green focus:outline-none transition"
                      id="weight-current"
                      onFocus={e => e.target.select()}
                    />
                  </div>

                  {/* Reps input */}
                  <div>
                    <label className="text-xs text-brand-muted block mb-1">
                      Repetições{' '}
                      <span className="text-brand-green font-medium">
                        ({currentPlanExercise.reps_min}–{currentPlanExercise.reps_max})
                      </span>
                      {prevLog && (
                        <span className="text-blue-400 ml-1">
                          · último: {prevLog.reps}
                        </span>
                      )}
                    </label>
                    <input
                      key={logKey + '-reps'}
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="1"
                      placeholder={`${currentPlanExercise.reps_min}–${currentPlanExercise.reps_max}`}
                      defaultValue={currentLogged?.reps || prevLog?.reps || currentPlanExercise.reps_max || currentPlanExercise.reps_min || ''}
                      className="bg-brand-dark border border-brand-muted rounded px-4 py-3 text-white text-center text-2xl font-bold w-full focus:border-brand-green focus:outline-none transition"
                      id="reps-current"
                      onFocus={e => e.target.select()}
                    />
                  </div>

                  {/* Drop-set inputs */}
                  {hasDropSet && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-yellow-400 text-xs font-medium">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span>Drop-set ({numDrops} {numDrops === 1 ? 'drop' : 'drops'})</span>
                      </div>
                      <div className="space-y-2 border-l-2 border-yellow-400 pl-3">
                        {currentDrops.map((drop, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-yellow-400 text-xs font-bold w-5">D{idx + 1}</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              pattern="[0-9]*\.?[0-9]*"
                              step="0.5"
                              min="0"
                              placeholder="Peso"
                              value={drop.weight}
                              onChange={(e) => updateDropWeight(idx, e.target.value)}
                              onFocus={e => e.target.select()}
                              className="bg-brand-dark border border-yellow-400 border-opacity-40 rounded px-2 py-2 text-white text-center text-sm font-bold flex-1 focus:border-yellow-400 focus:outline-none"
                            />
                            <span className="text-brand-muted text-xs">kg</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              min="1"
                              placeholder="Reps"
                              value={drop.reps}
                              onChange={(e) => updateDropReps(idx, e.target.value)}
                              onFocus={e => e.target.select()}
                              className="bg-brand-dark border border-yellow-400 border-opacity-40 rounded px-2 py-2 text-white text-center text-sm font-bold w-16 focus:border-yellow-400 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rest timer */}
                  {restCountdown > 0 ? (
                    <div className="pt-3">
                      <div className="bg-brand-dark rounded-lg p-3 text-center">
                        <p className="text-xs text-brand-muted mb-1">Descanso</p>
                        <p className={`text-3xl font-bold tabular-nums ${restCountdown <= 5 ? 'text-red-400' : 'text-brand-green'}`}>
                          {Math.floor(restCountdown / 60)}:{String(restCountdown % 60).padStart(2, '0')}
                        </p>
                        <div className="w-full h-1.5 bg-brand-secondary rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full bg-brand-green rounded-full transition-all duration-1000"
                            style={{ width: `${restTotal > 0 ? (restCountdown / restTotal) * 100 : 0}%` }}
                          />
                        </div>
                        <button
                          onClick={() => setRestCountdown(0)}
                          className="text-xs text-brand-muted hover:text-white mt-2 transition-colors"
                        >
                          Pular descanso
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-brand-muted text-sm pt-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Descanso: {currentPlanExercise.rest_seconds}s</span>
                    </div>
                  )}
                </div>

                {/* Confirm button */}
                <button
                  onClick={handleConfirmSet}
                  className={`mt-5 w-full max-w-sm py-3 rounded-lg font-bold text-lg transition ${
                    currentLogged
                      ? 'bg-brand-green bg-opacity-30 text-brand-green border border-brand-green'
                      : 'btn-green'
                  }`}
                >
                  {currentLogged ? '✓ Registrado — Atualizar' : 'Confirmar Série'}
                </button>
              </div>
            </div>

            {/* Previous / Next / Finish navigation */}
            <div className="flex gap-3 justify-between mt-4">
              <button
                onClick={handlePrev}
                disabled={isFirstSet}
                className="flex-1 bg-brand-secondary border border-brand-muted text-white py-2 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              {isLastSet ? (
                <button
                  onClick={handleFinishWorkout}
                  className="flex-1 btn-green py-2 rounded font-medium"
                >
                  Finalizar
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex-1 bg-brand-secondary border border-brand-muted text-white py-2 rounded hover:border-brand-green"
                >
                  Pular →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </StudentLayout>
  )
}

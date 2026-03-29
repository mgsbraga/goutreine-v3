import { useState } from 'react'
import { sb } from '../../../lib/supabase'
import { store } from '../../../shared/constants/store'
import * as programsService from '../../../services/programs'
import { PERIODIZATION_SCHEMES } from '../../../shared/constants/periodization-schemes'
import { getExerciseName } from '../../../shared/utils/phase-helpers'
import { getMuscleGroupName, getMuscleGroupColor } from '../../../shared/utils/muscle-groups'
import AdminLayout from '../AdminLayout'

function StatusBadge({ status }) {
  const map = {
    active:    { label: 'Ativa',     className: 'bg-brand-green bg-opacity-20 text-brand-dark font-bold' },
    planned:   { label: 'Planejada', className: 'bg-blue-500 bg-opacity-20 text-blue-300 font-bold' },
    completed: { label: 'Concluída', className: 'bg-brand-secondary text-white text-opacity-60' },
  }
  const { label, className } = map[status] || { label: status, className: 'bg-brand-secondary text-brand-muted' }
  return (
    <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium ${className}`}>
      {label}
    </span>
  )
}

function AddPhaseModal({ studentId, onSave, onClose }) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [totalWeeks, setTotalWeeks] = useState(9)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Nome é obrigatório.')
    if (!startDate) return setError('Data de início é obrigatória.')
    setError(null)
    setSaving(true)
    try {
      await onSave({ name: name.trim(), startDate, totalWeeks: Number(totalWeeks) })
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao criar fase.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
      <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-md p-6 space-y-5">
        <h2 className="text-lg font-bold">Nova Fase de Treino</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-brand-muted mb-1">Nome da Fase</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Fase 1 — Hipertrofia"
              autoFocus
              className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-green"
            />
          </div>

          <div>
            <label className="block text-sm text-brand-muted mb-1">Data de Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green"
            />
          </div>

          <div>
            <label className="block text-sm text-brand-muted mb-1">Total de Semanas</label>
            <input
              type="number"
              value={totalWeeks}
              onChange={(e) => setTotalWeeks(e.target.value)}
              min={1}
              max={24}
              className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-brand-secondary text-white rounded-lg py-2 text-sm font-medium hover:bg-opacity-80 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-brand-green text-brand-dark rounded-lg py-2 text-sm font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-60"
            >
              {saving ? 'Criando...' : 'Criar Fase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddPlanModal({ phaseId, onSave, onClose }) {
  const [name, setName] = useState('')
  const [dayLabel, setDayLabel] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), dayLabel: dayLabel.trim() })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
      <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold">Novo Treino</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-brand-muted mb-1">Nome</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Treino A" autoFocus className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green" />
          </div>
          <div>
            <label className="block text-sm text-brand-muted mb-1">Rótulo do dia (opcional)</label>
            <input type="text" value={dayLabel} onChange={e => setDayLabel(e.target.value)} placeholder="Ex: Segunda e Quinta" className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-brand-secondary text-white rounded-lg py-2 text-sm font-medium">Cancelar</button>
            <button type="submit" disabled={saving || !name.trim()} className="flex-1 bg-brand-green text-brand-dark rounded-lg py-2 text-sm font-semibold disabled:opacity-60">{saving ? 'Criando...' : 'Criar Treino'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddExerciseModal({ planId, phaseId, onSave, onClose }) {
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedExercise, setSelectedExercise] = useState('')
  const [restSeconds, setRestSeconds] = useState(90)
  const [sets, setSets] = useState(3)
  const [repsMin, setRepsMin] = useState(8)
  const [repsMax, setRepsMax] = useState(12)
  const [suggestedWeight, setSuggestedWeight] = useState('')
  const [saving, setSaving] = useState(false)

  const groups = store.muscle_groups.filter(g =>
    store.exercises.some(e => e.muscle_group_id === g.id)
  )
  const filteredExercises = selectedGroup
    ? store.exercises.filter(e => e.muscle_group_id === parseInt(selectedGroup))
    : []

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedExercise) return
    setSaving(true)
    try {
      const existingCount = store.plan_exercises.filter(pe => pe.plan_id === planId).length
      await onSave({
        exerciseId: parseInt(selectedExercise),
        restSeconds: Number(restSeconds) || 90,
        order: existingCount + 1,
        sets: Number(sets) || 3,
        repsMin: Number(repsMin) || 8,
        repsMax: Number(repsMax) || 12,
        suggestedWeight: Number(suggestedWeight) || 0,
        phaseId,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
      <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold">Adicionar Exercício</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-brand-muted mb-1">Grupamento Muscular</label>
            <select value={selectedGroup} onChange={e => { setSelectedGroup(e.target.value); setSelectedExercise('') }} className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green">
              <option value="">Selecione o grupamento...</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-brand-muted mb-1">Exercício</label>
            <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)} disabled={!selectedGroup} className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green disabled:opacity-40">
              <option value="">{selectedGroup ? 'Selecione o exercício...' : 'Escolha o grupamento primeiro'}</option>
              {filteredExercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm text-brand-muted mb-1">Séries</label>
              <input type="number" value={sets} onChange={e => setSets(e.target.value)} min={1} max={10} className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green" />
            </div>
            <div>
              <label className="block text-sm text-brand-muted mb-1">Reps mín</label>
              <input type="number" value={repsMin} onChange={e => setRepsMin(e.target.value)} min={1} max={50} className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green" />
            </div>
            <div>
              <label className="block text-sm text-brand-muted mb-1">Reps máx</label>
              <input type="number" value={repsMax} onChange={e => setRepsMax(e.target.value)} min={1} max={50} className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm text-brand-muted mb-1">Carga sugerida (kg)</label>
              <input type="number" value={suggestedWeight} onChange={e => setSuggestedWeight(e.target.value)} min={0} step={0.5} placeholder="Opcional" className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-green" />
            </div>
            <div>
              <label className="block text-sm text-brand-muted mb-1">Descanso (seg)</label>
              <input type="number" value={restSeconds} onChange={e => setRestSeconds(e.target.value)} min={0} max={300} className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-brand-secondary text-white rounded-lg py-2 text-sm font-medium">Cancelar</button>
            <button type="submit" disabled={saving || !selectedExercise} className="flex-1 bg-brand-green text-brand-dark rounded-lg py-2 text-sm font-semibold disabled:opacity-60">{saving ? 'Adicionando...' : 'Adicionar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PlanEditor({ plan, onRefresh }) {
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [removing, setRemoving] = useState(null)

  const exercises = store.plan_exercises
    .filter(pe => pe.plan_id === plan.id)
    .sort((a, b) => (a.order || a.exercise_order || 0) - (b.order || b.exercise_order || 0))

  async function handleAddExercise({ exerciseId, restSeconds, order, sets, repsMin, repsMax, suggestedWeight, phaseId }) {
    const newPe = await programsService.addExerciseToPlan(plan.id, { exerciseId, restSeconds, order })
    // Create week_configs for all weeks so sets/reps/weight appear in the student's workout
    const phase = store.training_phases.find(p => p.id === (phaseId || plan.phase_id))
    const totalWeeks = phase?.total_weeks || 8
    const configs = Array.from({ length: totalWeeks }, (_, i) => ({
      week: i + 1,
      sets: sets || 3,
      reps_min: repsMin || 8,
      reps_max: repsMax || 12,
      suggested_weight_kg: suggestedWeight || 0,
      drop_sets: 0,
      notes: '',
    }))
    await programsService.bulkUpdateWeekConfigs(newPe.id, configs)
    onRefresh()
  }

  async function handleToggleConjugado(pe, prevPe) {
    if (!prevPe) return
    // If already conjugated together, un-conjugate both
    if (pe.superset_group && pe.superset_group === prevPe.superset_group) {
      // Remove superset_group from both
      if (sb) {
        await sb.from('plan_exercises').update({ superset_group: null }).eq('id', pe.id)
        await sb.from('plan_exercises').update({ superset_group: null }).eq('id', prevPe.id)
      }
      pe.superset_group = null
      prevPe.superset_group = null
      onRefresh()
      return
    }
    // Conjugate: use existing group from prevPe, or create new one
    const group = prevPe.superset_group || String.fromCharCode(
      65 + [...new Set(exercises.filter(e => e.superset_group).map(e => e.superset_group))].length
    )
    if (sb) {
      await sb.from('plan_exercises').update({ superset_group: group }).eq('id', pe.id)
      if (!prevPe.superset_group) {
        await sb.from('plan_exercises').update({ superset_group: group }).eq('id', prevPe.id)
      }
    }
    pe.superset_group = group
    prevPe.superset_group = group
    onRefresh()
  }

  async function handleMoveExercise(pe, direction) {
    const sorted = [...exercises]
    const idx = sorted.findIndex(e => e.id === pe.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const other = sorted[swapIdx]
    const peOrder = pe.order || pe.exercise_order || idx + 1
    const otherOrder = other.order || other.exercise_order || swapIdx + 1
    if (sb) {
      await sb.from('plan_exercises').update({ exercise_order: otherOrder }).eq('id', pe.id)
      await sb.from('plan_exercises').update({ exercise_order: peOrder }).eq('id', other.id)
    }
    pe.order = otherOrder
    pe.exercise_order = otherOrder
    other.order = peOrder
    other.exercise_order = peOrder
    onRefresh()
  }

  async function handleRemoveExercise(peId) {
    setRemoving(peId)
    try {
      await programsService.removePlanExercise(peId)
      onRefresh()
    } finally {
      setRemoving(null)
    }
  }

  async function handleDeletePlan() {
    if (!confirm(`Excluir o treino "${plan.name}"?`)) return
    await programsService.deletePlan(plan.id)
    onRefresh()
  }

  return (
    <div className="bg-brand-dark bg-opacity-60 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{plan.name}</span>
          {plan.day_label && <span className="text-xs text-brand-muted">{plan.day_label}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddExercise(true)} className="text-xs bg-brand-green bg-opacity-15 text-brand-green px-2 py-1 rounded font-medium hover:bg-opacity-25 transition-colors">+ Exercício</button>
          <button onClick={handleDeletePlan} className="text-xs text-red-400 hover:text-red-300 transition-colors px-1">Excluir</button>
        </div>
      </div>

      {exercises.length === 0 ? (
        <p className="text-xs text-brand-muted py-2">Nenhum exercício. Clique "+ Exercício" para adicionar.</p>
      ) : (
        <div className="space-y-1">
          {exercises.map((pe, idx) => {
            const ex = store.exercises.find(e => e.id === pe.exercise_id)
            const groupColor = ex ? getMuscleGroupColor(ex.muscle_group_id) : ''
            const groupName = ex ? getMuscleGroupName(ex.muscle_group_id) : ''
            const wc = store.week_configs.find(c => c.plan_exercise_id === pe.id && c.week === 1)
            const prevPe = idx > 0 ? exercises[idx - 1] : null
            const isConjugated = pe.superset_group && prevPe?.superset_group === pe.superset_group
            return (
              <div key={pe.id} className={`flex items-center justify-between gap-2 bg-brand-secondary bg-opacity-40 rounded px-3 py-2 ${pe.superset_group ? 'border-l-2 border-yellow-400' : ''}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-brand-muted w-5 shrink-0">{idx + 1}.</span>
                  <span className="text-sm text-white truncate">{ex?.name || getExerciseName(pe.exercise_id)}</span>
                  {groupName && <span className={`muscle-badge text-[10px] ${groupColor}`}>{groupName}</span>}
                  {wc && (
                    <span className="text-xs text-brand-green font-medium whitespace-nowrap">
                      {wc.sets}×{wc.reps_min}{wc.reps_max !== wc.reps_min ? `–${wc.reps_max}` : ''}
                      {wc.suggested_weight_kg > 0 && ` · ${wc.suggested_weight_kg}kg`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Conj button */}
                  {idx > 0 && (
                    <button
                      onClick={() => handleToggleConjugado(pe, prevPe)}
                      className={`text-[10px] font-bold px-1.5 py-1 rounded border transition-colors ${
                        isConjugated
                          ? 'bg-yellow-400 bg-opacity-20 text-yellow-400 border-yellow-400 border-opacity-40'
                          : 'text-brand-muted border-brand-secondary hover:text-yellow-400 hover:border-yellow-400 hover:border-opacity-40'
                      }`}
                      title={isConjugated ? 'Desfazer conjugado' : 'Conjugar com exercício anterior'}
                    >
                      Conj
                    </button>
                  )}
                  {/* Move up */}
                  <button
                    onClick={() => handleMoveExercise(pe, 'up')}
                    disabled={idx === 0}
                    className="text-brand-muted hover:text-white text-xs px-1 py-1 disabled:opacity-30 transition-colors"
                    title="Mover para cima"
                  >
                    ▲
                  </button>
                  {/* Move down */}
                  <button
                    onClick={() => handleMoveExercise(pe, 'down')}
                    disabled={idx === exercises.length - 1}
                    className="text-brand-muted hover:text-white text-xs px-1 py-1 disabled:opacity-30 transition-colors"
                    title="Mover para baixo"
                  >
                    ▼
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => handleRemoveExercise(pe.id)}
                    disabled={removing === pe.id}
                    className="text-red-400 hover:text-red-300 text-sm px-1 py-1 disabled:opacity-50 transition-colors"
                    title="Remover exercício"
                  >
                    🗑
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAddExercise && (
        <AddExerciseModal planId={plan.id} phaseId={plan.phase_id} onSave={handleAddExercise} onClose={() => setShowAddExercise(false)} />
      )}
    </div>
  )
}

function PhaseCard({ phase, onStatusChange, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showAddPlan, setShowAddPlan] = useState(false)

  const plans = store.training_plans.filter((p) => p.phase_id === phase.id)

  async function handleAddPlan({ name, dayLabel }) {
    await programsService.createPlan(phase.id, { name, dayLabel })
    onRefresh()
  }

  function formatDate(d) {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  async function handleActivate() {
    setLoading(true)
    try {
      // Deactivate any currently active phases for this student
      const activePhasesForStudent = store.training_phases.filter(
        (p) => p.student_id === phase.student_id && p.status === 'active' && p.id !== phase.id
      )
      for (const ap of activePhasesForStudent) {
        await programsService.updatePhase(ap.id, { status: 'completed' })
      }
      await programsService.updatePhase(phase.id, { status: 'active' })
      onRefresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleComplete() {
    setLoading(true)
    try {
      await programsService.updatePhase(phase.id, { status: 'completed' })
      onRefresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-brand-card border border-brand-secondary rounded-xl overflow-hidden">
      {/* Phase header */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white">{phase.name}</span>
              <StatusBadge status={phase.status} />
            </div>
            <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-brand-muted">
              <span>Início: {formatDate(phase.start_date)}</span>
              {phase.end_date && <span>Fim: {formatDate(phase.end_date)}</span>}
              <span>{phase.total_weeks} semana{phase.total_weeks !== 1 ? 's' : ''}</span>
              <span>{plans.length} treino{plans.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {phase.status === 'planned' && (
              <button
                onClick={handleActivate}
                disabled={loading}
                className="text-xs bg-brand-green bg-opacity-15 text-brand-green border border-brand-green border-opacity-30 px-3 py-1.5 rounded-lg font-medium hover:bg-opacity-25 transition-colors disabled:opacity-50"
              >
                Ativar
              </button>
            )}
            {phase.status === 'active' && (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="text-xs bg-brand-secondary text-brand-muted border border-brand-secondary px-3 py-1.5 rounded-lg font-medium hover:text-white transition-colors disabled:opacity-50"
              >
                Concluir
              </button>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-brand-muted hover:text-white transition-colors text-sm px-2 py-1.5"
            >
              {expanded ? '▲' : '▼'}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded: plans with exercise management */}
      {expanded && (
        <div className="border-t border-brand-secondary px-5 py-3 space-y-3 bg-brand-dark bg-opacity-40">
          {plans.map((plan) => (
            <PlanEditor key={plan.id} plan={plan} onRefresh={onRefresh} />
          ))}
          <button
            onClick={() => setShowAddPlan(true)}
            className="w-full text-xs text-brand-green border border-brand-green border-opacity-30 rounded-lg py-2 font-medium hover:bg-brand-green hover:bg-opacity-10 transition-colors"
          >
            + Novo Treino
          </button>
          {showAddPlan && (
            <AddPlanModal
              phaseId={phase.id}
              onSave={handleAddPlan}
              onClose={() => setShowAddPlan(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function StudentTreinosContent({ studentId }) {
  const [phases, setPhases] = useState(() =>
    store.training_phases.filter((p) => p.student_id === studentId)
  )
  const [modalOpen, setModalOpen] = useState(false)

  function refresh() {
    setPhases([...store.training_phases.filter((p) => p.student_id === studentId)])
  }

  async function handleAddPhase({ name, startDate, totalWeeks }) {
    await programsService.createPhase(studentId, {
      name,
      startDate,
      totalWeeks,
      status: 'planned',
    })
    refresh()
  }

  const sorted = [...phases].sort((a, b) => {
    const statusOrder = { active: 0, planned: 1, completed: 2 }
    return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-brand-muted text-sm">
          {phases.length} fase{phases.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-brand-green text-brand-dark px-4 py-2 rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-colors"
        >
          + Nova Fase
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-brand-card border border-brand-secondary rounded-xl p-8 text-center">
          <p className="text-brand-muted">Nenhuma fase criada para este aluno.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <AddPhaseModal
          studentId={studentId}
          onSave={handleAddPhase}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}

export default function TreinosPage({ params }) {
  const students = store.users.filter((u) => u.role === 'student')
  const [selectedId, setSelectedId] = useState(() => {
    if (params?.studentId) {
      if (students.find((s) => s.id === params.studentId)) return params.studentId
    }
    return students[0]?.id ?? null
  })

  const selectedStudent = students.find((s) => s.id === selectedId)

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Treinos</h1>
          <p className="text-brand-muted text-sm mt-1">Gerenciamento de fases de treino por aluno</p>
        </div>

        {/* Student selector */}
        {students.length > 0 ? (
          <div>
            <label className="block text-sm text-brand-muted mb-1.5">Aluno</label>
            <select
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-brand-card border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green w-full max-w-xs"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="bg-brand-card border border-brand-secondary rounded-xl p-8 text-center">
            <p className="text-brand-muted">Nenhum aluno cadastrado.</p>
          </div>
        )}

        {/* Content */}
        {selectedStudent && (
          <StudentTreinosContent key={selectedId} studentId={selectedId} />
        )}
      </div>
    </AdminLayout>
  )
}

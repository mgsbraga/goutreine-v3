import { useState, useRef, useEffect } from 'react'
import { sb } from '../../../lib/supabase'
import { store } from '../../../shared/constants/store'
import * as programsService from '../../../services/programs'
import { PERIODIZATION_SCHEMES } from '../../../shared/constants/periodization-schemes'
import { getExerciseName, getActivePhase, getCurrentWeekForPhase } from '../../../shared/utils/phase-helpers'
import { getMuscleGroupName, getMuscleGroupColor } from '../../../shared/utils/muscle-groups'
import { Chart } from '../../../lib/chart'
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
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({ sets: 3, repsMin: 8, repsMax: 12, weight: 0 })

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

  function startEdit(pe) {
    const wc = store.week_configs.find(c => c.plan_exercise_id === pe.id && c.week === 1)
    setEditValues({
      sets: wc?.sets || 3,
      repsMin: wc?.reps_min || 8,
      repsMax: wc?.reps_max || 12,
      weight: wc?.suggested_weight_kg || 0,
    })
    setEditingId(pe.id)
  }

  async function saveEdit(pe) {
    const phase = store.training_phases.find(p => p.id === plan.phase_id)
    const totalWeeks = phase?.total_weeks || 8
    const configs = Array.from({ length: totalWeeks }, (_, i) => ({
      week: i + 1,
      sets: Number(editValues.sets) || 3,
      reps_min: Number(editValues.repsMin) || 8,
      reps_max: Number(editValues.repsMax) || 12,
      suggested_weight_kg: Number(editValues.weight) || 0,
      drop_sets: 0,
      notes: '',
    }))
    await programsService.bulkUpdateWeekConfigs(pe.id, configs)
    setEditingId(null)
    onRefresh()
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
        <button onClick={handleDeletePlan} className="text-xs text-red-400 hover:text-red-300 transition-colors px-1">Excluir</button>
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
            const isEditing = editingId === pe.id
            return (
              <div key={pe.id} className={`bg-brand-secondary bg-opacity-40 rounded px-3 py-2 ${pe.superset_group ? 'border-l-2 border-yellow-400' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-brand-muted w-5 shrink-0">{idx + 1}.</span>
                    <span className="text-sm text-white truncate">{ex?.name || getExerciseName(pe.exercise_id)}</span>
                    {groupName && <span className={`muscle-badge text-[10px] ${groupColor}`}>{groupName}</span>}
                    {!isEditing && wc && (
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
                        className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${
                          isConjugated
                            ? 'bg-yellow-400 bg-opacity-20 text-yellow-400 border-yellow-400 border-opacity-40'
                            : 'text-brand-muted border-brand-secondary hover:text-yellow-400 hover:border-yellow-400 hover:border-opacity-40'
                        }`}
                        title={isConjugated ? 'Desfazer conjugado' : 'Conjugar com exercício anterior'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3L4 7l4 4"/><path d="M4 7h16"/><path d="M16 21l4-4-4-4"/><path d="M20 17H4"/></svg>
                      </button>
                    )}
                    {/* Edit */}
                    <button
                      onClick={() => isEditing ? saveEdit(pe) : startEdit(pe)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${
                        isEditing
                          ? 'bg-brand-green bg-opacity-20 text-brand-green border-brand-green border-opacity-40'
                          : 'text-brand-muted border-brand-secondary hover:text-brand-green hover:border-brand-green hover:border-opacity-40'
                      }`}
                      title={isEditing ? 'Salvar' : 'Editar'}
                    >
                      {isEditing ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      )}
                    </button>
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
                      className="w-7 h-7 rounded-full flex items-center justify-center border border-brand-secondary text-red-400 hover:text-red-300 hover:border-red-400 hover:border-opacity-40 transition-colors disabled:opacity-50"
                      title="Remover exercício"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
                {/* Inline edit row */}
                {isEditing && (
                  <div className="flex items-center gap-2 mt-2 pl-7">
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] text-brand-muted">Sets</label>
                      <input type="number" value={editValues.sets} onChange={e => setEditValues(v => ({...v, sets: e.target.value}))} min={1} max={20} className="w-12 bg-brand-dark border border-brand-secondary rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-brand-green" />
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] text-brand-muted">Reps</label>
                      <input type="number" value={editValues.repsMin} onChange={e => setEditValues(v => ({...v, repsMin: e.target.value}))} min={1} max={50} className="w-12 bg-brand-dark border border-brand-secondary rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-brand-green" />
                      <span className="text-[10px] text-brand-muted">–</span>
                      <input type="number" value={editValues.repsMax} onChange={e => setEditValues(v => ({...v, repsMax: e.target.value}))} min={1} max={50} className="w-12 bg-brand-dark border border-brand-secondary rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-brand-green" />
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] text-brand-muted">Kg</label>
                      <input type="number" value={editValues.weight} onChange={e => setEditValues(v => ({...v, weight: e.target.value}))} min={0} step={0.5} className="w-14 bg-brand-dark border border-brand-secondary rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-brand-green" />
                    </div>
                    <button onClick={() => setEditingId(null)} className="text-[10px] text-brand-muted hover:text-white transition-colors">✕</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <button
        onClick={() => setShowAddExercise(true)}
        className="w-full text-xs text-brand-green border border-brand-green border-opacity-30 rounded-lg py-2 font-medium hover:bg-brand-green hover:bg-opacity-10 transition-colors"
      >
        + Adicionar Exercício
      </button>

      {showAddExercise && (
        <AddExerciseModal planId={plan.id} phaseId={plan.phase_id} onSave={handleAddExercise} onClose={() => setShowAddExercise(false)} />
      )}
    </div>
  )
}

function CopyPhaseModal({ phase, onClose }) {
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const students = store.users
    .filter(u => u.role === 'student' && u.id !== phase.student_id)
    .filter(u => !search || (u.name || u.email || '').toLowerCase().includes(search.toLowerCase()))

  function toggleStudent(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  async function handleCopy() {
    if (selected.length === 0) return
    setSaving(true)
    try {
      await programsService.copyPhaseToStudents(phase.id, selected)
      setDone(true)
    } catch (err) {
      alert('Erro ao copiar: ' + (err.message || err))
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
        <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-md p-6 text-center space-y-4">
          <p className="text-brand-green font-semibold">Periodização copiada para {selected.length} aluno{selected.length !== 1 ? 's' : ''}!</p>
          <button onClick={onClose} className="bg-brand-green text-brand-dark px-6 py-2 rounded-lg text-sm font-semibold">Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
      <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold">Copiar "{phase.name}" para...</h2>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar aluno..."
          className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-green"
        />

        <div className="max-h-60 overflow-y-auto space-y-1">
          {students.length === 0 ? (
            <p className="text-brand-muted text-sm text-center py-4">Nenhum aluno encontrado.</p>
          ) : (
            students.map(s => (
              <label key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-brand-secondary hover:bg-opacity-40 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selected.includes(s.id)}
                  onChange={() => toggleStudent(s.id)}
                  className="accent-brand-green w-4 h-4 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{s.name || 'Sem nome'}</p>
                  <p className="text-xs text-brand-muted truncate">{s.email}</p>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 bg-brand-secondary text-white rounded-lg py-2 text-sm font-medium">Cancelar</button>
          <button
            onClick={handleCopy}
            disabled={saving || selected.length === 0}
            className="flex-1 bg-brand-green text-brand-dark rounded-lg py-2 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? 'Copiando...' : `Copiar para ${selected.length} aluno${selected.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function SaveAsTemplateModal({ phase, onClose }) {
  const [name, setName] = useState(phase.name)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await programsService.savePhaseAsTemplate(phase.id, { name: name.trim(), description: description.trim() })
      setDone(true)
    } catch (err) {
      alert('Erro ao salvar template: ' + (err.message || err))
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
        <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-md p-6 text-center space-y-4">
          <p className="text-brand-green font-semibold">Template "{name}" criado com sucesso!</p>
          <button onClick={onClose} className="bg-brand-green text-brand-dark px-6 py-2 rounded-lg text-sm font-semibold">Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
      <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold">Salvar como Template</h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-sm text-brand-muted mb-1">Nome do Template</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green" />
          </div>
          <div>
            <label className="block text-sm text-brand-muted mb-1">Descrição (opcional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Ex: Hipertrofia intermediário, 4x por semana" className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-green resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-brand-secondary text-white rounded-lg py-2 text-sm font-medium">Cancelar</button>
            <button type="submit" disabled={saving || !name.trim()} className="flex-1 bg-brand-green text-brand-dark rounded-lg py-2 text-sm font-semibold disabled:opacity-60">{saving ? 'Salvando...' : 'Salvar Template'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PhaseCard({ phase, onStatusChange, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  const plans = store.training_plans.filter((p) => p.phase_id === phase.id)

  async function handleAddPlan({ name, dayLabel }) {
    await programsService.createPlan(phase.id, { name, dayLabel })
    onRefresh()
  }

  function formatDate(d) {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const [menuOpen, setMenuOpen] = useState(false)

  async function handleActivate() {
    setLoading(true)
    try {
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

  async function handleDeactivate() {
    setLoading(true)
    try {
      await programsService.updatePhase(phase.id, { status: 'planned' })
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

  async function handleReactivate() {
    setLoading(true)
    try {
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

  async function handleDeletePhase() {
    setMenuOpen(false)
    if (!confirm(`Excluir a fase "${phase.name}" e todos os seus treinos?`)) return
    setLoading(true)
    try {
      await programsService.deletePhase(phase.id)
      onRefresh()
    } catch (err) {
      console.error('[DeletePhase]', err)
      alert('Erro ao excluir fase: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-brand-card border border-brand-secondary rounded-xl">
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

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Status circle buttons */}
            {phase.status === 'planned' && (
              <button
                onClick={handleActivate}
                disabled={loading}
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-brand-green bg-brand-green/15 hover:bg-brand-green/30 transition-colors disabled:opacity-50"
                title="Ativar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </button>
            )}
            {phase.status === 'active' && (
              <>
                <button
                  onClick={handleDeactivate}
                  disabled={loading}
                  className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-blue-400 bg-blue-500/15 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                  title="Desativar"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-amber-400 bg-amber-400/15 hover:bg-amber-400/30 transition-colors disabled:opacity-50"
                  title="Concluir"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                </button>
              </>
            )}
            {phase.status === 'completed' && (
              <button
                onClick={handleReactivate}
                disabled={loading}
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-brand-green bg-brand-green/15 hover:bg-brand-green/30 transition-colors disabled:opacity-50"
                title="Reativar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </button>
            )}

            {/* ⋯ Dropdown menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-brand-muted hover:bg-brand-secondary hover:text-white transition-colors text-lg ${menuOpen ? 'bg-brand-secondary text-brand-green' : ''}`}
              >
                ⋯
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute top-[calc(100%+6px)] right-0 z-50 bg-[#333] border border-[#4a4a4a] rounded-xl min-w-[200px] p-1 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                    <button
                      onClick={() => { setMenuOpen(false); setShowCopyModal(true) }}
                      className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm text-[#ddd] rounded-lg hover:bg-white/[0.08] hover:text-white transition-colors"
                    >
                      <span className="text-xs opacity-70">⧉</span> Copiar para aluno
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); setShowTemplateModal(true) }}
                      className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm text-[#ddd] rounded-lg hover:bg-white/[0.08] hover:text-white transition-colors"
                    >
                      <span className="text-xs opacity-70">📋</span> Salvar como template
                    </button>
                    <div className="h-px bg-[#4a4a4a] mx-2 my-1" />
                    <button
                      onClick={handleDeletePhase}
                      disabled={loading}
                      className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm text-red-400 rounded-lg hover:bg-red-400/10 transition-colors disabled:opacity-50"
                    >
                      <span className="text-xs">🗑</span> Excluir
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Expand toggle */}
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

      {showCopyModal && (
        <CopyPhaseModal phase={phase} onClose={() => setShowCopyModal(false)} />
      )}
      {showTemplateModal && (
        <SaveAsTemplateModal phase={phase} onClose={() => setShowTemplateModal(false)} />
      )}
    </div>
  )
}

function ApplyFromTemplateModal({ studentId, onClose, onApplied }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  const templates = store.templates

  async function handleApply() {
    if (!selectedTemplate) return
    setSaving(true)
    try {
      await programsService.applyTemplateToStudent(selectedTemplate.id, studentId, {
        name: selectedTemplate.name,
        startDate,
      })
      onApplied()
      onClose()
    } catch (err) {
      alert('Erro ao aplicar template: ' + (err.message || err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
      <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold">Aplicar Template</h2>

        <div>
          <label className="block text-sm text-brand-muted mb-1">Template</label>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {templates.length === 0 ? (
              <p className="text-xs text-brand-muted py-4 text-center">Nenhum template disponível.</p>
            ) : templates.map(t => {
              const plans = store.template_plans.filter(p => p.template_id === t.id)
              const isSelected = selectedTemplate?.id === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isSelected ? 'bg-brand-green bg-opacity-15 border border-brand-green border-opacity-40' : 'bg-brand-dark hover:bg-brand-secondary'
                  }`}
                >
                  <p className="text-white font-medium">{t.name}</p>
                  <p className="text-brand-muted text-xs">{t.total_weeks} sem · {plans.length} treino{plans.length !== 1 ? 's' : ''}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm text-brand-muted mb-1">Data de início</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green" />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 bg-brand-secondary text-white rounded-lg py-2 text-sm font-medium">Cancelar</button>
          <button onClick={handleApply} disabled={saving || !selectedTemplate} className="flex-1 bg-brand-green text-brand-dark rounded-lg py-2 text-sm font-semibold disabled:opacity-60">
            {saving ? 'Aplicando...' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StudentTreinosContent({ studentId }) {
  const [phases, setPhases] = useState(() =>
    store.training_phases.filter((p) => p.student_id === studentId)
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTemplateModalOpen(true)}
            className="flex items-center gap-2 bg-brand-card border border-brand-secondary text-white px-4 py-2 rounded-lg text-sm font-medium hover:border-brand-green transition-colors"
          >
            Aplicar Template
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-brand-green text-brand-dark px-4 py-2 rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-colors"
          >
            + Nova Periodização
          </button>
        </div>
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

      {templateModalOpen && (
        <ApplyFromTemplateModal
          studentId={studentId}
          onClose={() => setTemplateModalOpen(false)}
          onApplied={refresh}
        />
      )}
    </div>
  )
}

// ─── Progress Tab ──────────────────────────────────────────────────────────

const MUSCLE_COLOR_MAP = {
  1: "#A4E44B", 2: "#cccccc", 3: "#ff9664", 4: "#9664ff", 5: "#ff6496",
  6: "#64ff96", 7: "#ffc83c", 8: "#ff78c8", 9: "#64c8ff", 10: "#ff5050", 11: "#ffb432",
}
const CHART_GRID = '#3a3a3a'
const CHART_TEXT = '#999999'

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

const EXERCISE_COLORS = [
  '#ff9664', '#ffc83c', '#64c8ff', '#A4E44B', '#ff6496',
  '#9664ff', '#64ff96', '#ff78c8', '#cccccc', '#ff5050',
  '#ffb432', '#50c8a0', '#c8a050', '#a0c850',
]

function getVolumeByGroupDetailed(studentId, days) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sessions = store.workout_sessions
    .filter(s => s.student_id === studentId && new Date((s.date || s.session_date) + 'T00:00:00') >= since)
    .sort((a, b) => new Date(a.date || a.session_date) - new Date(b.date || b.session_date))
  const groups = {}
  const allDates = new Set()
  for (const session of sessions) {
    const dateStr = session.date || session.session_date
    allDates.add(dateStr)
    const logs = store.session_logs.filter(l => l.session_id === session.id)
    for (const log of logs) {
      const ex = store.exercises.find(e => e.id === log.exercise_id)
      if (!ex) continue
      const gid = ex.muscle_group_id
      if (!groups[gid]) {
        groups[gid] = { groupName: getMuscleGroupName(gid), groupColor: MUSCLE_COLOR_MAP[gid] || '#A4E44B', totalVolume: 0, exercises: {} }
      }
      if (!groups[gid].exercises[ex.id]) {
        groups[gid].exercises[ex.id] = { name: ex.name, sessionVolumes: {} }
      }
      const vol = (log.weight_kg || 0) * (log.reps_done || 0)
      groups[gid].totalVolume += vol
      groups[gid].exercises[ex.id].sessionVolumes[dateStr] =
        (groups[gid].exercises[ex.id].sessionVolumes[dateStr] || 0) + vol
    }
  }
  return Object.entries(groups)
    .filter(([, g]) => g.totalVolume > 0)
    .sort((a, b) => b[1].totalVolume - a[1].totalVolume)
    .map(([gid, g]) => ({
      gid: parseInt(gid), ...g,
      dates: [...allDates].sort(),
      exercises: Object.entries(g.exercises).map(([exId, ex]) => ({ exId: parseInt(exId), ...ex })),
    }))
}

function AdminGroupDetailChart({ group, chartId }) {
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
          legend: { position: 'bottom', labels: { color: CHART_TEXT, boxWidth: 12, font: { size: 10 } } },
          tooltip: { callbacks: { label: (item) => `${item.dataset.label}: ${item.raw.toLocaleString()} kg vol` } },
        },
        scales: {
          x: { stacked: true, ticks: { color: CHART_TEXT, font: { size: 10 } }, grid: { color: CHART_GRID } },
          y: { stacked: true, ticks: { color: CHART_TEXT, callback: v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v }, grid: { color: CHART_GRID }, beginAtZero: true },
        },
      },
    })
  }
  return <ChartCanvas id={chartId} buildChart={buildChart} deps={[group.dates.join(','), group.exercises.length]} />
}

function AdminGroupDetailView({ studentId, days, onBack }) {
  const groupData = getVolumeByGroupDetailed(studentId, days)
  return (
    <div className="space-y-4">
      <div>
        <button onClick={onBack} className="text-brand-muted text-sm hover:text-white transition-colors mb-1">← Voltar</button>
        <h3 className="text-sm font-semibold text-white">Progresso por Grupamento</h3>
        <p className="text-xs text-brand-muted">Últimos {days} dias</p>
      </div>
      {groupData.length === 0 ? (
        <div className="bg-brand-card border border-brand-secondary rounded-xl p-8 text-center">
          <p className="text-brand-muted text-sm">Nenhum dado no período.</p>
        </div>
      ) : (
        groupData.map((group) => (
          <div key={group.gid} className="bg-brand-card border border-brand-secondary rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.groupColor }} />
                <span className="text-sm font-semibold text-white">{group.groupName}</span>
              </div>
              <span className="text-xs font-medium" style={{ color: group.groupColor }}>
                {group.totalVolume >= 1000 ? `${(group.totalVolume / 1000).toFixed(1)}k kg vol.` : `${Math.round(group.totalVolume)} kg vol.`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {group.exercises.map((ex, i) => {
                const totalExVol = Object.values(ex.sessionVolumes).reduce((s, v) => s + v, 0)
                return (
                  <span key={ex.exId} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: EXERCISE_COLORS[i % EXERCISE_COLORS.length], color: '#1a1a1a' }}>
                    {ex.name}: {totalExVol >= 1000 ? `${(totalExVol/1000).toFixed(1)}k` : Math.round(totalExVol)}kg
                  </span>
                )
              })}
            </div>
            <AdminGroupDetailChart group={group} chartId={`admin-group-detail-${group.gid}`} />
          </div>
        ))
      )}
    </div>
  )
}

function StudentProgressContent({ studentId }) {
  const [days, setDays] = useState(30)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [showGroupDetail, setShowGroupDetail] = useState(false)

  const since = new Date()
  since.setDate(since.getDate() - days)

  // ── Data ──

  // Personal records
  const studentSessionIds = store.workout_sessions
    .filter(s => s.student_id === studentId)
    .map(s => s.id)
  const studentLogs = store.session_logs.filter(l => studentSessionIds.includes(l.session_id))

  const prs = (() => {
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
  })()

  // Progression data for selected exercise
  const defaultExercise = selectedExercise ?? (
    store.exercises.find(ex =>
      studentLogs.some(l => l.exercise_id === ex.id && l.weight_kg > 0)
    )?.id ?? (store.exercises[0]?.id ?? null)
  )

  const progressionData = (() => {
    const sessions = store.workout_sessions
      .filter(s => s.student_id === studentId && new Date((s.date || s.session_date) + 'T00:00:00') >= since)
      .sort((a, b) => new Date(a.date || a.session_date) - new Date(b.date || b.session_date))
    return sessions.reduce((acc, session) => {
      const logs = store.session_logs.filter(
        l => l.session_id === session.id && l.exercise_id === defaultExercise
      )
      if (logs.length === 0) return acc
      const maxWeight = Math.max(...logs.map(l => l.weight_kg || 0))
      if (maxWeight > 0) acc.push({ date: session.date || session.session_date, weight: maxWeight })
      return acc
    }, [])
  })()

  // Volume by muscle group
  const volumeData = (() => {
    const filteredSessionIds = store.workout_sessions
      .filter(s => s.student_id === studentId && new Date((s.date || s.session_date) + 'T00:00:00') >= since)
      .map(s => s.id)
    const logs = store.session_logs.filter(l => filteredSessionIds.includes(l.session_id))
    const volumeMap = {}
    for (const log of logs) {
      const ex = store.exercises.find(e => e.id === log.exercise_id)
      if (!ex) continue
      const gid = ex.muscle_group_id
      volumeMap[gid] = (volumeMap[gid] || 0) + (log.weight_kg || 0) * (log.reps_done || 0)
    }
    const entries = Object.entries(volumeMap).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    return {
      labels: entries.map(([gid]) => getMuscleGroupName(parseInt(gid))),
      volumes: entries.map(([, v]) => Math.round(v)),
      colors: entries.map(([gid]) => MUSCLE_COLOR_MAP[parseInt(gid)] || '#A4E44B'),
    }
  })()

  // Weekly volume
  const weeklyVolumeData = (() => {
    const sessions = store.workout_sessions
      .filter(s => s.student_id === studentId && new Date((s.date || s.session_date) + 'T00:00:00') >= since)
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
      labels: entries.map(([k]) => `S${parseInt(k.split('-W')[1])}`),
      volumes: entries.map(([, v]) => Math.round(v.volume)),
      sessionCounts: entries.map(([, v]) => v.count),
    }
  })()

  // Exercise selector grouped by muscle group
  const exercisesByGroup = store.muscle_groups.map(group => ({
    group,
    exercises: store.exercises.filter(e => e.muscle_group_id === group.id),
  })).filter(g => g.exercises.length > 0)

  // ── Chart builders ──

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
        plugins: { legend: { labels: { color: CHART_TEXT } } },
        scales: {
          x: { ticks: { color: CHART_TEXT }, grid: { color: CHART_GRID } },
          y: { ticks: { color: CHART_TEXT, callback: v => `${v} kg` }, grid: { color: CHART_GRID } },
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
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: CHART_TEXT }, grid: { color: CHART_GRID }, beginAtZero: true },
          y: { ticks: { color: CHART_TEXT }, grid: { color: CHART_GRID } },
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
        plugins: { legend: { labels: { color: CHART_TEXT } } },
        scales: {
          x: { ticks: { color: CHART_TEXT }, grid: { color: CHART_GRID } },
          y: { position: 'left', ticks: { color: '#A4E44B' }, grid: { color: CHART_GRID }, beginAtZero: true },
          y1: { position: 'right', ticks: { color: '#64c8ff', stepSize: 1 }, grid: { drawOnChartArea: false }, beginAtZero: true },
        },
      },
    })
  }

  const noData = studentSessionIds.length === 0

  return (
    <div className="space-y-4">
      {/* Time filter */}
      <div className="flex gap-2">
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

      {noData ? (
        <div className="bg-brand-card border border-brand-secondary rounded-xl p-8 text-center">
          <p className="text-brand-muted">Nenhum treino registrado para este aluno.</p>
        </div>
      ) : (
        <>
          {/* Personal records */}
          {prs.length > 0 && (
            <div className="bg-brand-card border border-brand-secondary rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Recordes Pessoais</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {prs.map(({ exerciseId, weight }) => (
                  <div key={exerciseId} className="bg-brand-secondary rounded-lg px-3 py-2">
                    <p className="text-xs text-brand-muted truncate">{getExerciseName(exerciseId)}</p>
                    <p className="text-lg font-bold text-brand-green">{weight} kg</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progression chart */}
          <div className="bg-brand-card border border-brand-secondary rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Progressão de Carga</h3>
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
              <p className="text-brand-muted text-sm text-center py-6">Sem dados para este exercício no período.</p>
            ) : (
              <ChartCanvas id="admin-progression" buildChart={buildProgressionChart} deps={[defaultExercise, days, progressionData.length]} />
            )}
          </div>

          {/* Volume by muscle group */}
          {!showGroupDetail ? (
            <div
              className="bg-brand-card border border-brand-secondary rounded-xl p-4 cursor-pointer hover:border-brand-green transition-colors"
              onClick={() => volumeData.labels.length > 0 && setShowGroupDetail(true)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Volume por Grupo Muscular</h3>
                {volumeData.labels.length > 0 && (
                  <span className="text-xs text-brand-green">Ver detalhes ›</span>
                )}
              </div>
              {volumeData.labels.length === 0 ? (
                <p className="text-brand-muted text-sm text-center py-6">Nenhum volume registrado no período.</p>
              ) : (
                <>
                  <ChartCanvas id="admin-volume-group" buildChart={buildVolumeChart} deps={[days, volumeData.labels.join(',')]} />
                  <p className="text-xs text-brand-muted text-center mt-2">Clique para ver gráficos detalhados por grupamento</p>
                </>
              )}
            </div>
          ) : (
            <AdminGroupDetailView studentId={studentId} days={days} onBack={() => setShowGroupDetail(false)} />
          )}

          {/* Weekly volume */}
          <div className="bg-brand-card border border-brand-secondary rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Volume Semanal</h3>
            {weeklyVolumeData.labels.length === 0 ? (
              <p className="text-brand-muted text-sm text-center py-6">Nenhum dado de volume no período.</p>
            ) : (
              <ChartCanvas id="admin-weekly-volume" buildChart={buildWeeklyVolumeChart} deps={[days, weeklyVolumeData.labels.join(',')]} />
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function TreinosPage({ params }) {
  const students = store.users.filter((u) => u.role === 'student')
  const [selectedId, setSelectedId] = useState(() => {
    if (params?.studentId) {
      if (students.find((s) => s.id === params.studentId)) return params.studentId
    }
    return students[0]?.id ?? null
  })
  const [tab, setTab] = useState('treinos')

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
              onChange={(e) => { setSelectedId(e.target.value); setTab('treinos') }}
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

        {/* Tabs */}
        {selectedStudent && (
          <div className="flex gap-1 bg-brand-card border border-brand-secondary rounded-lg p-1">
            {[
              { key: 'treinos', label: 'Treinos' },
              { key: 'progresso', label: 'Progresso' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-brand-green text-brand-dark'
                    : 'text-brand-muted hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {selectedStudent && tab === 'treinos' && (
          <StudentTreinosContent key={selectedId} studentId={selectedId} />
        )}
        {selectedStudent && tab === 'progresso' && (
          <StudentProgressContent key={selectedId + '-progress'} studentId={selectedId} />
        )}
      </div>
    </AdminLayout>
  )
}

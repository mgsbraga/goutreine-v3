import { useState, useRef, useEffect } from 'react'
import { sb } from '../../../lib/supabase'
import { store } from '../../../shared/constants/store'
import * as programsService from '../../../services/programs'
import { PERIODIZATION_SCHEMES } from '../../../shared/constants/periodization-schemes'
import { getExerciseName, getActivePhase, getCurrentWeekForPhase, getSchemeForPhase } from '../../../shared/utils/phase-helpers'
import { getMuscleGroupName, getMuscleGroupColor, getExerciseActivations, exerciseHasMuscleGroup } from '../../../shared/utils/muscle-groups'
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
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [totalWeeks, setTotalWeeks] = useState(9)
  const [schemeId, setSchemeId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Merge built-in + custom schemes
  const allSchemes = [
    ...PERIODIZATION_SCHEMES.map(s => ({ ...s, type: 'padrao' })),
    ...(store.custom_schemes || []).map(s => ({ ...s, type: 'custom' })),
  ]

  function handleSchemeChange(val) {
    setSchemeId(val)
    if (val) {
      const scheme = allSchemes.find(s => String(s.id) + '-' + s.type === val)
      if (scheme) setTotalWeeks(scheme.total_weeks || scheme.configs?.length || 9)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Nome é obrigatório.')
    if (!startDate) return setError('Data de início é obrigatória.')
    setError(null)
    setSaving(true)
    try {
      const parsedScheme = schemeId ? allSchemes.find(s => String(s.id) + '-' + s.type === schemeId) : null
      await onSave({
        name: name.trim(),
        startDate,
        totalWeeks: Number(totalWeeks),
        schemeId: parsedScheme?.type === 'padrao' ? parsedScheme.id : null,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao criar treino.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-md p-6 space-y-5">
        <h2 className="text-lg font-bold">Adicionar Programa</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-brand-muted mb-1">Nome do Treino</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Hipertrofia — Fase 1"
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

          <div>
            <label className="block text-sm text-brand-muted mb-1">Periodização</label>
            <select
              value={schemeId}
              onChange={(e) => handleSchemeChange(e.target.value)}
              className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green"
            >
              <option value="">Sem periodização pré-definida</option>
              {allSchemes.length > 0 && (
                <>
                  <optgroup label="Padrão">
                    {allSchemes.filter(s => s.type === 'padrao').map(s => (
                      <option key={`p-${s.id}`} value={`${s.id}-padrao`}>
                        {s.name} ({s.total_weeks} sem.)
                      </option>
                    ))}
                  </optgroup>
                  {allSchemes.some(s => s.type === 'custom') && (
                    <optgroup label="Customizados">
                      {allSchemes.filter(s => s.type === 'custom').map(s => (
                        <option key={`c-${s.id}`} value={`${s.id}-custom`}>
                          {s.name} ({s.total_weeks || s.configs?.length} sem.)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </>
              )}
            </select>
            <p className="text-[10px] text-brand-muted mt-1">Define as fases semanais (BASE, CHOQUE, DELOAD...)</p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-brand-secondary text-white rounded-lg py-2 text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-brand-green text-brand-dark rounded-lg py-2 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving ? 'Criando...' : 'Adicionar'}
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

  // Check if phase has a periodização — if so, sets/reps come from the scheme
  const phase = store.training_phases.find(p => p.id === phaseId)
  const hasScheme = !!phase?.scheme_id

  const groups = store.muscle_groups.filter(g =>
    store.exercises.some(e => e.muscle_group_id === g.id)
  )
  const filteredExercises = selectedGroup
    ? store.exercises.filter(e => exerciseHasMuscleGroup(e, parseInt(selectedGroup)))
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
        sets: hasScheme ? null : (Number(sets) || 3),
        repsMin: hasScheme ? null : (Number(repsMin) || 8),
        repsMax: hasScheme ? null : (Number(repsMax) || 12),
        suggestedWeight: Number(suggestedWeight) || 0,
        phaseId,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
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

          {/* Sets/reps only shown if NO periodização is set — otherwise the scheme defines them */}
          {!hasScheme && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm text-brand-muted mb-1">Séries</label>
                <input type="number" inputMode="numeric" value={sets} onChange={e => setSets(e.target.value)} min={1} max={10} className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green" />
              </div>
              <div>
                <label className="block text-sm text-brand-muted mb-1">Reps mín</label>
                <input type="number" inputMode="numeric" value={repsMin} onChange={e => setRepsMin(e.target.value)} min={1} max={50} className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green" />
              </div>
              <div>
                <label className="block text-sm text-brand-muted mb-1">Reps máx</label>
                <input type="number" inputMode="numeric" value={repsMax} onChange={e => setRepsMax(e.target.value)} min={1} max={50} className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green" />
              </div>
            </div>
          )}

          {hasScheme && (
            <p className="text-[11px] text-brand-muted bg-brand-dark rounded-lg px-3 py-2 border border-brand-secondary">
              Séries e repetições definidas pela periodização selecionada. Edite em ⋯ → Editar Fases.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm text-brand-muted mb-1">Carga sugerida (kg)</label>
              <input type="number" inputMode="decimal" value={suggestedWeight} onChange={e => setSuggestedWeight(e.target.value)} min={0} step={0.5} placeholder="Opcional" className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-green" />
            </div>
            <div>
              <label className="block text-sm text-brand-muted mb-1">Descanso (seg)</label>
              <input type="number" inputMode="numeric" value={restSeconds} onChange={e => setRestSeconds(e.target.value)} min={0} max={300} className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green" />
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
    const phase = store.training_phases.find(p => p.id === (phaseId || plan.phase_id))
    const totalWeeks = phase?.total_weeks || 8

    // If phase has a periodização, use scheme configs for sets/reps per week
    const scheme = phase?.scheme_id
      ? PERIODIZATION_SCHEMES.find(s => s.id === phase.scheme_id)
      : null
    // Also check custom schemes
    const customScheme = !scheme && phase?.scheme_id
      ? (store.custom_schemes || []).find(s => s.id === phase.scheme_id)
      : null
    const schemeConfigs = scheme?.configs || customScheme?.configs || null

    const configs = Array.from({ length: totalWeeks }, (_, i) => {
      const weekNum = i + 1
      const sc = schemeConfigs?.find(c => c.week === weekNum)
      return {
        week: weekNum,
        sets: sc?.sets ?? sets ?? 3,
        reps_min: sc?.reps_min ?? repsMin ?? 8,
        reps_max: sc?.reps_max ?? repsMax ?? 12,
        suggested_weight_kg: suggestedWeight || 0,
        drop_sets: sc?.drop_sets ?? 0,
        notes: '',
      }
    })
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
            const activations = ex ? getExerciseActivations(ex) : []
            const primaryColor = activations.length > 0 ? getMuscleGroupColor(activations[0].group_id) : ''
            const primaryName = activations.length > 0 ? getMuscleGroupName(activations[0].group_id) : ''
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
                    {primaryName && <span className={`muscle-badge text-[10px] ${primaryColor}`}>{primaryName}</span>}
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
      alert('Erro ao salvar treino base: ' + (err.message || err))
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
        <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-md p-6 text-center space-y-4">
          <p className="text-brand-green font-semibold">Treino Base "{name}" criado com sucesso!</p>
          <button onClick={onClose} className="bg-brand-green text-brand-dark px-6 py-2 rounded-lg text-sm font-semibold">Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
      <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold">Salvar como Treino Base</h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-sm text-brand-muted mb-1">Nome do Treino Base</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green" />
          </div>
          <div>
            <label className="block text-sm text-brand-muted mb-1">Descrição (opcional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Ex: Hipertrofia intermediário, 4x por semana" className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-green resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-brand-secondary text-white rounded-lg py-2 text-sm font-medium">Cancelar</button>
            <button type="submit" disabled={saving || !name.trim()} className="flex-1 bg-brand-green text-brand-dark rounded-lg py-2 text-sm font-semibold disabled:opacity-60">{saving ? 'Salvando...' : 'Salvar Treino Base'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Phase presets for week editor ───────────────────────────────────────────
const PHASE_PRESETS = [
  { name: 'BASE', color: '#3B82F6' },
  { name: 'INTENSIF.', color: '#22C55E' },
  { name: 'CHOQUE', color: '#F97316' },
  { name: 'CHOQUE+', color: '#EF4444' },
  { name: 'RECUPERAÇÃO', color: '#6B7280' },
  { name: 'DELOAD', color: '#A855F7' },
  { name: 'PICO', color: '#FBBF24' },
]

const PHASE_COLORS = ['#3B82F6', '#22C55E', '#F97316', '#EF4444', '#6B7280', '#A855F7', '#FBBF24', '#EC4899']

function PhaseWeekEditor({ phase, onClose, onSave }) {
  const scheme = getSchemeForPhase(phase)
  const currentWeek = getCurrentWeekForPhase(phase) - 1
  const plans = store.training_plans.filter(p => p.phase_id === phase.id)

  // All exercises across all plans, with their plan name
  const allExercises = plans.flatMap(plan => {
    return store.plan_exercises
      .filter(pe => pe.plan_id === plan.id)
      .sort((a, b) => (a.order ?? a.exercise_order ?? 0) - (b.order ?? b.exercise_order ?? 0))
      .map(pe => {
        const ex = store.exercises.find(e => e.id === pe.exercise_id)
        return { pe, ex, planName: plan.name }
      })
  })

  const [weeks, setWeeks] = useState(() => {
    const total = phase.total_weeks || 8
    if (scheme?.configs) {
      return scheme.configs.slice(0, total).map(c => ({
        phase: c.phase || 'BASE', color: c.phase_color || '#3B82F6', desc: c.description || '',
      }))
    }
    return Array.from({ length: total }, () => ({ phase: 'BASE', color: '#3B82F6', desc: '' }))
  })

  // Exercise week configs: { [peId-week]: { sets, repsMin, repsMax, weight } }
  const [exConfigs, setExConfigs] = useState(() => {
    const map = {}
    for (const { pe } of allExercises) {
      const total = phase.total_weeks || 8
      for (let w = 1; w <= total; w++) {
        const wc = store.week_configs.find(c => c.plan_exercise_id === pe.id && c.week === w)
        map[`${pe.id}-${w}`] = {
          sets: wc?.sets ?? 3,
          repsMin: wc?.reps_min ?? 8,
          repsMax: wc?.reps_max ?? 12,
          weight: wc?.suggested_weight_kg ?? 0,
        }
      }
    }
    return map
  })

  const [editingWeek, setEditingWeek] = useState(null)
  const [selectedColor, setSelectedColor] = useState('#3B82F6')
  const [customName, setCustomName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  function clickWeek(i) {
    setEditingWeek(i)
    setSelectedColor(weeks[i].color)
    setCustomName(weeks[i].phase)
    setDesc(weeks[i].desc)
  }

  function pickPreset(preset) {
    setCustomName(preset.name)
    setSelectedColor(preset.color)
  }

  function applyPhaseEdit() {
    const name = customName || 'BASE'
    setWeeks(prev => {
      const next = [...prev]
      next[editingWeek] = { phase: name, color: selectedColor, desc }
      return next
    })
  }

  function updateExConfig(peId, week, field, value) {
    setExConfigs(prev => ({
      ...prev,
      [`${peId}-${week}`]: { ...prev[`${peId}-${week}`], [field]: value },
    }))
  }

  async function handleSaveAll() {
    setSaving(true)
    try {
      const { sb } = await import('../../../lib/supabase')

      // 1. Save phase labels
      const configs = weeks.map((w, i) => ({
        week: i + 1, phase: w.phase, phase_color: w.color, description: w.desc,
      }))
      await onSave(configs)

      // 2. Save exercise week_configs in batch
      if (sb && allExercises.length > 0) {
        const wcRows = []
        for (const { pe } of allExercises) {
          const total = phase.total_weeks || 8
          for (let w = 1; w <= total; w++) {
            const cfg = exConfigs[`${pe.id}-${w}`]
            if (cfg) {
              wcRows.push({
                plan_exercise_id: pe.id, week: w,
                sets: Number(cfg.sets) || 3,
                reps_min: Number(cfg.repsMin) || 8,
                reps_max: Number(cfg.repsMax) || 12,
                suggested_weight_kg: Number(cfg.weight) || 0,
                drop_sets: 0, notes: '',
              })
            }
          }
        }
        if (wcRows.length > 0) {
          const { error } = await sb.from('week_configs').upsert(wcRows, { onConflict: 'plan_exercise_id,week' })
          if (error) console.error('[WeekConfigs]', error)
          // Update local store
          for (const row of wcRows) {
            const idx = store.week_configs.findIndex(wc => wc.plan_exercise_id === row.plan_exercise_id && wc.week === row.week)
            if (idx >= 0) Object.assign(store.week_configs[idx], row)
            else store.week_configs.push(row)
          }
        }
      } else {
        // Mock mode
        for (const { pe } of allExercises) {
          const total = phase.total_weeks || 8
          const cfgs = []
          for (let w = 1; w <= total; w++) {
            const cfg = exConfigs[`${pe.id}-${w}`]
            cfgs.push({
              week: w, sets: Number(cfg?.sets) || 3, reps_min: Number(cfg?.repsMin) || 8,
              reps_max: Number(cfg?.repsMax) || 12, suggested_weight_kg: Number(cfg?.weight) || 0, drop_sets: 0, notes: '',
            })
          }
          await programsService.bulkUpdateWeekConfigs(pe.id, cfgs)
        }
      }

      onClose()
    } catch (err) {
      alert('Erro ao salvar: ' + (err.message || err))
    } finally {
      setSaving(false)
    }
  }

  const weekNum = editingWeek !== null ? editingWeek + 1 : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Editar Programa — {phase.name}</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-white text-lg px-2">✕</button>
        </div>

        <p className="text-xs text-brand-muted">
          {phase.total_weeks} semanas · Clique numa semana para editar fase e exercícios
        </p>

        {/* Timeline */}
        <div className="flex gap-1 overflow-x-auto pb-2">
          {weeks.map((w, i) => {
            const isCurrent = i === currentWeek
            const isEditing = editingWeek === i
            return (
              <div
                key={i}
                onClick={() => clickWeek(i)}
                className={`flex-1 min-w-[60px] text-center py-2.5 px-1 rounded-lg cursor-pointer border-2 transition-all ${
                  isEditing ? 'border-brand-green' : 'border-transparent hover:border-brand-green/30'
                }`}
                style={{ background: w.color + '15' }}
              >
                <div className="text-[10px] text-brand-muted">Sem {i + 1}</div>
                <div className="text-[10px] font-bold" style={{ color: w.color }}>{w.phase}</div>
                {isCurrent && (
                  <div className="w-1.5 h-1.5 bg-brand-green rounded-full mx-auto mt-1" style={{ boxShadow: '0 0 6px rgba(164,228,75,0.5)' }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Edit panel for selected week */}
        {editingWeek !== null && (
          <div className="space-y-3">
            {/* Phase section */}
            <div className="bg-brand-dark border border-brand-secondary rounded-lg p-4 space-y-3">
              <span className="text-sm font-semibold">Semana {weekNum} — Fase</span>

              <div className="flex gap-1.5 flex-wrap">
                {PHASE_PRESETS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => { pickPreset(p); }}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wide transition-all ${
                      customName === p.name ? 'border border-white scale-105' : 'border border-transparent'
                    }`}
                    style={{ background: p.color + '20', color: p.color }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Nome customizado"
                  className="flex-1 bg-brand-card border border-brand-secondary rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-green"
                />
                <div className="flex gap-1.5 items-center">
                  {PHASE_COLORS.slice(0, 6).map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${selectedColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              <button onClick={applyPhaseEdit} className="text-xs text-brand-green font-semibold hover:underline">
                Aplicar fase
              </button>
            </div>

            {/* Exercises section */}
            {allExercises.length > 0 && (
              <div className="bg-brand-dark border border-brand-secondary rounded-lg p-4 space-y-2">
                <span className="text-sm font-semibold">Semana {weekNum} — Exercícios</span>

                <div className="space-y-1.5">
                  {(() => {
                    let lastPlan = ''
                    return allExercises.map(({ pe, ex, planName }) => {
                      const cfg = exConfigs[`${pe.id}-${weekNum}`] || { sets: 3, repsMin: 8, repsMax: 12, weight: 0 }
                      const showPlanHeader = planName !== lastPlan
                      lastPlan = planName
                      return (
                        <div key={pe.id}>
                          {showPlanHeader && (
                            <p className="text-[10px] text-brand-green font-semibold mt-2 mb-1 uppercase tracking-wide">{planName}</p>
                          )}
                          <div className="flex items-center gap-2 bg-brand-card/50 rounded-lg px-3 py-2">
                            <span className="text-xs text-white truncate flex-1 min-w-0">{ex?.name || '???'}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number" inputMode="numeric" min="1" max="20"
                                value={cfg.sets}
                                onChange={e => updateExConfig(pe.id, weekNum, 'sets', e.target.value)}
                                className="w-10 bg-brand-dark border border-brand-secondary rounded px-1 py-1 text-[11px] text-white text-center focus:outline-none focus:border-brand-green"
                                title="Séries"
                              />
                              <span className="text-[10px] text-brand-muted">×</span>
                              <input
                                type="number" inputMode="numeric" min="1" max="50"
                                value={cfg.repsMin}
                                onChange={e => updateExConfig(pe.id, weekNum, 'repsMin', e.target.value)}
                                className="w-10 bg-brand-dark border border-brand-secondary rounded px-1 py-1 text-[11px] text-white text-center focus:outline-none focus:border-brand-green"
                                title="Reps mín"
                              />
                              <span className="text-[10px] text-brand-muted">–</span>
                              <input
                                type="number" inputMode="numeric" min="1" max="50"
                                value={cfg.repsMax}
                                onChange={e => updateExConfig(pe.id, weekNum, 'repsMax', e.target.value)}
                                className="w-10 bg-brand-dark border border-brand-secondary rounded px-1 py-1 text-[11px] text-white text-center focus:outline-none focus:border-brand-green"
                                title="Reps máx"
                              />
                              <span className="text-[10px] text-brand-muted ml-1">kg</span>
                              <input
                                type="number" inputMode="decimal" min="0" step="0.5"
                                value={cfg.weight}
                                onChange={e => updateExConfig(pe.id, weekNum, 'weight', e.target.value)}
                                className="w-12 bg-brand-dark border border-brand-secondary rounded px-1 py-1 text-[11px] text-white text-center focus:outline-none focus:border-brand-green"
                                title="Peso sugerido"
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex gap-3 pt-2 border-t border-brand-secondary">
          <button onClick={onClose} className="flex-1 bg-brand-secondary text-white py-2 rounded-lg text-sm font-medium">
            Cancelar
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex-1 bg-brand-green text-brand-dark py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar Tudo'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ApplyBaseTrainingModal({ phase, onClose, onApplied }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [saving, setSaving] = useState(false)
  const templates = store.templates

  async function handleApply() {
    if (!selectedTemplate) return
    setSaving(true)
    try {
      const { sb } = await import('../../../lib/supabase')
      const tPlans = store.template_plans.filter(p => p.template_id === selectedTemplate.id)

      // If template has more weeks than the program, update the program
      const templateWeeks = selectedTemplate.total_weeks || 0
      if (templateWeeks > (phase.total_weeks || 0)) {
        await programsService.updatePhase(phase.id, { total_weeks: templateWeeks })
        phase.total_weeks = templateWeeks
      }

      if (sb) {
        // === BATCH MODE: 3 requests total ===

        // 1. Insert all plans at once
        const planRows = tPlans.map(tp => ({
          phase_id: phase.id, name: tp.name, day_label: tp.day_label, muscle_groups: tp.muscle_groups || [],
        }))
        const { data: newPlans, error: plansErr } = await sb.from('training_plans').insert(planRows).select()
        if (plansErr) throw plansErr
        store.training_plans.push(...newPlans)

        // Map old template_plan_id → new plan_id (by index, same order)
        const planMap = {}
        tPlans.forEach((tp, i) => { planMap[tp.id] = newPlans[i].id })

        // 2. Insert all exercises at once
        const exerciseRows = []
        const exerciseSourceMap = [] // track which template_exercise each row came from
        for (const tp of tPlans) {
          const tExercises = store.template_exercises
            .filter(e => e.template_plan_id === tp.id)
            .sort((a, b) => (a.order ?? a.exercise_order ?? 0) - (b.order ?? b.exercise_order ?? 0))
          for (const te of tExercises) {
            exerciseRows.push({
              plan_id: planMap[tp.id],
              exercise_id: te.exercise_id,
              rest_seconds: te.rest_seconds || 90,
              exercise_order: te.order ?? te.exercise_order ?? 1,
              superset_group: te.superset_group || null,
              notes: te.notes || '',
            })
            exerciseSourceMap.push(te.id)
          }
        }

        if (exerciseRows.length > 0) {
          const { data: newPes, error: pesErr } = await sb.from('plan_exercises').insert(exerciseRows).select()
          if (pesErr) throw pesErr
          store.plan_exercises.push(...newPes.map(pe => ({ ...pe, order: pe.exercise_order })))

          // 3. Insert all week_configs at once
          const wcRows = []
          newPes.forEach((newPe, i) => {
            const templateExId = exerciseSourceMap[i]
            const tWcs = store.template_week_configs.filter(wc => wc.template_exercise_id === templateExId)
            if (tWcs.length > 0) {
              for (const wc of tWcs) {
                wcRows.push({
                  plan_exercise_id: newPe.id, week: wc.week, sets: wc.sets,
                  reps_min: wc.reps_min, reps_max: wc.reps_max,
                  drop_sets: wc.drop_sets || 0, suggested_weight_kg: wc.suggested_weight_kg || 0, notes: wc.notes || '',
                })
              }
            } else {
              const totalWeeks = phase.total_weeks || 8
              for (let w = 1; w <= totalWeeks; w++) {
                wcRows.push({
                  plan_exercise_id: newPe.id, week: w, sets: 3,
                  reps_min: 8, reps_max: 12, drop_sets: 0, suggested_weight_kg: 0, notes: '',
                })
              }
            }
          })

          if (wcRows.length > 0) {
            const { data: newWcs, error: wcsErr } = await sb.from('week_configs').insert(wcRows).select()
            if (wcsErr) throw wcsErr
            store.week_configs.push(...(newWcs || []))
          }
        }
      } else {
        // Mock mode: sequential fallback
        for (const tp of tPlans) {
          const newPlan = await programsService.createPlan(phase.id, { name: tp.name, dayLabel: tp.day_label })
          const tExercises = store.template_exercises.filter(e => e.template_plan_id === tp.id)
          for (const te of tExercises) {
            const newPe = await programsService.addExerciseToPlan(newPlan.id, {
              exerciseId: te.exercise_id, restSeconds: te.rest_seconds, order: te.order ?? 1,
              supersetGroup: te.superset_group || null,
            })
            const totalWeeks = phase.total_weeks || 8
            await programsService.bulkUpdateWeekConfigs(newPe.id,
              Array.from({ length: totalWeeks }, (_, i) => ({ week: i + 1, sets: 3, reps_min: 8, reps_max: 12, drop_sets: 0, suggested_weight_kg: 0, notes: '' }))
            )
          }
        }
      }
      onApplied()
      onClose()
    } catch (err) {
      console.error('[ApplyBase]', err)
      // Check if plans were actually created despite the error
      const createdPlans = store.training_plans.filter(p => p.phase_id === phase.id)
      if (createdPlans.length > 0) {
        // Partial success — data was saved, just refresh
        onApplied()
        onClose()
      } else {
        alert('Erro ao aplicar treino base: ' + (err.message || err))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold">Aplicar Treino Base</h2>
        <p className="text-xs text-brand-muted">Os treinos e exercícios do modelo selecionado serão copiados para "{phase.name}".</p>

        <div className="max-h-60 overflow-y-auto space-y-1">
          {templates.length === 0 ? (
            <p className="text-brand-muted text-sm text-center py-6">Nenhum treino base disponível. Crie um em Bibliotecas → Treinos Base.</p>
          ) : templates.map(t => {
            const tPlans = store.template_plans.filter(p => p.template_id === t.id)
            const isSelected = selectedTemplate?.id === t.id
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isSelected ? 'bg-brand-green/15 border border-brand-green/40' : 'bg-brand-dark hover:bg-brand-secondary'
                }`}
              >
                <p className="text-white font-medium">{t.name}</p>
                <p className="text-brand-muted text-xs">{t.total_weeks} sem · {tPlans.length} treino{tPlans.length !== 1 ? 's' : ''}</p>
              </button>
            )
          })}
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 bg-brand-secondary text-white rounded-lg py-2 text-sm font-medium">Cancelar</button>
          <button onClick={handleApply} disabled={saving || !selectedTemplate} className="flex-1 bg-brand-green text-brand-dark rounded-lg py-2 text-sm font-semibold disabled:opacity-60">
            {saving ? 'Aplicando...' : 'Aplicar'}
          </button>
        </div>
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
  const [showWeekEditor, setShowWeekEditor] = useState(false)
  const [showApplyBase, setShowApplyBase] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(phase.name)

  const plans = store.training_plans.filter((p) => p.phase_id === phase.id)

  async function handleSaveName() {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === phase.name) {
      setNameValue(phase.name)
      setEditingName(false)
      return
    }
    await programsService.updatePhase(phase.id, { name: trimmed })
    onRefresh()
    setEditingName(false)
  }

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
              {editingName ? (
                <input
                  type="text"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setNameValue(phase.name); setEditingName(false) } }}
                  autoFocus
                  className="font-semibold text-white bg-brand-dark border border-brand-green rounded-lg px-2 py-0.5 text-sm focus:outline-none max-w-[200px]"
                />
              ) : (
                <>
                  <span className="font-semibold text-white">{phase.name}</span>
                  <button onClick={() => setEditingName(true)} className="text-brand-muted hover:text-brand-green transition-colors" title="Renomear">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </>
              )}
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
                      onClick={() => { setMenuOpen(false); setShowWeekEditor(true) }}
                      className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm text-[#ddd] rounded-lg hover:bg-white/[0.08] hover:text-white transition-colors"
                    >
                      <span className="text-xs opacity-70">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      </span> Editar Fases
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); setShowApplyBase(true) }}
                      className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm text-[#ddd] rounded-lg hover:bg-white/[0.08] hover:text-white transition-colors"
                    >
                      <span className="text-xs opacity-70">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
                      </span> Aplicar Treino Base
                    </button>
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
                      <span className="text-xs opacity-70">📋</span> Salvar como treino base
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
      {showWeekEditor && (
        <PhaseWeekEditor
          phase={phase}
          onClose={() => setShowWeekEditor(false)}
          onSave={async (configs) => {
            // Save the custom scheme configs to the phase
            // Find or create a custom scheme entry in PERIODIZATION_SCHEMES
            const customScheme = {
              week_configs: configs,
            }
            // Update phase with the custom week phase labels via Supabase
            if (sb) {
              await sb.from('training_phases').update({
                week_phase_labels: JSON.stringify(configs),
              }).eq('id', phase.id)
            }
            // Update local store
            phase.week_phase_labels = JSON.stringify(configs)
            onRefresh()
          }}
        />
      )}
      {showApplyBase && (
        <ApplyBaseTrainingModal
          phase={phase}
          onClose={() => setShowApplyBase(false)}
          onApplied={onRefresh}
        />
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
      alert('Erro ao aplicar treino base: ' + (err.message || err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
      <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold">Aplicar Treino Base</h2>

        <div>
          <label className="block text-sm text-brand-muted mb-1">Treino Base</label>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {templates.length === 0 ? (
              <p className="text-xs text-brand-muted py-4 text-center">Nenhum treino base disponível.</p>
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

  function refresh() {
    setPhases([...store.training_phases.filter((p) => p.student_id === studentId)])
  }

  async function handleAddPhase({ name, startDate, totalWeeks, schemeId }) {
    await programsService.createPhase(studentId, {
      name,
      startDate,
      totalWeeks,
      status: 'planned',
      schemeId,
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
          className="flex items-center gap-2 bg-brand-green text-brand-dark px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Adicionar Programa
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-brand-card border border-brand-secondary rounded-xl p-8 text-center">
          <p className="text-brand-muted mb-3">Nenhum treino criado para este aluno.</p>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-brand-green text-brand-dark px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Adicionar Primeiro Programa
          </button>
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
      const vol = (log.weight_kg || 0) * (log.reps_done || 0)
      const activations = getExerciseActivations(ex)
      for (const a of activations) {
        const gid = a.group_id
        const proportionalVol = vol * (a.pct / 100)
        if (!groups[gid]) {
          groups[gid] = { groupName: getMuscleGroupName(gid), groupColor: MUSCLE_COLOR_MAP[gid] || '#A4E44B', totalVolume: 0, exercises: {} }
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

function ExpandableChartModal({ isOpen, title, onClose, children }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-10"
      style={{ background: 'rgba(0,0,0,0.85)', cursor: 'pointer' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className="bg-brand-card border border-brand-secondary rounded-2xl p-8 w-full max-w-[1000px] max-h-[90vh] overflow-y-auto relative"
        style={{ cursor: 'default' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-5 text-brand-muted hover:text-white text-xl px-2 py-1 rounded-lg hover:bg-brand-secondary"
        >
          &times;
        </button>
        <div className="text-lg font-semibold mb-5">{title}</div>
        {children}
      </div>
    </div>
  )
}

function StudentProgressContent({ studentId }) {
  const [days, setDays] = useState(30)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [expandedChart, setExpandedChart] = useState(null) // 'line' | 'balance' | 'stacked' | 'freq' | 'prs' | null

  const since = new Date()
  since.setDate(since.getDate() - days)

  // ── Data ──

  // Sessions in current and previous periods
  const currentSessions = store.workout_sessions
    .filter(s => s.student_id === studentId && new Date((s.date || s.session_date) + 'T00:00:00') >= since)
  const prevPeriodEnd = new Date()
  prevPeriodEnd.setDate(prevPeriodEnd.getDate() - days)
  const prevPeriodStart = new Date()
  prevPeriodStart.setDate(prevPeriodStart.getDate() - days * 2)
  const prevSessions = store.workout_sessions
    .filter(s => s.student_id === studentId &&
      new Date((s.date || s.session_date) + 'T00:00:00') >= prevPeriodStart &&
      new Date((s.date || s.session_date) + 'T00:00:00') < prevPeriodEnd)

  // All student sessions (for PRs and noData check)
  const allStudentSessionIds = store.workout_sessions
    .filter(s => s.student_id === studentId).map(s => s.id)
  const studentLogs = store.session_logs.filter(l => allStudentSessionIds.includes(l.session_id))

  // KPIs
  const currentCount = currentSessions.length
  const prevCount = prevSessions.length
  const countChange = currentCount - prevCount

  function getVolumeForSessions(sessions) {
    const ids = sessions.map(s => s.id)
    const logs = store.session_logs.filter(l => ids.includes(l.session_id))
    return logs.reduce((sum, l) => sum + (l.weight_kg || 0) * (l.reps_done || 0), 0)
  }

  const currentVolume = getVolumeForSessions(currentSessions)
  const prevVolume = getVolumeForSessions(prevSessions)
  const volumeChangePct = prevVolume > 0 ? Math.round(((currentVolume - prevVolume) / prevVolume) * 100) : 0
  const volumePerWorkout = currentCount > 0 ? Math.round(currentVolume / currentCount) : 0
  const prevVolumePerWorkout = prevCount > 0 ? Math.round(prevVolume / prevCount) : 0
  const vptChangePct = prevVolumePerWorkout > 0 ? Math.round(((volumePerWorkout - prevVolumePerWorkout) / prevVolumePerWorkout) * 100) : 0

  // Adherence
  const student = store.users.find(u => u.id === studentId)
  const weeklyGoal = student?.weekly_goal
  const weeksInPeriod = Math.max(1, days / 7)
  const adherence = weeklyGoal && weeklyGoal > 0
    ? Math.min(100, Math.round((currentCount / (weeklyGoal * weeksInPeriod)) * 100))
    : null

  function formatVol(v) {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
    return Math.round(v).toString()
  }

  // Personal records
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

  const medals = ['🥇', '🥈', '🥉', '4', '5', '6']

  function getExerciseGroupName(exerciseId) {
    const ex = store.exercises.find(e => e.id === exerciseId)
    if (!ex) return ''
    const activations = getExerciseActivations(ex)
    if (activations.length === 0) return ''
    const primary = activations.sort((a, b) => b.pct - a.pct)[0]
    return getMuscleGroupName(primary.group_id)
  }

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

  // Volume by muscle group (for CSS bars)
  const volumeData = (() => {
    const filteredSessionIds = currentSessions.map(s => s.id)
    const logs = store.session_logs.filter(l => filteredSessionIds.includes(l.session_id))
    const volumeMap = {}
    for (const log of logs) {
      const ex = store.exercises.find(e => e.id === log.exercise_id)
      if (!ex) continue
      const vol = (log.weight_kg || 0) * (log.reps_done || 0)
      const activations = getExerciseActivations(ex)
      for (const a of activations) {
        volumeMap[a.group_id] = (volumeMap[a.group_id] || 0) + vol * (a.pct / 100)
      }
    }
    const entries = Object.entries(volumeMap).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    return {
      labels: entries.map(([gid]) => getMuscleGroupName(parseInt(gid))),
      volumes: entries.map(([, v]) => Math.round(v)),
      colors: entries.map(([gid]) => MUSCLE_COLOR_MAP[parseInt(gid)] || '#A4E44B'),
    }
  })()
  const maxGroupVolume = volumeData.volumes.length > 0 ? Math.max(...volumeData.volumes) : 1

  // Weekly volume by group (stacked bar)
  const weeklyByGroup = (() => {
    const sessions = store.workout_sessions
      .filter(s => s.student_id === studentId && new Date((s.date || s.session_date) + 'T00:00:00') >= since)
      .sort((a, b) => new Date(a.date || a.session_date) - new Date(b.date || b.session_date))
    if (sessions.length === 0) return { labels: [], datasets: [] }
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
    const topGroups = Object.entries(groupTotals).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([gid]) => parseInt(gid))
    const datasets = topGroups.map(gid => ({
      label: getMuscleGroupName(gid),
      data: weekLabels.map(wk => Math.round(weekMap[wk][gid] || 0)),
      backgroundColor: (MUSCLE_COLOR_MAP[gid] || '#A4E44B') + '85',
      borderRadius: 3,
    }))
    return { labels: weekLabels, datasets }
  })()

  // Weekly volume + session counts (for combo chart)
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
    exercises: store.exercises.filter(e => exerciseHasMuscleGroup(e, group.id)),
  })).filter(g => g.exercises.length > 0)

  // ── Chart builders ──

  function buildProgressionChart(ctx, large) {
    const fontSize = large ? 13 : 11
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
          pointRadius: large ? 6 : 5,
          pointHoverRadius: large ? 9 : 7,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.raw + ' kg' } } },
        scales: {
          x: { ticks: { color: CHART_TEXT, font: { size: fontSize } }, grid: { display: false } },
          y: { ticks: { color: CHART_TEXT, font: { size: fontSize }, callback: v => v + 'kg' }, grid: { color: CHART_GRID }, beginAtZero: false },
        },
      },
    })
  }

  function buildStackedVolumeChart(ctx, large) {
    const fontSize = large ? 13 : 11
    return new Chart(ctx, {
      type: 'bar',
      data: { labels: weeklyByGroup.labels, datasets: weeklyByGroup.datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: CHART_TEXT, boxWidth: large ? 12 : 10, font: { size: fontSize }, padding: large ? 10 : 8 } },
        },
        scales: {
          x: { stacked: true, ticks: { color: CHART_TEXT, font: { size: fontSize } }, grid: { display: false } },
          y: { stacked: true, ticks: { color: CHART_TEXT, font: { size: fontSize }, callback: v => `${(v / 1000).toFixed(0)}k` }, grid: { color: CHART_GRID }, beginAtZero: true },
        },
      },
    })
  }

  function buildFrequencyChart(ctx, large) {
    const fontSize = large ? 13 : 11
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weeklyVolumeData.labels,
        datasets: [
          { label: 'Volume (kg)', data: weeklyVolumeData.volumes, backgroundColor: '#A4E44B50', borderColor: '#A4E44B', borderWidth: 1, borderRadius: 4, yAxisID: 'y' },
          { label: 'Sess\ões', data: weeklyVolumeData.sessionCounts, type: 'line', borderColor: '#64c8ff', backgroundColor: '#64c8ff20', pointBackgroundColor: '#64c8ff', pointRadius: large ? 6 : 5, tension: 0.3, yAxisID: 'y1' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: CHART_TEXT, boxWidth: large ? 12 : 10, font: { size: fontSize } } } },
        scales: {
          x: { ticks: { color: CHART_TEXT, font: { size: fontSize } }, grid: { display: false } },
          y: { position: 'left', ticks: { color: CHART_TEXT, font: { size: fontSize }, callback: v => `${(v / 1000).toFixed(0)}k` }, grid: { color: CHART_GRID }, beginAtZero: true },
          y1: { position: 'right', ticks: { color: '#64c8ff', font: { size: fontSize }, stepSize: 1 }, grid: { display: false }, beginAtZero: true, max: 6 },
        },
      },
    })
  }

  const noData = allStudentSessionIds.length === 0

  // Expandable chart card helper
  function ExpandableCard({ chartKey, title, children }) {
    return (
      <div
        className="bg-brand-card border border-brand-secondary rounded-xl p-5 cursor-pointer hover:border-[#A4E44B40] transition-colors relative"
        onClick={() => setExpandedChart(chartKey)}
      >
        <span className="absolute top-3 right-3.5 text-sm text-brand-secondary hover:text-brand-green">{'⛶'}</span>
        <h3 className="text-[15px] font-semibold text-white mb-4">{title}</h3>
        {children}
      </div>
    )
  }

  // Render CSS balance bars (for inline or modal)
  function BalanceBars({ large }) {
    if (volumeData.labels.length === 0) return <p className="text-brand-muted text-sm text-center py-6">Nenhum dado no per\íodo.</p>
    const trackH = large ? 'h-8' : 'h-6'
    const nameSize = large ? 'text-[15px]' : 'text-[13px]'
    const volSize = large ? 'text-[14px]' : 'text-xs'
    return (
      <div className="space-y-2.5">
        {volumeData.labels.map((label, i) => {
          const pct = (volumeData.volumes[i] / maxGroupVolume) * 100
          const showInside = pct > 25
          return (
            <div key={label}>
              <div className="flex justify-between mb-1">
                <span className={`${nameSize} text-gray-300`}>{label}</span>
                <span className={`${volSize} text-brand-muted`}>{formatVol(volumeData.volumes[i])}k kg</span>
              </div>
              <div className={`${trackH} bg-brand-dark rounded-md overflow-hidden`}>
                <div
                  className="h-full rounded-md flex items-center justify-end pr-2"
                  style={{ width: `${pct}%`, backgroundColor: volumeData.colors[i], minWidth: '4px' }}
                >
                  {showInside && (
                    <span className="text-[10px] font-bold text-brand-dark">{formatVol(volumeData.volumes[i])}k</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // PRs list (for inline or modal)
  function PRsList({ large }) {
    if (prs.length === 0) return <p className="text-brand-muted text-sm text-center py-6">Nenhum registro.</p>
    const left = prs.slice(0, 3)
    const right = prs.slice(3, 6)
    const nameSize = large ? 'text-sm' : 'text-sm'
    const kgSize = large ? 'text-lg' : 'text-lg'
    const medalSize = large ? 'text-xl' : 'text-xl'

    function PRItem({ pr, idx }) {
      return (
        <div className="flex items-center gap-3.5 py-3" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <span className={`${medalSize} w-8 text-center`}>{medals[idx]}</span>
          <div className="flex-1 min-w-0">
            <div className={`${nameSize} font-medium truncate`}>{getExerciseName(pr.exerciseId)}</div>
            <div className="text-[11px] text-brand-muted">{getExerciseGroupName(pr.exerciseId)}</div>
          </div>
          <span className={`${kgSize} font-bold text-brand-green`}>{pr.weight}kg</span>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <div>{left.map((pr, i) => <PRItem key={pr.exerciseId} pr={pr} idx={i} />)}</div>
        {right.length > 0 && <div>{right.map((pr, i) => <PRItem key={pr.exerciseId} pr={pr} idx={i + 3} />)}</div>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Period chips */}
      <div className="flex gap-2">
        {[7, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              days === d
                ? 'bg-brand-green text-brand-dark border-brand-green font-semibold'
                : 'border-brand-secondary text-brand-muted'
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
          {/* 4 KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-brand-card border border-brand-secondary rounded-xl p-5">
              <div className="text-[30px] font-bold" style={{ color: '#A4E44B' }}>{currentCount}</div>
              <div className="text-xs text-brand-muted mt-1">Treinos no per\íodo</div>
              <div className={`text-[10px] font-semibold mt-1 ${countChange >= 0 ? 'text-brand-green' : 'text-red-400'}`}>
                {countChange >= 0 ? '↑' : '↓'} {Math.abs(countChange)} vs anterior
              </div>
            </div>
            <div className="bg-brand-card border border-brand-secondary rounded-xl p-5">
              <div className="text-[30px] font-bold" style={{ color: '#64c8ff' }}>{formatVol(currentVolume)}</div>
              <div className="text-xs text-brand-muted mt-1">Volume total (kg)</div>
              <div className={`text-[10px] font-semibold mt-1 ${volumeChangePct >= 0 ? 'text-brand-green' : 'text-red-400'}`}>
                {volumeChangePct >= 0 ? '↑' : '↓'} {Math.abs(volumeChangePct)}%
              </div>
            </div>
            <div className="bg-brand-card border border-brand-secondary rounded-xl p-5">
              <div className="text-[30px] font-bold" style={{ color: '#ffc83c' }}>{formatVol(volumePerWorkout)}</div>
              <div className="text-xs text-brand-muted mt-1">Volume por treino</div>
              <div className={`text-[10px] font-semibold mt-1 ${vptChangePct >= 0 ? 'text-brand-green' : 'text-red-400'}`}>
                {vptChangePct >= 0 ? '↑' : '↓'} {Math.abs(vptChangePct)}%
              </div>
            </div>
            <div className="bg-brand-card border border-brand-secondary rounded-xl p-5">
              <div className="text-[30px] font-bold" style={{ color: '#ff9664' }}>
                {adherence !== null ? `${adherence}%` : '—'}
              </div>
              <div className="text-xs text-brand-muted mt-1">Ader\ência</div>
              <div className="text-[10px] font-semibold mt-1" style={{ color: '#ff9664' }}>
                {weeklyGoal ? `Meta: ${weeklyGoal}\×/sem` : ''}
              </div>
            </div>
          </div>

          {/* Row 1: Progressao de Carga + Equilibrio Muscular */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ExpandableCard chartKey="line" title="Progress\ão de Carga">
              <div className="flex justify-end mb-3">
                <select
                  value={defaultExercise ?? ''}
                  onChange={e => { e.stopPropagation(); setSelectedExercise(parseInt(e.target.value)) }}
                  onClick={e => e.stopPropagation()}
                  className="bg-brand-dark border border-brand-secondary rounded-lg px-3 py-1.5 text-xs text-white"
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
                <p className="text-brand-muted text-sm text-center py-6">Sem dados para este exerc\ício no per\íodo.</p>
              ) : (
                <div style={{ height: '280px' }}>
                  <ChartCanvas id="admin-progression" buildChart={(ctx) => buildProgressionChart(ctx, false)} deps={[defaultExercise, days, progressionData.length]} />
                </div>
              )}
            </ExpandableCard>

            <ExpandableCard chartKey="balance" title="Equil\íbrio Muscular">
              <BalanceBars large={false} />
            </ExpandableCard>
          </div>

          {/* Row 2: Volume Semanal por Grupamento + Frequencia e Volume */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ExpandableCard chartKey="stacked" title="Volume Semanal por Grupamento">
              {weeklyByGroup.labels.length === 0 ? (
                <p className="text-brand-muted text-sm text-center py-6">Nenhum dado no per\íodo.</p>
              ) : (
                <div style={{ height: '280px' }}>
                  <ChartCanvas id="admin-stacked-volume" buildChart={(ctx) => buildStackedVolumeChart(ctx, false)} deps={[days, weeklyByGroup.labels.join(',')]} />
                </div>
              )}
            </ExpandableCard>

            <ExpandableCard chartKey="freq" title="Frequ\ência e Volume Semanal">
              {weeklyVolumeData.labels.length === 0 ? (
                <p className="text-brand-muted text-sm text-center py-6">Nenhum dado no per\íodo.</p>
              ) : (
                <div style={{ height: '280px' }}>
                  <ChartCanvas id="admin-frequency" buildChart={(ctx) => buildFrequencyChart(ctx, false)} deps={[days, weeklyVolumeData.labels.join(',')]} />
                </div>
              )}
            </ExpandableCard>
          </div>

          {/* Row 3: PRs full width */}
          <ExpandableCard chartKey="prs" title={'🏆 Personal Records'}>
            <PRsList large={false} />
          </ExpandableCard>

          {/* Fullscreen modal for expanded charts */}
          <ExpandableChartModal
            isOpen={expandedChart === 'line'}
            title="Progress\ão de Carga"
            onClose={() => setExpandedChart(null)}
          >
            {progressionData.length === 0 ? (
              <p className="text-brand-muted text-sm text-center py-6">Sem dados.</p>
            ) : (
              <div style={{ height: '500px' }}>
                <ChartCanvas id="admin-progression-modal" buildChart={(ctx) => buildProgressionChart(ctx, true)} deps={[defaultExercise, days, progressionData.length, 'modal']} />
              </div>
            )}
          </ExpandableChartModal>

          <ExpandableChartModal
            isOpen={expandedChart === 'balance'}
            title="Equil\íbrio Muscular"
            onClose={() => setExpandedChart(null)}
          >
            <BalanceBars large={true} />
          </ExpandableChartModal>

          <ExpandableChartModal
            isOpen={expandedChart === 'stacked'}
            title="Volume Semanal por Grupamento"
            onClose={() => setExpandedChart(null)}
          >
            {weeklyByGroup.labels.length === 0 ? (
              <p className="text-brand-muted text-sm text-center py-6">Sem dados.</p>
            ) : (
              <div style={{ height: '500px' }}>
                <ChartCanvas id="admin-stacked-modal" buildChart={(ctx) => buildStackedVolumeChart(ctx, true)} deps={[days, weeklyByGroup.labels.join(','), 'modal']} />
              </div>
            )}
          </ExpandableChartModal>

          <ExpandableChartModal
            isOpen={expandedChart === 'freq'}
            title="Frequ\ência e Volume Semanal"
            onClose={() => setExpandedChart(null)}
          >
            {weeklyVolumeData.labels.length === 0 ? (
              <p className="text-brand-muted text-sm text-center py-6">Sem dados.</p>
            ) : (
              <div style={{ height: '500px' }}>
                <ChartCanvas id="admin-freq-modal" buildChart={(ctx) => buildFrequencyChart(ctx, true)} deps={[days, weeklyVolumeData.labels.join(','), 'modal']} />
              </div>
            )}
          </ExpandableChartModal>

          <ExpandableChartModal
            isOpen={expandedChart === 'prs'}
            title={'🏆 Personal Records'}
            onClose={() => setExpandedChart(null)}
          >
            <PRsList large={true} />
          </ExpandableChartModal>
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

  // Weekly goal
  const [weeklyGoal, setWeeklyGoal] = useState(selectedStudent?.weekly_goal || '')
  // Sync goal when student changes
  useEffect(() => {
    setWeeklyGoal(selectedStudent?.weekly_goal || '')
  }, [selectedId])

  async function handleSaveGoal(value) {
    const goal = Number(value) || 0
    setWeeklyGoal(value)
    if (selectedStudent) {
      selectedStudent.weekly_goal = goal
      if (sb) {
        const { error } = await sb.from('profiles').update({ weekly_goal: goal }).eq('id', selectedId)
        if (error) {
          console.error('[Meta] Erro ao salvar weekly_goal:', error.message)
          alert('Erro ao salvar meta: ' + error.message)
        }
      }
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Treinos</h1>
          <p className="text-brand-muted text-sm mt-1">Gerenciamento de fases de treino por aluno</p>
        </div>

        {/* Student selector + weekly goal */}
        {students.length > 0 ? (
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm text-brand-muted mb-1.5">Aluno</label>
              <select
                value={selectedId ?? ''}
                onChange={(e) => { setSelectedId(e.target.value); setTab('treinos') }}
                className="bg-brand-card border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green w-full"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="w-[140px]">
              <label className="block text-sm text-brand-muted mb-1.5">Meta semanal</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="7"
                  value={weeklyGoal}
                  onChange={e => setWeeklyGoal(e.target.value)}
                  onBlur={e => handleSaveGoal(e.target.value)}
                  placeholder="—"
                  className="w-16 bg-brand-card border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-brand-green"
                />
                <span className="text-xs text-brand-muted">×/sem</span>
              </div>
            </div>
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

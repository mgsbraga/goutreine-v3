import { useState } from 'react'
import { store } from '../../../shared/constants/store'
import * as templatesService from '../../../services/templates'
import * as programsService from '../../../services/programs'
import { PERIODIZATION_SCHEMES } from '../../../shared/constants/periodization-schemes'
import { getMuscleGroupColor, getMuscleGroupName } from '../../../shared/utils/muscle-groups'
import { IconPlus } from '../../../shared/components/icons'
import { SchemesContent } from '../schemes/SchemesPage'
import { ExercisesContent } from '../exercises/ExercisesPage'
import AdminLayout from '../AdminLayout'

function AddTemplateModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [totalWeeks, setTotalWeeks] = useState(9)
  const [schemeId, setSchemeId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function handleSchemeChange(val) {
    setSchemeId(val)
    if (val) {
      const scheme = PERIODIZATION_SCHEMES.find((s) => String(s.id) === val)
      if (scheme) setTotalWeeks(scheme.total_weeks)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Nome é obrigatório.')
    setError(null)
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        totalWeeks: Number(totalWeeks),
        schemeId: schemeId ? Number(schemeId) : null,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao criar treino base.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
      <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-md p-6 space-y-5">
        <h2 className="text-lg font-bold">Novo Treino Base</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-brand-muted mb-1">Nome</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Hipertrofia Iniciante" autoFocus className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-green" />
          </div>
          <div>
            <label className="block text-sm text-brand-muted mb-1">Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional..." rows={3} className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-green resize-none" />
          </div>
          <div>
            <label className="block text-sm text-brand-muted mb-1">Periodização</label>
            <select value={schemeId} onChange={(e) => handleSchemeChange(e.target.value)} className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green">
              <option value="">Sem periodização pré-definida</option>
              {PERIODIZATION_SCHEMES.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.total_weeks} sem.)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-brand-muted mb-1">Total de Semanas</label>
            <input type="number" value={totalWeeks} onChange={(e) => setTotalWeeks(e.target.value)} min={1} max={24} className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-brand-secondary text-white rounded-lg py-2 text-sm font-medium">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 bg-brand-green text-brand-dark rounded-lg py-2 text-sm font-semibold disabled:opacity-60">{saving ? 'Criando...' : 'Criar Treino Base'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddPlanModal({ onSave, onClose }) {
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

function AddExerciseModal({ templatePlanId, totalWeeks, onSave, onClose }) {
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedExercise, setSelectedExercise] = useState('')
  const [restSeconds, setRestSeconds] = useState(90)
  const [sets, setSets] = useState(3)
  const [repsMin, setRepsMin] = useState(8)
  const [repsMax, setRepsMax] = useState(12)
  const [suggestedWeight, setSuggestedWeight] = useState('')
  const [saving, setSaving] = useState(false)

  const groups = store.muscle_groups.filter(g => store.exercises.some(e => e.muscle_group_id === g.id))
  const filteredExercises = selectedGroup ? store.exercises.filter(e => e.muscle_group_id === parseInt(selectedGroup)) : []

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedExercise) return
    setSaving(true)
    try {
      await onSave({
        exerciseId: parseInt(selectedExercise),
        restSeconds: Number(restSeconds) || 90,
        sets: Number(sets) || 3,
        repsMin: Number(repsMin) || 8,
        repsMax: Number(repsMax) || 12,
        suggestedWeight: Number(suggestedWeight) || 0,
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
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-brand-muted mb-1">Exercício</label>
            <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)} disabled={!selectedGroup} className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green disabled:opacity-40">
              <option value="">{selectedGroup ? 'Selecione o exercício...' : 'Escolha o grupamento primeiro'}</option>
              {filteredExercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
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

function TemplatePlanEditor({ plan, template, onRefresh }) {
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({ sets: 3, repsMin: 8, repsMax: 12, weight: 0 })

  const exercises = store.template_exercises
    .filter(te => te.template_plan_id === plan.id)
    .sort((a, b) => (a.order ?? a.exercise_order ?? 0) - (b.order ?? b.exercise_order ?? 0))

  async function handleAddExercise({ exerciseId, restSeconds, sets, repsMin, repsMax, suggestedWeight }) {
    const existingCount = exercises.length
    const te = await templatesService.addTemplateExercise(plan.id, {
      exerciseId, restSeconds, order: existingCount + 1,
    })
    const totalWeeks = template.total_weeks || 8
    const configs = Array.from({ length: totalWeeks }, (_, i) => ({
      week: i + 1,
      sets: sets || 3,
      reps_min: repsMin || 8,
      reps_max: repsMax || 12,
      suggested_weight_kg: suggestedWeight || 0,
      drop_sets: 0,
      notes: '',
    }))
    await templatesService.bulkUpdateTemplateWeekConfigs(te.id, configs)
    onRefresh()
  }

  async function handleRemoveExercise(teId) {
    setRemoving(teId)
    try {
      await templatesService.removeTemplateExercise(teId)
      onRefresh()
    } finally {
      setRemoving(null)
    }
  }

  async function handleMoveExercise(te, direction) {
    const sorted = [...exercises]
    const idx = sorted.findIndex(e => e.id === te.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const other = sorted[swapIdx]
    const teOrder = te.order ?? te.exercise_order ?? idx + 1
    const otherOrder = other.order ?? other.exercise_order ?? swapIdx + 1
    // Update in Supabase
    const { sb } = await import('../../../lib/supabase')
    if (sb) {
      await sb.from('template_exercises').update({ exercise_order: otherOrder }).eq('id', te.id)
      await sb.from('template_exercises').update({ exercise_order: teOrder }).eq('id', other.id)
    }
    te.order = otherOrder; te.exercise_order = otherOrder
    other.order = teOrder; other.exercise_order = teOrder
    onRefresh()
  }

  async function handleToggleConjugado(te, prevTe) {
    if (!prevTe) return
    const { sb } = await import('../../../lib/supabase')
    if (te.superset_group && te.superset_group === prevTe.superset_group) {
      if (sb) {
        await sb.from('template_exercises').update({ superset_group: null }).eq('id', te.id)
        await sb.from('template_exercises').update({ superset_group: null }).eq('id', prevTe.id)
      }
      te.superset_group = null
      prevTe.superset_group = null
      onRefresh()
      return
    }
    const group = prevTe.superset_group || String.fromCharCode(
      65 + [...new Set(exercises.filter(e => e.superset_group).map(e => e.superset_group))].length
    )
    if (sb) {
      await sb.from('template_exercises').update({ superset_group: group }).eq('id', te.id)
      if (!prevTe.superset_group) {
        await sb.from('template_exercises').update({ superset_group: group }).eq('id', prevTe.id)
      }
    }
    te.superset_group = group
    prevTe.superset_group = group
    onRefresh()
  }

  function startEdit(te) {
    const wc = store.template_week_configs.find(c => c.template_exercise_id === te.id && c.week === 1)
    setEditValues({
      sets: wc?.sets || 3,
      repsMin: wc?.reps_min || 8,
      repsMax: wc?.reps_max || 12,
      weight: wc?.suggested_weight_kg || 0,
    })
    setEditingId(te.id)
  }

  async function saveEdit(te) {
    const totalWeeks = template.total_weeks || 8
    const configs = Array.from({ length: totalWeeks }, (_, i) => ({
      week: i + 1,
      sets: Number(editValues.sets) || 3,
      reps_min: Number(editValues.repsMin) || 8,
      reps_max: Number(editValues.repsMax) || 12,
      suggested_weight_kg: Number(editValues.weight) || 0,
      drop_sets: 0,
      notes: '',
    }))
    await templatesService.bulkUpdateTemplateWeekConfigs(te.id, configs)
    setEditingId(null)
    onRefresh()
  }

  async function handleDeletePlan() {
    if (!confirm(`Excluir o treino "${plan.name}"?`)) return
    await templatesService.deleteTemplatePlan(plan.id)
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
          {exercises.map((te, idx) => {
            const ex = store.exercises.find(e => e.id === te.exercise_id)
            const groupColor = ex ? getMuscleGroupColor(ex.muscle_group_id) : ''
            const groupName = ex ? getMuscleGroupName(ex.muscle_group_id) : ''
            const wc = store.template_week_configs.find(c => c.template_exercise_id === te.id && c.week === 1)
            const prevTe = idx > 0 ? exercises[idx - 1] : null
            const isConjugated = te.superset_group && prevTe?.superset_group === te.superset_group
            const isEditing = editingId === te.id
            return (
              <div key={te.id} className={`bg-brand-secondary bg-opacity-40 rounded px-3 py-2 ${te.superset_group ? 'border-l-2 border-yellow-400' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-brand-muted w-5 shrink-0">{idx + 1}.</span>
                    <span className="text-sm text-white truncate">{ex?.name || `Exercício #${te.exercise_id}`}</span>
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
                        onClick={() => handleToggleConjugado(te, prevTe)}
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
                      onClick={() => isEditing ? saveEdit(te) : startEdit(te)}
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
                    <button onClick={() => handleMoveExercise(te, 'up')} disabled={idx === 0} className="text-brand-muted hover:text-white text-xs px-1 py-1 disabled:opacity-30 transition-colors" title="Mover para cima">▲</button>
                    {/* Move down */}
                    <button onClick={() => handleMoveExercise(te, 'down')} disabled={idx === exercises.length - 1} className="text-brand-muted hover:text-white text-xs px-1 py-1 disabled:opacity-30 transition-colors" title="Mover para baixo">▼</button>
                    {/* Delete */}
                    <button
                      onClick={() => handleRemoveExercise(te.id)}
                      disabled={removing === te.id}
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
        className="w-full text-xs text-brand-green hover:text-white border border-dashed border-brand-secondary hover:border-brand-green rounded-lg py-2 transition-colors"
      >
        + Exercício
      </button>

      {showAddExercise && (
        <AddExerciseModal
          templatePlanId={plan.id}
          totalWeeks={template.total_weeks}
          onSave={handleAddExercise}
          onClose={() => setShowAddExercise(false)}
        />
      )}
    </div>
  )
}

function ApplyTemplateModal({ template, onClose, onApplied }) {
  const [selectedStudents, setSelectedStudents] = useState([])
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const students = store.users.filter(u => u.role === 'student')
  const filtered = search
    ? students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))
    : students

  function toggleStudent(id) {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleApply() {
    if (selectedStudents.length === 0) return
    setSaving(true)
    try {
      for (const studentId of selectedStudents) {
        await programsService.applyTemplateToStudent(template.id, studentId, {
          name: template.name,
          startDate,
        })
      }
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
        <h2 className="text-lg font-bold">Aplicar Treino Base "{template.name}"</h2>

        <div>
          <label className="block text-sm text-brand-muted mb-1">Data de início</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green" />
        </div>

        <div>
          <label className="block text-sm text-brand-muted mb-1">Selecionar aluno(s)</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar aluno..." className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-green mb-2" />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.map(s => {
              const selected = selectedStudents.includes(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => toggleStudent(s.id)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selected ? 'bg-brand-green bg-opacity-15 border border-brand-green border-opacity-40' : 'bg-brand-dark hover:bg-brand-secondary'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center border text-xs ${
                    selected ? 'bg-brand-green border-brand-green text-brand-dark font-bold' : 'border-brand-secondary'
                  }`}>
                    {selected && '✓'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white truncate">{s.name}</p>
                    <p className="text-brand-muted text-xs truncate">{s.email}</p>
                  </div>
                </button>
              )
            })}
          </div>
          {selectedStudents.length > 0 && (
            <p className="text-xs text-brand-green mt-2">{selectedStudents.length} aluno{selectedStudents.length !== 1 ? 's' : ''} selecionado{selectedStudents.length !== 1 ? 's' : ''}</p>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 bg-brand-secondary text-white rounded-lg py-2 text-sm font-medium">Cancelar</button>
          <button onClick={handleApply} disabled={saving || selectedStudents.length === 0} className="flex-1 bg-brand-green text-brand-dark rounded-lg py-2 text-sm font-semibold disabled:opacity-60">
            {saving ? 'Aplicando...' : `Aplicar${selectedStudents.length > 0 ? ` (${selectedStudents.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function TemplateCard({ template, onDelete, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [showApply, setShowApply] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(template.name)

  const plans = store.template_plans.filter((p) => p.template_id === template.id)

  const scheme = template.scheme_id
    ? PERIODIZATION_SCHEMES.find((s) => s.id === template.scheme_id)
    : null

  async function handleSaveName() {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === template.name) {
      setNameValue(template.name)
      setEditingName(false)
      return
    }
    await templatesService.updateTemplate(template.id, { name: trimmed })
    onRefresh()
    setEditingName(false)
  }

  async function handleDelete() {
    if (!confirm(`Excluir o treino base "${template.name}"?`)) return
    setDeleting(true)
    try {
      await onDelete(template.id)
    } finally {
      setDeleting(false)
    }
  }

  async function handleAddPlan({ name, dayLabel }) {
    await templatesService.createTemplatePlan(template.id, { name, dayLabel })
    onRefresh()
  }

  return (
    <div className="bg-brand-card border border-brand-secondary rounded-xl overflow-visible">
      {/* Template header */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {editingName ? (
                <input
                  type="text"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setNameValue(template.name); setEditingName(false) } }}
                  autoFocus
                  className="font-semibold text-white bg-brand-dark border border-brand-green rounded-lg px-2 py-0.5 text-sm focus:outline-none w-full max-w-xs"
                />
              ) : (
                <>
                  <p className="font-semibold text-white">{template.name}</p>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-brand-muted hover:text-brand-green transition-colors shrink-0"
                    title="Editar nome"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </>
              )}
            </div>
            {template.description && (
              <p className="text-brand-muted text-sm mt-0.5 line-clamp-2">{template.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-brand-muted">
              <span>{template.total_weeks} semana{template.total_weeks !== 1 ? 's' : ''}</span>
              <span>{plans.length} treino{plans.length !== 1 ? 's' : ''}</span>
              {scheme && (
                <span className="inline-block bg-brand-secondary px-2 py-0.5 rounded-full">{scheme.name}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowApply(true)}
              className="text-xs bg-brand-green text-brand-dark px-3 py-1.5 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
            >
              Aplicar
            </button>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-brand-muted hover:text-white transition-colors text-sm px-2 py-1.5"
            >
              {expanded ? '▲' : '▼'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-brand-muted hover:text-red-400 transition-colors text-xs px-2 py-1.5 rounded-lg hover:bg-brand-secondary disabled:opacity-40"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>

      {/* Expanded: editable plans and exercises */}
      {expanded && (
        <div className="border-t border-brand-secondary bg-brand-dark bg-opacity-40 px-5 py-4 space-y-3">
          {plans.map((plan) => (
            <TemplatePlanEditor key={plan.id} plan={plan} template={template} onRefresh={onRefresh} />
          ))}

          <button
            onClick={() => setShowAddPlan(true)}
            className="w-full text-sm text-brand-green hover:text-white border border-dashed border-brand-secondary hover:border-brand-green rounded-lg py-2.5 transition-colors font-medium"
          >
            + Novo Treino
          </button>

          {showAddPlan && (
            <AddPlanModal onSave={handleAddPlan} onClose={() => setShowAddPlan(false)} />
          )}
        </div>
      )}

      {showApply && (
        <ApplyTemplateModal template={template} onClose={() => setShowApply(false)} onApplied={onRefresh} />
      )}
    </div>
  )
}

function TemplatesContent({ onOpenModal }) {
  const [templates, setTemplates] = useState([...store.templates])

  function refresh() {
    setTemplates([...store.templates])
  }

  async function handleDelete(id) {
    await templatesService.deleteTemplate(id)
    refresh()
  }

  if (templates.length === 0) {
    return (
      <div className="bg-brand-card border border-brand-secondary rounded-xl p-8 text-center">
        <p className="text-brand-muted mb-4">Nenhum treino base criado ainda.</p>
        <button
          onClick={onOpenModal}
          className="bg-brand-green text-brand-dark px-5 py-2 rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-colors"
        >
          Criar Primeiro Treino Base
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} onDelete={handleDelete} onRefresh={refresh} />
      ))}
    </div>
  )
}

const TABS = [
  { key: 'treinos', label: 'Treinos Base' },
  { key: 'periodizacoes', label: 'Periodizações' },
  { key: 'exercicios', label: 'Exercícios' },
]

export default function TemplatesPage() {
  const [tab, setTab] = useState('treinos')
  const [modalOpen, setModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  async function handleCreate({ name, description, totalWeeks, schemeId }) {
    await templatesService.createTemplate({ name, description, totalWeeks, schemeId })
    setRefreshKey(k => k + 1)
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Bibliotecas</h1>
            <p className="text-brand-muted text-sm mt-1">Treinos base, periodizações e exercícios</p>
          </div>
          {tab === 'treinos' && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 bg-brand-green text-brand-dark px-4 py-2 rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-colors shrink-0"
            >
              <IconPlus />
              Novo Treino Base
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-brand-card border border-brand-secondary rounded-lg p-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-brand-green text-brand-dark font-semibold'
                  : 'text-brand-muted hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'treinos' && (
          <TemplatesContent key={refreshKey} onOpenModal={() => setModalOpen(true)} />
        )}
        {tab === 'periodizacoes' && (
          <SchemesContent />
        )}
        {tab === 'exercicios' && (
          <ExercisesContent />
        )}
      </div>

      {modalOpen && (
        <AddTemplateModal onSave={handleCreate} onClose={() => setModalOpen(false)} />
      )}
    </AdminLayout>
  )
}

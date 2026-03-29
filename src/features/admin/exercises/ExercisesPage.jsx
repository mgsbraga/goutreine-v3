import { useState, useEffect, useRef } from 'react'
import { store } from '../../../shared/constants/store'
import * as exercisesService from '../../../services/exercises'
import { getMuscleGroupColor, getMuscleGroupName, getExerciseActivations, exerciseHasMuscleGroup } from '../../../shared/utils/muscle-groups'
import { IconPlus, IconEdit, IconDelete, IconSearch } from '../../../shared/components/icons'
import AdminLayout from '../AdminLayout'

function ActivationBadges({ exercise }) {
  const activations = getExerciseActivations(exercise)
  if (activations.length === 0) return null
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {activations.map((a, i) => (
        <span
          key={a.group_id}
          className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getMuscleGroupColor(a.group_id)} ${i > 0 ? 'opacity-60' : ''}`}
        >
          {getMuscleGroupName(a.group_id)}{activations.length > 1 ? ` ${a.pct}%` : ''}
        </span>
      ))}
    </div>
  )
}

function ExerciseModal({ exercise, muscleGroups, onSave, onClose }) {
  const [name, setName] = useState(exercise?.name ?? '')
  const [description, setDescription] = useState(exercise?.description ?? '')
  const [activations, setActivations] = useState(() => {
    const existing = getExerciseActivations(exercise)
    if (existing.length > 0) return existing.map(a => ({ group_id: String(a.group_id), pct: String(a.pct) }))
    return [{ group_id: String(muscleGroups[0]?.id ?? ''), pct: '100' }]
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const nameRef = useRef(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  function addActivation() {
    if (activations.length >= 3) return
    const usedIds = activations.map(a => a.group_id)
    const nextGroup = muscleGroups.find(g => !usedIds.includes(String(g.id)))
    setActivations(prev => [...prev, { group_id: String(nextGroup?.id || muscleGroups[0]?.id || ''), pct: '10' }])
  }

  function removeActivation(idx) {
    if (activations.length <= 1) return
    setActivations(prev => prev.filter((_, i) => i !== idx))
  }

  function updateActivation(idx, field, value) {
    setActivations(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Nome é obrigatório.')
    const totalPct = activations.reduce((sum, a) => sum + (Number(a.pct) || 0), 0)
    if (totalPct !== 100) return setError(`Total de ativação deve ser 100% (atual: ${totalPct}%).`)
    if (activations.some(a => !a.group_id)) return setError('Selecione o grupo muscular.')
    setError(null)
    setSaving(true)
    try {
      const parsedActivations = activations.map(a => ({
        group_id: Number(a.group_id),
        pct: Number(a.pct) || 0,
      }))
      const primaryGroupId = [...parsedActivations].sort((a, b) => b.pct - a.pct)[0].group_id
      await onSave({
        name: name.trim(),
        muscleGroupId: primaryGroupId,
        description: description.trim(),
        activations: parsedActivations,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao salvar exercício.')
    } finally {
      setSaving(false)
    }
  }

  const totalPct = activations.reduce((sum, a) => sum + (Number(a.pct) || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-md p-6 space-y-5">
        <h2 className="text-lg font-bold">
          {exercise ? 'Editar Exercício' : 'Novo Exercício'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-brand-muted mb-1">Nome</label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Supino Reto"
              className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-green"
            />
          </div>

          {/* Muscle activation rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-brand-muted">Ativação Muscular</label>
              <span className={`text-xs font-semibold ${totalPct === 100 ? 'text-brand-green' : 'text-red-400'}`}>
                {totalPct}%
              </span>
            </div>
            <div className="space-y-2">
              {activations.map((a, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={a.group_id}
                    onChange={e => updateActivation(idx, 'group_id', e.target.value)}
                    className="flex-1 bg-brand-dark border border-brand-secondary rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-brand-green"
                  >
                    {muscleGroups.map(g => (
                      <option key={g.id} value={String(g.id)}>{g.name}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="100"
                      value={a.pct}
                      onChange={e => updateActivation(idx, 'pct', e.target.value)}
                      className="w-14 bg-brand-dark border border-brand-secondary rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:border-brand-green"
                    />
                    <span className="text-xs text-brand-muted">%</span>
                  </div>
                  {activations.length > 1 && (
                    <button type="button" onClick={() => removeActivation(idx)} className="text-red-400 hover:text-red-300 text-sm px-1">✕</button>
                  )}
                </div>
              ))}
            </div>
            {activations.length < 3 && (
              <button
                type="button"
                onClick={addActivation}
                className="mt-2 text-xs text-brand-green hover:underline"
              >
                + Adicionar grupo
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm text-brand-muted mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional..."
              rows={2}
              className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-green resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-brand-secondary text-white rounded-lg py-2 text-sm font-medium hover:opacity-80 transition-opacity">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 bg-brand-green text-brand-dark rounded-lg py-2 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ExercisesContent() {
  const [exercises, setExercises] = useState([...store.exercises])
  const [muscleGroups] = useState([...store.muscle_groups])
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const filtered = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase()) ||
      (ex.description || '').toLowerCase().includes(search.toLowerCase())
    const matchesGroup = !filterGroup || exerciseHasMuscleGroup(ex, Number(filterGroup))
    return matchesSearch && matchesGroup
  })

  async function handleSave({ name, muscleGroupId, description, activations }) {
    if (editingExercise) {
      await exercisesService.updateExercise(editingExercise.id, { name, muscleGroupId, description, activations })
    } else {
      await exercisesService.createExercise({ name, muscleGroupId, description, activations })
    }
    setExercises([...store.exercises])
    setEditingExercise(null)
  }

  async function handleDelete(id) {
    if (!confirm('Tem certeza que deseja excluir este exercício?')) return
    setDeletingId(id)
    try {
      await exercisesService.deleteExercise(id)
      setExercises([...store.exercises])
    } finally {
      setDeletingId(null)
    }
  }

  function openAdd() {
    setEditingExercise(null)
    setModalOpen(true)
  }

  function openEdit(ex) {
    setEditingExercise(ex)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingExercise(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-brand-muted text-sm">{exercises.length} exercício{exercises.length !== 1 ? 's' : ''} na biblioteca</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-brand-green text-brand-dark px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Novo Exercício
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none">
            <IconSearch />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar exercício..."
            className="w-full bg-brand-card border border-brand-secondary rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-green"
          />
        </div>
        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          className="bg-brand-card border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green"
        >
          <option value="">Todos os grupos</option>
          {muscleGroups.map((g) => (
            <option key={g.id} value={String(g.id)}>{g.name}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-brand-card border border-brand-secondary rounded-xl p-8 text-center">
          <p className="text-brand-muted">Nenhum exercício encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ex) => (
            <div key={ex.id} className="bg-brand-card border border-brand-secondary rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">{ex.name}</span>
                  <ActivationBadges exercise={ex} />
                </div>
                {ex.description && (
                  <p className="text-brand-muted text-sm mt-0.5 truncate">{ex.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(ex)} className="text-brand-muted hover:text-white transition-colors p-1.5 rounded-lg hover:bg-brand-secondary" aria-label="Editar">
                  <IconEdit />
                </button>
                <button onClick={() => handleDelete(ex.id)} disabled={deletingId === ex.id} className="text-brand-muted hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-brand-secondary disabled:opacity-40" aria-label="Excluir">
                  <IconDelete />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ExerciseModal
          exercise={editingExercise}
          muscleGroups={muscleGroups}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

export default function ExercisesPage() {
  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Exercícios</h1>
        <ExercisesContent />
      </div>
    </AdminLayout>
  )
}

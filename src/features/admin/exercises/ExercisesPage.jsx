import { useState, useEffect, useRef } from 'react'
import { store } from '../../../shared/constants/store'
import * as exercisesService from '../../../services/exercises'
import { IconPlus, IconEdit, IconDelete, IconSearch } from '../../../shared/components/icons'
import AdminLayout from '../AdminLayout'

function MuscleGroupBadge({ muscleGroupId }) {
  const group = store.muscle_groups.find((g) => g.id === muscleGroupId)
  if (!group) return null
  return (
    <span className="inline-block bg-brand-secondary text-brand-muted text-xs px-2 py-0.5 rounded-full">
      {group.name}
    </span>
  )
}

function ExerciseModal({ exercise, muscleGroups, onSave, onClose }) {
  const [name, setName] = useState(exercise?.name ?? '')
  const [muscleGroupId, setMuscleGroupId] = useState(exercise?.muscle_group_id ?? (muscleGroups[0]?.id ?? ''))
  const [description, setDescription] = useState(exercise?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const nameRef = useRef(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Nome é obrigatório.')
    setError(null)
    setSaving(true)
    try {
      await onSave({ name: name.trim(), muscleGroupId: Number(muscleGroupId), description: description.trim() })
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao salvar exercício.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
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

          <div>
            <label className="block text-sm text-brand-muted mb-1">Grupo Muscular</label>
            <select
              value={muscleGroupId}
              onChange={(e) => setMuscleGroupId(e.target.value)}
              className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green"
            >
              {muscleGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-brand-muted mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional..."
              rows={3}
              className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-green resize-none"
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
    const matchesGroup = !filterGroup || String(ex.muscle_group_id) === filterGroup
    return matchesSearch && matchesGroup
  })

  async function handleSave({ name, muscleGroupId, description }) {
    if (editingExercise) {
      await exercisesService.updateExercise(editingExercise.id, { name, muscleGroupId, description })
    } else {
      await exercisesService.createExercise({ name, muscleGroupId, description })
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
                  <MuscleGroupBadge muscleGroupId={ex.muscle_group_id} />
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

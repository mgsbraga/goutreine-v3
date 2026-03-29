import { useState } from 'react'
import { store } from '../../../shared/constants/store'
import * as templatesService from '../../../services/templates'
import { PERIODIZATION_SCHEMES } from '../../../shared/constants/periodization-schemes'
import { IconPlus } from '../../../shared/components/icons'
import AdminLayout from '../AdminLayout'

function AddTemplateModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [totalWeeks, setTotalWeeks] = useState(9)
  const [schemeId, setSchemeId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Sync total_weeks when a scheme is selected
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
      setError(err.message || 'Erro ao criar template.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
      <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-md p-6 space-y-5">
        <h2 className="text-lg font-bold">Novo Template</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-brand-muted mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Hipertrofia Iniciante"
              autoFocus
              className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-green"
            />
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

          <div>
            <label className="block text-sm text-brand-muted mb-1">Esquema de Periodização</label>
            <select
              value={schemeId}
              onChange={(e) => handleSchemeChange(e.target.value)}
              className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green"
            >
              <option value="">Sem esquema pré-definido</option>
              {PERIODIZATION_SCHEMES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.total_weeks} sem.)
                </option>
              ))}
            </select>
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
              {saving ? 'Criando...' : 'Criar Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TemplateCard({ template, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const plans = store.template_plans.filter((p) => p.template_id === template.id)

  const scheme = template.scheme_id
    ? PERIODIZATION_SCHEMES.find((s) => s.id === template.scheme_id)
    : null

  async function handleDelete() {
    if (!confirm(`Excluir o template "${template.name}"?`)) return
    setDeleting(true)
    try {
      await onDelete(template.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-brand-card border border-brand-secondary rounded-xl overflow-hidden">
      {/* Template header */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">{template.name}</p>
            {template.description && (
              <p className="text-brand-muted text-sm mt-0.5 line-clamp-2">{template.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-brand-muted">
              <span>{template.total_weeks} semana{template.total_weeks !== 1 ? 's' : ''}</span>
              <span>{plans.length} treino{plans.length !== 1 ? 's' : ''}</span>
              {scheme && (
                <span className="inline-block bg-brand-secondary px-2 py-0.5 rounded-full">
                  {scheme.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {plans.length > 0 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-brand-muted hover:text-white transition-colors text-sm px-2 py-1.5"
              >
                {expanded ? '▲' : '▼'}
              </button>
            )}
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

      {/* Expanded: plans and exercises */}
      {expanded && plans.length > 0 && (
        <div className="border-t border-brand-secondary bg-brand-dark bg-opacity-40">
          {plans.map((plan) => {
            const planExercises = store.template_exercises.filter(
              (te) => te.template_plan_id === plan.id
            ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

            return (
              <div key={plan.id} className="border-b border-brand-secondary last:border-b-0">
                {/* Plan row */}
                <div className="px-5 py-3 flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{plan.name}</span>
                  {plan.day_label && (
                    <span className="text-xs text-brand-muted">{plan.day_label}</span>
                  )}
                  <span className="ml-auto text-xs text-brand-muted">
                    {planExercises.length} exercício{planExercises.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Exercises within plan */}
                {planExercises.length > 0 && (
                  <div className="px-5 pb-3 space-y-1">
                    {planExercises.map((te, idx) => {
                      const exercise = store.exercises.find((ex) => ex.id === te.exercise_id)
                      const muscleGroup = exercise
                        ? store.muscle_groups.find((g) => g.id === exercise.muscle_group_id)
                        : null
                      return (
                        <div
                          key={te.id}
                          className="flex items-center gap-3 py-1.5 px-3 bg-brand-secondary bg-opacity-30 rounded-lg"
                        >
                          <span className="text-brand-muted text-xs w-5 text-right shrink-0">
                            {idx + 1}.
                          </span>
                          <span className="text-sm text-white flex-1 truncate">
                            {exercise?.name ?? `Exercício #${te.exercise_id}`}
                          </span>
                          {muscleGroup && (
                            <span className="text-xs text-brand-muted bg-brand-secondary px-2 py-0.5 rounded-full shrink-0">
                              {muscleGroup.name}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([...store.templates])
  const [modalOpen, setModalOpen] = useState(false)

  function refresh() {
    setTemplates([...store.templates])
  }

  async function handleCreate({ name, description, totalWeeks, schemeId }) {
    await templatesService.createTemplate({ name, description, totalWeeks, schemeId })
    refresh()
  }

  async function handleDelete(id) {
    await templatesService.deleteTemplate(id)
    refresh()
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Periodização</h1>
            <p className="text-brand-muted text-sm mt-1">
              {templates.length} template{templates.length !== 1 ? 's' : ''} disponíve{templates.length !== 1 ? 'is' : 'l'}
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-brand-green text-brand-dark px-4 py-2 rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-colors shrink-0"
          >
            <IconPlus />
            Novo Template
          </button>
        </div>

        {/* Template list */}
        {templates.length === 0 ? (
          <div className="bg-brand-card border border-brand-secondary rounded-xl p-8 text-center">
            <p className="text-brand-muted mb-4">Nenhum template criado ainda.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-brand-green text-brand-dark px-5 py-2 rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-colors"
            >
              Criar Primeiro Template
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <AddTemplateModal
          onSave={handleCreate}
          onClose={() => setModalOpen(false)}
        />
      )}
    </AdminLayout>
  )
}

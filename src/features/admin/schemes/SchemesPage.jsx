import { useState, useEffect } from 'react'
import { PERIODIZATION_SCHEMES } from '../../../shared/constants/periodization-schemes'
import { store } from '../../../shared/constants/store'
import * as schemesService from '../../../services/schemes'
import AdminLayout from '../AdminLayout'

const PHASE_PRESETS = [
  { name: 'BASE', color: '#3B82F6' },
  { name: 'INTENSIF.', color: '#22C55E' },
  { name: 'CHOQUE', color: '#F97316' },
  { name: 'CHOQUE+', color: '#EF4444' },
  { name: 'RECUPERAÇÃO', color: '#6B7280' },
  { name: 'DELOAD', color: '#A855F7' },
  { name: 'PICO', color: '#FBBF24' },
]

function phaseColor(name) {
  const p = PHASE_PRESETS.find(p => p.name === name)
  return p ? p.color : '#6B7280'
}

function summarizePhases(configs) {
  if (!configs || configs.length === 0) return '—'
  const unique = []
  configs.forEach(c => {
    const name = c.phase || 'BASE'
    if (!unique.includes(name)) unique.push(name)
  })
  return unique.join(' → ')
}

function MiniTimeline({ configs }) {
  if (!configs || !Array.isArray(configs) || configs.length === 0) return null
  return (
    <div className="flex gap-0.5 h-5 mt-2">
      {configs.map((c, i) => {
        const color = c.phase_color || phaseColor(c.phase || 'BASE')
        return (
          <div
            key={i}
            className="flex-1 rounded min-w-[14px] flex items-center justify-center"
            style={{ background: color + '30', color }}
          >
            <span className="text-[7px] font-bold tracking-tight">{(c.phase || '').substring(0, 3)}</span>
          </div>
        )
      })}
    </div>
  )
}

function SchemeBuilder({ scheme, onSave, onClose }) {
  const [name, setName] = useState(scheme?.name || '')
  const [weekCount, setWeekCount] = useState(scheme?.total_weeks || 8)
  const [weeks, setWeeks] = useState(() => {
    if (scheme?.configs && scheme.configs.length > 0) {
      return scheme.configs.map(c => ({
        phase: c.phase || 'BASE',
        color: c.phase_color || phaseColor(c.phase || 'BASE'),
        desc: c.description || '',
        sets: c.sets ?? 3,
        repsMin: c.reps_min ?? 8,
        repsMax: c.reps_max ?? 12,
        dropSets: c.drop_sets ?? 0,
      }))
    }
    return Array.from({ length: 8 }, (_, i) => {
      const preset = PHASE_PRESETS[i % PHASE_PRESETS.length]
      return { phase: preset.name, color: preset.color, desc: '', sets: 3, repsMin: 8, repsMax: 12, dropSets: 0 }
    })
  })
  const [saving, setSaving] = useState(false)

  function handleWeekCountChange(count) {
    const n = Math.max(1, Math.min(24, count))
    setWeekCount(n)
    setWeeks(prev => {
      const next = [...prev]
      while (next.length < n) {
        const preset = PHASE_PRESETS[next.length % PHASE_PRESETS.length]
        next.push({ phase: preset.name, color: preset.color, desc: '', sets: 3, repsMin: 8, repsMax: 12, dropSets: 0 })
      }
      return next.slice(0, n)
    })
  }

  function updateWeekPhase(i, phaseName) {
    setWeeks(prev => {
      const next = [...prev]
      const color = phaseColor(phaseName)
      next[i] = { ...next[i], phase: phaseName, color }
      return next
    })
  }

  function updateWeekDesc(i, desc) {
    setWeeks(prev => {
      const next = [...prev]
      next[i] = { ...next[i], desc }
      return next
    })
  }

  function updateWeekField(i, field, value) {
    setWeeks(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const configs = weeks.map((w, i) => ({
        week: i + 1,
        phase: w.phase,
        phase_color: w.color,
        description: w.desc,
        sets: Number(w.sets) || 3,
        reps_min: Number(w.repsMin) || 8,
        reps_max: Number(w.repsMax) || 12,
        drop_sets: Number(w.dropSets) || 0,
      }))
      await onSave({ name: name.trim(), totalWeeks: weekCount, configs })
      onClose()
    } catch (err) {
      alert('Erro: ' + (err.message || err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-brand-card border border-brand-secondary rounded-xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold">{scheme ? 'Editar Periodização' : 'Nova Periodização'}</h3>
          <button onClick={onClose} className="text-brand-muted hover:text-white text-lg px-2">✕</button>
        </div>

        {/* Name */}
        <label className="block text-[11px] text-brand-muted mb-1">Nome da periodização</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Ondulatória — Avançado"
          autoFocus
          className="w-full bg-brand-dark border border-brand-secondary rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green mb-4"
        />

        {/* Week count */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Semanas</span>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-brand-muted">Qtd:</label>
            <input
              type="number"
              value={weekCount}
              onChange={e => handleWeekCountChange(parseInt(e.target.value) || 8)}
              min={1}
              max={24}
              className="w-14 bg-brand-dark border border-brand-secondary rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-brand-green"
            />
          </div>
        </div>

        {/* Week rows */}
        <div className="space-y-1 mb-4">
          {weeks.map((w, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-white/[0.02] transition-colors">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: w.color + '20', color: w.color }}
              >
                {i + 1}
              </div>
              <select
                value={w.phase}
                onChange={e => updateWeekPhase(i, e.target.value)}
                className="w-[100px] bg-brand-dark border border-brand-secondary rounded-lg px-1.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-brand-green cursor-pointer shrink-0"
              >
                {PHASE_PRESETS.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number" inputMode="numeric" min="1" max="10"
                  value={w.sets}
                  onChange={e => updateWeekField(i, 'sets', e.target.value)}
                  className="w-9 bg-brand-dark border border-brand-secondary rounded px-1 py-1.5 text-[11px] text-white text-center focus:outline-none focus:border-brand-green"
                  title="Séries"
                />
                <span className="text-[10px] text-brand-muted">×</span>
                <input
                  type="number" inputMode="numeric" min="1" max="50"
                  value={w.repsMin}
                  onChange={e => updateWeekField(i, 'repsMin', e.target.value)}
                  className="w-9 bg-brand-dark border border-brand-secondary rounded px-1 py-1.5 text-[11px] text-white text-center focus:outline-none focus:border-brand-green"
                  title="Reps mín"
                />
                <span className="text-[10px] text-brand-muted">–</span>
                <input
                  type="number" inputMode="numeric" min="1" max="50"
                  value={w.repsMax}
                  onChange={e => updateWeekField(i, 'repsMax', e.target.value)}
                  className="w-9 bg-brand-dark border border-brand-secondary rounded px-1 py-1.5 text-[11px] text-white text-center focus:outline-none focus:border-brand-green"
                  title="Reps máx"
                />
              </div>
              <input
                type="text"
                value={w.desc}
                onChange={e => updateWeekDesc(i, e.target.value)}
                placeholder="Descrição..."
                className="flex-1 min-w-0 bg-brand-dark border border-brand-secondary rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-brand-green"
              />
            </div>
          ))}
        </div>

        {/* Preview bar */}
        <label className="block text-[11px] text-brand-muted mb-1">Preview</label>
        <div className="flex gap-0.5 h-7 rounded-lg overflow-hidden mb-5">
          {weeks.map((w, i) => (
            <div
              key={i}
              className="flex-1 flex items-center justify-center"
              style={{ background: w.color + '35', color: w.color }}
            >
              <span className="text-[8px] font-bold">{w.phase.substring(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-brand-secondary">
          <button onClick={onClose} className="flex-1 bg-brand-secondary text-white py-2 rounded-lg text-sm font-medium">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 bg-brand-green text-brand-dark py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar Periodização'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function SchemesContent() {
  const [filter, setFilter] = useState('all')
  const [schemes, setSchemes] = useState([])
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingScheme, setEditingScheme] = useState(null)

  useEffect(() => {
    loadSchemes()
  }, [])

  async function loadSchemes() {
    await schemesService.getCustomSchemes()
    setSchemes(schemesService.getAllSchemes())
  }

  const filtered = filter === 'all'
    ? schemes
    : schemes.filter(s => s.type === filter)

  async function handleCreate({ name, totalWeeks, configs }) {
    await schemesService.createScheme({ name, totalWeeks, configs })
    await loadSchemes()
  }

  async function handleUpdate({ name, totalWeeks, configs }) {
    if (!editingScheme) return
    await schemesService.updateScheme(editingScheme.id, { name, totalWeeks, configs })
    setEditingScheme(null)
    await loadSchemes()
  }

  async function handleDuplicate(schemeId) {
    await schemesService.duplicateScheme(schemeId)
    await loadSchemes()
  }

  async function handleDelete(scheme) {
    if (scheme.type !== 'custom') return
    if (!confirm(`Excluir a periodização "${scheme.name}"?`)) return
    await schemesService.deleteScheme(scheme.id)
    await loadSchemes()
  }

  function openEdit(scheme) {
    if (scheme.type === 'padrao') {
      // Duplicate built-in as custom then edit
      setEditingScheme({
        ...scheme,
        name: scheme.name + ' (cópia)',
        type: 'custom',
        id: null, // Will create new
      })
    } else {
      setEditingScheme(scheme)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-brand-muted text-sm">Periodizações reutilizáveis para aplicar ao criar treinos</p>
        <button
          onClick={() => { setEditingScheme(null); setBuilderOpen(true) }}
          className="flex items-center gap-2 bg-brand-green text-brand-dark px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Nova Periodização
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'padrao', label: 'Padrão' },
          { key: 'custom', label: 'Customizados' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filter === f.key
                ? 'bg-brand-green text-brand-dark border-brand-green font-semibold'
                : 'border-brand-secondary text-brand-muted hover:border-brand-muted hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Scheme list */}
      {filtered.length === 0 ? (
        <div className="bg-brand-card border border-brand-secondary rounded-xl p-10 text-center">
          <svg className="mx-auto mb-3 opacity-40" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
          <p className="text-brand-muted text-sm">Nenhuma periodização encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(scheme => {
            const configs = scheme.configs || []
            return (
              <div
                key={`${scheme.type}-${scheme.id}`}
                className="bg-brand-card border border-brand-secondary rounded-xl px-5 py-4 hover:border-brand-green/30 transition-colors cursor-pointer"
                onClick={() => openEdit(scheme)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{scheme.name}</span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          background: scheme.type === 'padrao' ? '#3B82F620' : '#A4E44B20',
                          color: scheme.type === 'padrao' ? '#3B82F6' : '#A4E44B',
                        }}
                      >
                        {scheme.type === 'padrao' ? 'Padrão' : 'Custom'}
                      </span>
                    </div>
                    <p className="text-[11px] text-brand-muted">
                      {configs.length || scheme.total_weeks} semanas · {summarizePhases(configs)}
                    </p>
                    <MiniTimeline configs={configs} />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleDuplicate(scheme.id)}
                      className="w-8 h-8 rounded-lg border border-brand-secondary text-brand-muted hover:border-brand-green hover:text-brand-green flex items-center justify-center transition-colors"
                      title="Duplicar"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                    {scheme.type === 'custom' && (
                      <button
                        onClick={() => handleDelete(scheme)}
                        className="w-8 h-8 rounded-lg border border-brand-secondary text-red-400 hover:border-red-400 flex items-center justify-center transition-colors"
                        title="Excluir"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Builder modal */}
      {(builderOpen || editingScheme) && (
        <SchemeBuilder
          scheme={editingScheme}
          onSave={editingScheme?.id ? handleUpdate : handleCreate}
          onClose={() => { setBuilderOpen(false); setEditingScheme(null) }}
        />
      )}
    </div>
  )
}

export default function SchemesPage() {
  return (
    <AdminLayout>
      <SchemesContent />
    </AdminLayout>
  )
}

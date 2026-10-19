import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Copy, FileText, FileUp, FolderOpen, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import type { ProjectSummary } from '../lib/storage'
import { ActionMenu } from './ActionMenu'
import { ThemeToggle } from './ThemeToggle'

type Props = {
  projects: ProjectSummary[]
  activeId?: string
  busy: boolean
  onClose: () => void
  onNew: (name: string) => void
  onPdf: () => void
  onImport: () => void
  onOpen: (id: string) => void
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}
type DialogAction = { type: 'create' } | { type: 'rename' | 'delete'; project: ProjectSummary }

function ProjectDialog({ action, onClose, onSubmit }: { action: DialogAction; onClose: () => void; onSubmit: (name: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState(action.type === 'rename' ? action.project.name : '')
  useEffect(() => {
    ref.current?.showModal()
    ref.current?.querySelector<HTMLElement>('[data-initial-focus]')?.focus()
  }, [])
  const deleting = action.type === 'delete'
  const title = deleting ? 'Delete this project?' : action.type === 'create' ? 'Start a blank document' : 'Rename project'
  return <dialog className="project-dialog" ref={ref} aria-labelledby="project-dialog-title" onCancel={onClose} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(name.trim()); onClose() }}>
      <div className="dialog-heading"><h2 id="project-dialog-title">{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>
      <p>{deleting ? `“${action.project.name}” will be removed from this browser. This cannot be undone. Export a backup first if you need it.`
        : action.type === 'create' ? 'Begin with one empty page. Add text, images, and notes as you go.' : 'Give this project a name that is easy to find.'}</p>
      {!deleting && <label className="name-field">Project name<input data-initial-focus autoFocus required maxLength={180} value={name} placeholder="e.g. Lecture notes"
        onChange={(event) => setName(event.target.value)} onFocus={(event) => event.target.select()} /></label>}
      <div className="dialog-actions"><button type="button" className="secondary-button" data-initial-focus={deleting ? true : undefined} autoFocus={deleting} onClick={onClose}>Cancel</button>
        <button type="submit" className={deleting ? 'delete-button' : 'primary-button'} disabled={!deleting && !name.trim()}>{deleting ? 'Delete project' : action.type === 'create' ? 'Create document' : 'Save name'}</button></div>
    </form>
  </dialog>
}

export function ProjectLibrary(props: Props) {
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<DialogAction | null>(null)
  const projects = props.projects.filter((project) => project.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  return <main className="project-library">
    <div className="library-topbar"><a className="library-brand" href="#" onClick={(event) => { event.preventDefault(); setQuery('') }}><img className="app-logo" src={`${import.meta.env.BASE_URL}typstability-logo.png`} alt="" />Typstability</a><div className="library-utilities"><span className="local-badge"><span />Private by design. Saved here.</span><ThemeToggle /></div></div>
    <section className="library-content" aria-label="Project library">
      <div className="library-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Your projects</h1><p className="library-intro">Open a PDF, start a blank document, or pick up where you left off.</p></div>
        {props.activeId && <button className="secondary-button" onClick={props.onClose} disabled={props.busy}>Continue editing <ArrowRight size={16} /></button>}
      </div>
      <div className="start-options" aria-label="Start a document">
        <button className="start-card featured" onClick={props.onPdf} disabled={props.busy}><span className="start-icon"><FileText size={24} /></span><strong>Start from a PDF</strong><span>Open a PDF to annotate and edit.</span><ArrowRight className="start-arrow" size={18} /></button>
        <button className="start-card" onClick={() => setDialog({ type: 'create' })} disabled={props.busy}><span className="start-icon"><Plus size={24} /></span><strong>Start a blank document</strong><span>A fresh page for text, images, and drawings.</span><ArrowRight className="start-arrow" size={18} /></button>
        <button className="start-card" onClick={props.onImport} disabled={props.busy}><span className="start-icon"><FileUp size={24} /></span><strong>Import a saved project</strong><span>Continue editing a .typstability file.</span><ArrowRight className="start-arrow" size={18} /></button>
      </div>
      <div className="saved-heading"><div><h2>Saved projects <span>{props.projects.length}</span></h2><p>Stored automatically in this browser.</p></div>
        {props.projects.length > 0 && <label className="project-search"><Search size={16} /><input aria-label="Search projects" placeholder="Find a project…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>}
      </div>
      <div className="project-list">
        {!projects.length && <div className="empty-projects"><FolderOpen size={28} /><strong>{query ? 'No matching projects' : 'Your next project starts above'}</strong><p>{query ? 'Try another name.' : 'Open a PDF, start a blank document, or import a backup. Your work will appear here.'}</p></div>}
        {projects.map((project) => <article className={`project-card ${project.id === props.activeId ? 'is-current' : ''}`} key={project.id}>
          <button className="project-open" onClick={() => props.onOpen(project.id)} disabled={props.busy}>
            <span className="project-file-icon"><FileText size={21} /></span><span><strong>{project.name}</strong><small>{project.pageCount} {project.pageCount === 1 ? 'page' : 'pages'}<span>·</span>Edited {new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</small></span>
          </button>
          {project.id === props.activeId && <span className="current-badge">Open now</span>}
          <ActionMenu label={`Actions for ${project.name}`} compact icon={<MoreHorizontal size={19} />} disabled={props.busy} items={[
            { label: 'Rename', icon: <Pencil size={16} />, onSelect: () => setDialog({ type: 'rename', project }) },
            { label: 'Make a copy', icon: <Copy size={16} />, onSelect: () => props.onDuplicate(project.id) },
            { label: 'Delete project', icon: <Trash2 size={16} />, danger: true, onSelect: () => setDialog({ type: 'delete', project }) },
          ]} />
        </article>)}
      </div>
      <p className="library-note">Taking your work elsewhere? Use <strong>Export → Editable project</strong> in the editor to make a backup or move between browsers.</p>
    </section>
    {dialog && <ProjectDialog action={dialog} onClose={() => setDialog(null)} onSubmit={(name) => {
      if (dialog.type === 'create') props.onNew(name)
      else if (dialog.type === 'rename') props.onRename(dialog.project.id, name)
      else props.onDelete(dialog.project.id)
    }} />}
  </main>
}

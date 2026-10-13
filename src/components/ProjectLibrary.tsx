import { Copy, FilePlus2, FileUp, FolderOpen, Pencil, Trash2, X } from 'lucide-react'
import type { ProjectSummary } from '../lib/storage'

type Props = {
  projects: ProjectSummary[]
  activeId?: string
  busy: boolean
  onClose: () => void
  onNew: () => void
  onPdf: () => void
  onImport: () => void
  onOpen: (id: string) => void
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}
export function ProjectLibrary(props: Props) {
  return <main className="project-library">
    <section className="library-content" aria-label="Project library">
      <div className="library-heading">
        <div><span className="welcome-mark">T</span><p className="eyebrow">TYPSTABILITY</p><h1>Your projects</h1><p className="welcome-copy">Pick up where you left off, or start with a fresh page.</p></div>
        {props.activeId && <button className="secondary-large" onClick={props.onClose} disabled={props.busy}><X size={16} /> Back to editor</button>}
      </div>
      <div className="welcome-actions">
        <button className="primary-large" onClick={props.onNew} disabled={props.busy}><FilePlus2 size={17} /> New project</button>
        <button className="secondary-large" onClick={props.onPdf} disabled={props.busy}><FileUp size={17} /> Open PDF</button>
        <button className="secondary-large" onClick={props.onImport} disabled={props.busy}><FolderOpen size={17} /> Import project</button>
      </div>
      <p className="library-note">Saved in this browser. Export a project to back it up or move it to another browser.</p>
      <div className="project-list">
        {!props.projects.length && <div className="empty-projects">Your saved projects will appear here.</div>}
        {props.projects.map((project) => <article className="project-card" key={project.id}>
          <button className="project-open" onClick={() => props.onOpen(project.id)} disabled={props.busy}>
            <FolderOpen size={23} /><span><strong>{project.name}</strong><small>{project.pageCount} {project.pageCount === 1 ? 'page' : 'pages'} · {new Date(project.updatedAt).toLocaleString()}{project.id === props.activeId ? ' · Open' : ''}</small></span>
          </button>
          <div className="project-actions">
            <button className="icon-button" title={`Rename ${project.name}`} aria-label={`Rename ${project.name}`} disabled={props.busy} onClick={() => { const name = window.prompt('Project name', project.name); if (name?.trim()) props.onRename(project.id, name) }}><Pencil size={16} /></button>
            <button className="icon-button" title={`Duplicate ${project.name}`} aria-label={`Duplicate ${project.name}`} disabled={props.busy} onClick={() => props.onDuplicate(project.id)}><Copy size={16} /></button>
            <button className="icon-button" title={`Delete ${project.name}`} aria-label={`Delete ${project.name}`} disabled={props.busy} onClick={() => { if (window.confirm(`Delete “${project.name}” from this browser? This cannot be undone.`)) props.onDelete(project.id) }}><Trash2 size={16} /></button>
          </div>
        </article>)}
      </div>
    </section>
  </main>
}

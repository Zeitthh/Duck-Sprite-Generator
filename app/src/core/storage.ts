import { enforceEnabledSizes, newProject, parseProject } from './project';
import type { Project } from './types';

const KEY = 'duck-editor:project:v2';

export function loadProject(): Project {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return enforceEnabledSizes(parseProject(JSON.parse(raw)));
  } catch {
    /* datos corruptos o storage bloqueado: empezar de cero */
  }
  return newProject();
}

export function saveProject(p: Project) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* cuota o storage bloqueado: ignorar */
  }
}

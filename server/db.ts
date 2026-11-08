import fs from 'fs';
import path from 'path';
import type { RecapProject } from '../src/types/project.ts';

const DB_FILE = path.resolve(process.cwd(), 'data/projects.json');

export class ProjectDatabase {
  private projects: Map<string, RecapProject> = new Map();

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const data: RecapProject[] = JSON.parse(raw);
        for (const p of data) {
          this.projects.set(p.id, p);
        }
      }
    } catch (e) {
      console.error('Error loading projects DB:', e);
    }
  }

  private save() {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.projects.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving projects DB:', e);
    }
  }

  getAll(): RecapProject[] {
    return Array.from(this.projects.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  get(id: string): RecapProject | undefined {
    return this.projects.get(id);
  }

  set(project: RecapProject): RecapProject {
    project.updatedAt = new Date().toISOString();
    this.projects.set(project.id, project);
    this.save();
    return project;
  }

  update(id: string, patch: Partial<RecapProject>): RecapProject | undefined {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    const updated = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(id, updated);
    this.save();
    return updated;
  }

  delete(id: string): boolean {
    const deleted = this.projects.delete(id);
    if (deleted) {
      this.save();
    }
    return deleted;
  }
}

export const db = new ProjectDatabase();

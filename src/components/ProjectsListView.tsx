import React, { useState } from 'react';
import {
  Film,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlusCircle,
  Download,
  Trash2,
  Play,
  ExternalLink
} from 'lucide-react';
import { RecapProject, ProjectStatus } from '../types/project.ts';

interface ProjectsListViewProps {
  projects: RecapProject[];
  onSelectProject: (projectId: string) => void;
  onNavigateCreate: () => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectsListView: React.FC<ProjectsListViewProps> = ({
  projects,
  onSelectProject,
  onNavigateCreate,
  onDeleteProject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.originalFilename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('ဤပရောဂျက်ကို ဖျက်ပစ်ရန် သေချာပါသလား?')) {
      onDeleteProject(id);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">ကျွန်ုပ်၏ ပရောဂျက်များ</h1>
          <p className="text-xs text-slate-400">
            ဖန်တီးထားသော တရုတ်ရုပ်ရှင် Recap ဗီဒီယိုများနှင့် မှတ်တမ်းများ (စုစုပေါင်း {projects.length} ခု)
          </p>
        </div>

        <button
          onClick={onNavigateCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Recap အသစ်ဖန်တီးမည်
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              statusFilter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            အားလုံး ({projects.length})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            ပြီးစီးပြီး ({projects.filter((p) => p.status === 'completed').length})
          </button>
          <button
            onClick={() => setStatusFilter('processing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              statusFilter === 'processing'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            လုပ်ဆောင်ဆဲ ({projects.filter((p) => p.status === 'processing').length})
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              statusFilter === 'failed'
                ? 'bg-red-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            အမှားရှိသည် ({projects.filter((p) => p.status === 'failed').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ပရောဂျက် ရှာဖွေရန်..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
          />
        </div>
      </div>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20">
          <Film className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
          <h3 className="text-sm font-semibold text-slate-300">ကိုက်ညီသော ပရောဂျက် မတွေ့ပါ</h3>
          <p className="text-xs text-slate-500 mt-1">ရှာဖွေမှု စကားလုံးကို ပြောင်းလဲစစ်ဆေးပါ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectProject(p.id)}
              className="group rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/40 p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-sm text-slate-200 group-hover:text-purple-300 transition-colors line-clamp-1">
                    {p.title}
                  </h3>
                  <button
                    onClick={(e) => handleDelete(p.id, e)}
                    title="ဖျက်မည်"
                    className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-400 line-clamp-1 mb-3">
                  {p.originalFilename}
                </p>

                {/* Progress bar if processing */}
                {p.status === 'processing' && (
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-[11px] text-purple-400">
                      <span className="line-clamp-1">{p.currentStepName}</span>
                      <span>{p.progressPercent}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                        style={{ width: `${p.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{p.durationSeconds ? `${Math.round(p.durationSeconds)}s` : 'မသိရ'}</span>
                  <span>•</span>
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-2">
                  {p.finalVideoUrl && (
                    <a
                      href={p.finalVideoUrl}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 text-emerald-400 hover:text-emerald-300"
                      title="ဗီဒီယို ဒေါင်းလုဒ်"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <span
                    className={`px-2 py-0.5 rounded-full font-medium ${
                      p.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        : p.status === 'processing'
                        ? 'bg-blue-950 text-blue-400 border border-blue-800/60 animate-pulse'
                        : p.status === 'failed'
                        ? 'bg-red-950 text-red-400 border border-red-800/60'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {p.status === 'completed'
                      ? 'ပြီးစီး'
                      : p.status === 'processing'
                      ? 'လုပ်ဆောင်ဆဲ'
                      : p.status === 'failed'
                      ? 'အမှား'
                      : 'စတင်ရန်'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

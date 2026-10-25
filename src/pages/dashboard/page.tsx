import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  Activity,
  ArrowRight,
  ArrowUpDown,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Crosshair,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  FlaskConical,
  FolderGit2,
  FolderKanban,
  Grid3x3,
  HelpCircle,
  History,
  Info,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  List,
  Lock,
  LogOut,
  Mail,
  MoreVertical,
  MousePointer,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Save,
  ScanLine,
  ScanSearch,
  Search,
  Settings as SettingsIcon,
  Shield,
  Sliders,
  Sparkles,
  Tag,
  Timer,
  Trash2,
  User,
  UserCheck,
  UserCog,
  UserRound,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import ThemeToggle from "@/components/theme-toggle.tsx";

// ==========================================
// TYPES & DATA STRUCTURES
// ==========================================

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  templateId: "open_field" | "barnes_maze" | "elevated_plus" | "y_maze" | "nor" | "custom";
  templateName: string;
  templateShort: string;
  templateColor: string;
  investigator: string;
  institution: string;
  strain: string;
  trialCount: number;
  subjectCount: number;
  totalDuration: string;
  lastModified: string;
  createdAt: string;
  status: "active" | "completed" | "in_analysis" | "archived";
  confidence: number;
  tags: string[];
  metricsSummary: { label: string; value: string; unit?: string }[];
}

export interface UserProfile {
  name: string;
  email: string;
  institution: string;
  department: string;
  role: string;
  avatarUrl?: string;
  researchFocus: string;
}

export interface UserSettings {
  autoArenaDetect: boolean;
  fpsDownsampling: string;
  distanceUnit: "cm" | "m" | "px";
  immobilityThreshold: number;
  autoSaveInterval: number;
  themePreference: "system" | "light" | "dark";
  exportFormat: "json" | "csv" | "excel";
}

// Initial Mock Data
const INITIAL_PROJECTS: ProjectItem[] = [
  {
    id: "proj-1",
    name: "CORT-Stress Anxiolytic Battery",
    description: "Assessment of novel anxiolytic compound AC-984 in acute stress rodent paradigm.",
    templateId: "elevated_plus",
    templateName: "Elevated Plus Maze",
    templateShort: "EPM",
    templateColor: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
    investigator: "Dr. Alex Morgan",
    institution: "Cambridge Neurobiology Lab",
    strain: "C57BL/6J Mice (n=18)",
    trialCount: 24,
    subjectCount: 18,
    totalDuration: "02h 45m",
    lastModified: "15 mins ago",
    createdAt: "2026-10-18",
    status: "active",
    confidence: 99.4,
    tags: ["Anxiety", "Pharmacology", "Plus-Maze"],
    metricsSummary: [
      { label: "Open Arm Dwell", value: "18.4", unit: "%" },
      { label: "Latency to Closed", value: "4.2", unit: "s" },
      { label: "Mean Velocity", value: "11.2", unit: "cm/s" },
    ],
  },
  {
    id: "proj-2",
    name: "Spatial Memory Deficit - APP/PS1 Cohort",
    description: "Hippocampal-dependent spatial learning and memory retention in Alzheimer's disease model.",
    templateId: "barnes_maze",
    templateName: "Barnes Maze",
    templateShort: "BM",
    templateColor: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
    investigator: "Elena Vance, MSc",
    institution: "Dept. of Cognitive Neuroscience",
    strain: "APP/PS1 Transgenic (n=14)",
    trialCount: 42,
    subjectCount: 14,
    totalDuration: "04h 12m",
    lastModified: "2 hours ago",
    createdAt: "2026-10-12",
    status: "in_analysis",
    confidence: 98.7,
    tags: ["Alzheimers", "Spatial Learning", "Memory"],
    metricsSummary: [
      { label: "Escape Latency", value: "22.8", unit: "s" },
      { label: "Quadrant Bias", value: "54.2", unit: "%" },
      { label: "Primary Errors", value: "2.8", unit: "avg" },
    ],
  },
  {
    id: "proj-3",
    name: "Dopamine Transporter Knockout Locomotion",
    description: "Open field exploratory hyperactivity and thigmotaxis analysis in DAT-KO vs Wild Type.",
    templateId: "open_field",
    templateName: "Open Field Test",
    templateShort: "OFT",
    templateColor: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30 dark:text-cyan-400",
    investigator: "Dr. Alex Morgan",
    institution: "Cambridge Neurobiology Lab",
    strain: "DAT-KO & WT Littermates (n=20)",
    trialCount: 36,
    subjectCount: 20,
    totalDuration: "03h 30m",
    lastModified: "Yesterday",
    createdAt: "2026-10-05",
    status: "completed",
    confidence: 99.8,
    tags: ["Locomotion", "Dopamine", "Exploration"],
    metricsSummary: [
      { label: "Total Distance", value: "2,410", unit: "cm" },
      { label: "Center Dwell", value: "14.2", unit: "s" },
      { label: "Thigmotaxis Index", value: "81.6", unit: "%" },
    ],
  },
  {
    id: "proj-4",
    name: "Prefrontal Lesion Novel Object Recognition",
    description: "Evaluating recognition memory and perceptual novelty discrimination across temporal delays.",
    templateId: "nor",
    templateName: "Novel Object Recognition",
    templateShort: "NOR",
    templateColor: "bg-purple-500/15 text-purple-600 border-purple-500/30 dark:text-purple-400",
    investigator: "Marcus Chen, PhD",
    institution: "Institute of Behavioral Science",
    strain: "Long-Evans Rats (n=12)",
    trialCount: 24,
    subjectCount: 12,
    totalDuration: "02h 10m",
    lastModified: "3 days ago",
    createdAt: "2026-09-28",
    status: "completed",
    confidence: 97.9,
    tags: ["Recognition", "PFC", "Novelty"],
    metricsSummary: [
      { label: "Discrim. Index", value: "+0.38", unit: "" },
      { label: "Novel Dwell", value: "48.2", unit: "s" },
      { label: "Familiar Dwell", value: "21.6", unit: "s" },
    ],
  },
  {
    id: "proj-5",
    name: "Working Memory Spontaneous Alternation",
    description: "Short-term spatial working memory in symmetrical Y-maze without explicit reward.",
    templateId: "y_maze",
    templateName: "Y-Maze Alternation",
    templateShort: "YM",
    templateColor: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30 dark:text-indigo-400",
    investigator: "Elena Vance, MSc",
    institution: "Dept. of Cognitive Neuroscience",
    strain: "C57BL/6J WT (n=16)",
    trialCount: 20,
    subjectCount: 16,
    totalDuration: "01h 40m",
    lastModified: "5 days ago",
    createdAt: "2026-09-20",
    status: "archived",
    confidence: 99.1,
    tags: ["Working Memory", "Y-Maze", "Baseline"],
    metricsSummary: [
      { label: "Alternation Rate", value: "68.4", unit: "%" },
      { label: "Total Arm Entries", value: "32", unit: "" },
      { label: "Immobility Time", value: "12.4", unit: "s" },
    ],
  },
];

const TEMPLATE_OPTIONS = [
  {
    id: "open_field",
    name: "Open Field Test",
    short: "OFT",
    desc: "Measures exploratory activity, locomotion, and anxiety-like thigmotaxis.",
    badgeClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
  },
  {
    id: "elevated_plus",
    name: "Elevated Plus Maze",
    short: "EPM",
    desc: "Validates anxiolytic vs anxiogenic responses via open vs closed arm exploration.",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  {
    id: "barnes_maze",
    name: "Barnes Maze",
    short: "BM",
    desc: "Evaluates spatial learning, escape latency, and search strategy heuristics.",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  {
    id: "y_maze",
    name: "Y-Maze Alternation",
    short: "YM",
    desc: "Quantifies continuous spontaneous alternation and spatial working memory.",
    badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
  },
  {
    id: "nor",
    name: "Novel Object Recognition",
    short: "NOR",
    desc: "Measures cortical memory retention and novel object preference index.",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  },
  {
    id: "custom",
    name: "Custom Arena Layout",
    short: "CA",
    desc: "Design custom ROIs, concentric boundaries, corridors, and multi-zone mazes.",
    badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30",
  },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function UserDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuthActions();

  // ----------------------------------------
  // Persistent State
  // ----------------------------------------
  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    const saved = localStorage.getItem("amaze:projects");
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("amaze:user_profile");
    return saved
      ? JSON.parse(saved)
      : {
          name: "Dr. Alex Morgan",
          email: "a.morgan@cam.ac.uk",
          institution: "University of Cambridge",
          department: "Department of Physiology, Development & Neuroscience",
          role: "Senior Behavioral Neurobiologist",
          researchFocus: "Neural circuitry of anxiety and spatial memory encoding in rodent models",
        };
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem("amaze:settings");
    return saved
      ? JSON.parse(saved)
      : {
          autoArenaDetect: true,
          fpsDownsampling: "30",
          distanceUnit: "cm",
          immobilityThreshold: 1.5,
          autoSaveInterval: 30,
          themePreference: "system",
          exportFormat: "json",
        };
  });

  useEffect(() => {
    localStorage.setItem("amaze:projects", JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem("amaze:user_profile", JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem("amaze:settings", JSON.stringify(settings));
  }, [settings]);

  // ----------------------------------------
  // Filters, Search & View Controls
  // ----------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"modified" | "name" | "trials">("modified");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // ----------------------------------------
  // Dialog Open States
  // ----------------------------------------
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Form State: Create Project (Project Title, Principal Investigator, Animal Strain, Number Animals, Behavioural Tests)
  const [newProject, setNewProject] = useState({
    name: "",
    investigator: userProfile.name,
    strain: "C57BL/6J Mice",
    subjectCount: 12,
    templateId: "open_field" as ProjectItem["templateId"],
  });

  // Form State: Profile Edit
  const [profileForm, setProfileForm] = useState<UserProfile>(userProfile);
  useEffect(() => {
    setProfileForm(userProfile);
  }, [userProfile]);

  // Form State: Settings Edit
  const [settingsForm, setSettingsForm] = useState<UserSettings>(settings);
  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  // Helper for Initials
  const initials = useMemo(() => {
    const parts = userProfile.name.trim().split(/\s+/).filter(Boolean);
    return parts.length
      ? `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`.toUpperCase()
      : "AM";
  }, [userProfile.name]);

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.investigator.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesTemplate =
          selectedTemplateFilter === "all" || p.templateId === selectedTemplateFilter;

        return matchesSearch && matchesTemplate;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "trials") return b.trialCount - a.trialCount;
        return 0; // default chronological/recent order
      });
  }, [projects, searchQuery, selectedTemplateFilter, sortBy]);

  // Summary Metrics
  const totalTrials = useMemo(
    () => projects.reduce((acc, curr) => acc + curr.trialCount, 0),
    [projects]
  );
  const totalSubjects = useMemo(
    () => projects.reduce((acc, curr) => acc + curr.subjectCount, 0),
    [projects]
  );

  // ----------------------------------------
  // ACTIONS
  // ----------------------------------------

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) {
      toast.error("Please enter a project title.");
      return;
    }

    const tpl = TEMPLATE_OPTIONS.find((t) => t.id === newProject.templateId) || TEMPLATE_OPTIONS[0];

    const created: ProjectItem = {
      id: `proj-${Date.now()}`,
      name: newProject.name.trim(),
      description: `${tpl.name} study with ${newProject.strain.trim()} (n=${newProject.subjectCount}).`,
      templateId: newProject.templateId,
      templateName: tpl.name,
      templateShort: tpl.short,
      templateColor: tpl.badgeClass,
      investigator: newProject.investigator.trim() || userProfile.name,
      institution: userProfile.institution,
      strain: `${newProject.strain.trim()} (n=${newProject.subjectCount})`,
      trialCount: 0,
      subjectCount: Number(newProject.subjectCount) || 12,
      totalDuration: "00m 00s",
      lastModified: "Just now",
      createdAt: new Date().toISOString().split("T")[0],
      status: "active",
      confidence: 99.5,
      tags: [tpl.short, newProject.strain.trim()],
      metricsSummary: [
        { label: "Status", value: "Ready" },
        { label: "Animals", value: `${newProject.subjectCount}` },
        { label: "Arena", value: "Auto-detect" },
      ],
    };

    setProjects([created, ...projects]);
    setIsCreateOpen(false);
    setNewProject({
      name: "",
      investigator: userProfile.name,
      strain: "C57BL/6J Mice",
      subjectCount: 12,
      templateId: "open_field",
    });

    toast.success(`Project "${created.name}" created!`, {
      description: `Configured for ${created.templateName}. Entering experimental setup...`,
    });
    navigate(`/setup?projectId=${created.id}&template=${created.templateId}`);
  };

  const handleDeleteProject = (id: string, name: string) => {
    setProjects(projects.filter((p) => p.id !== id));
    toast.info(`Project "${name}" removed from dashboard.`);
  };

  const handleDuplicateProject = (project: ProjectItem) => {
    const copy: ProjectItem = {
      ...project,
      id: `proj-${Date.now()}`,
      name: `${project.name} (Copy)`,
      lastModified: "Just now",
      trialCount: 0,
      status: "active",
    };
    setProjects([copy, ...projects]);
    toast.success(`Project duplicated as "${copy.name}".`);
  };

  const handleExportProject = (project: ProjectItem) => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${project.name.replace(/\s+/g, "_")}_export.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported data for ${project.name}.`);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile(profileForm);
    setIsProfileOpen(false);
    toast.success("Profile details updated successfully.");
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(settingsForm);
    setIsSettingsOpen(false);
    toast.success("Preferences and tracking defaults updated.");
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-[#f7faf9] text-[#142d31] selection:bg-[#08796f]/20 dark:bg-[#071318] dark:text-[#e4f0ef]">
      {/* ==================================================== */}
      {/* 1. TOP NAV BAR WITH USER AVATAR, PROFILE & SETTINGS  */}
      {/* ==================================================== */}
      <header className="sticky top-0 z-40 border-b border-[#c8d9d7]/70 bg-white/80 backdrop-blur-md dark:border-white/[0.08] dark:bg-[#071318]/80">
        <div className="mx-auto flex h-15 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand & Navigation */}
          <div className="flex items-center gap-6 md:gap-8">
            <Link
              to="/"
              className="group flex cursor-pointer items-center gap-2.5 transition-transform hover:scale-[1.02]"
              title="Return to Home"
            >
              <span className="grid size-8 place-items-center rounded-lg border border-[#08796f]/30 bg-[#08796f]/[0.08] text-[#08796f] shadow-xs transition-colors group-hover:bg-[#08796f]/15 dark:border-[#52d8c4]/30 dark:bg-[#52d8c4]/10 dark:text-[#52d8c4]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="size-5"
                >
                  <path
                    d="M4 4h16v16H4zM8 4v5h4v6h4v5M12 9h4v4M8 15h4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="square"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-[17px] font-semibold tracking-[-0.035em]">
                α<span className="text-[#08796f] dark:text-[#52d8c4]">Maze</span>
              </span>
            </Link>
          </div>

          {/* Right Corner: Quick Action, Theme Toggle & User Avatar Menu */}
          <div className="flex items-center gap-3">
            {/* Create Project Button (Header shortcut) */}
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="hidden h-9 items-center gap-1.5 border border-[#08796f] bg-[#08796f] px-3.5 font-medium text-white shadow-xs hover:bg-[#066a61] sm:inline-flex dark:border-[#52d8c4]/30 dark:bg-[#44cbb9] dark:text-[#041614] dark:hover:bg-[#57decb]"
            >
              <Plus className="size-4 stroke-[2.5]" />
              <span>Create Project</span>
            </Button>

            {/* Light / Dark Mode Toggle */}
            <ThemeToggle />

            {/* User Avatar & Profile Management Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="group relative flex cursor-pointer items-center gap-2 rounded-full border border-[#b8cbc8] p-0.5 outline-none ring-offset-background transition-all hover:border-[#08796f] focus-visible:ring-2 focus-visible:ring-[#08796f] dark:border-white/15 dark:hover:border-[#52d8c4]"
                  aria-label="User Account and Settings Menu"
                  title="Open user profile & settings"
                >
                  <Avatar className="size-8.5 transition-transform group-hover:scale-105">
                    {userProfile.avatarUrl ? (
                      <AvatarImage src={userProfile.avatarUrl} alt={userProfile.name} />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-[#08796f]/20 to-[#08796f]/40 font-mono text-xs font-bold text-[#08796f] dark:from-[#52d8c4]/20 dark:to-[#52d8c4]/40 dark:text-[#52d8c4]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online / Active Indicator Dot */}
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-[#071318]" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-72 rounded-xl border border-[#c4d6d4] bg-white/95 p-1.5 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-[#0b1a1f]"
              >
                {/* User Bio Header */}
                <div className="flex items-center gap-3 rounded-lg bg-[#f0f6f5] p-3 dark:bg-white/[0.04]">
                  <Avatar className="size-10 border border-[#b2c8c5] dark:border-white/15">
                    <AvatarFallback className="bg-[#08796f] font-mono text-sm font-semibold text-white dark:bg-[#44cbb9] dark:text-[#041614]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {userProfile.name}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {userProfile.email}
                    </p>
                    <span className="mt-1 inline-flex items-center gap-1 rounded bg-[#08796f]/10 px-1.5 py-0.5 text-[9px] font-medium text-[#08796f] dark:bg-[#52d8c4]/15 dark:text-[#52d8c4]">
                      <Building2 className="size-2.5" />
                      {userProfile.institution.split(" ")[0] || "Laboratory"}
                    </span>
                  </div>
                </div>

                <DropdownMenuSeparator className="my-1.5" />

                {/* Profile Management Item */}
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => setIsProfileOpen(true)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors hover:bg-[#08796f]/10 hover:text-[#08796f] dark:hover:bg-[#52d8c4]/10 dark:hover:text-[#52d8c4]"
                  >
                    <UserCog className="size-4 text-[#08796f] dark:text-[#52d8c4]" />
                    <div className="flex-1">
                      <p className="font-semibold">User Profile Management</p>
                      <p className="text-[10px] text-muted-foreground">
                        Name, affiliation, credentials
                      </p>
                    </div>
                  </DropdownMenuItem>

                  {/* Settings Item */}
                  <DropdownMenuItem
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors hover:bg-[#08796f]/10 hover:text-[#08796f] dark:hover:bg-[#52d8c4]/10 dark:hover:text-[#52d8c4]"
                  >
                    <SettingsIcon className="size-4 text-[#08796f] dark:text-[#52d8c4]" />
                    <div className="flex-1">
                      <p className="font-semibold">Settings &amp; Calibration</p>
                      <p className="text-[10px] text-muted-foreground">
                        Tracking parameters, units, auto-save
                      </p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="my-1.5" />

                {/* Sign Out Action */}
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    toast.info("Signed out successfully.");
                    navigate("/");
                  }}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="size-3.5" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ==================================================== */}
      {/* 2. DASHBOARD BODY & OVERVIEW METRICS                */}
      {/* ==================================================== */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Banner & Actions */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#08796f] dark:text-[#52d8c4]">
              <span className="size-2 animate-pulse rounded-full bg-[#08796f] dark:bg-[#52d8c4]" />
              Neurobehavioral Research Portal
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#11292c] sm:text-3xl dark:text-[#edf7f5]">
              Welcome back, {userProfile.name}
            </h1>
            <p className="mt-1 text-xs text-[#526d6a] sm:text-sm dark:text-[#90a8a5]">
              {userProfile.department} · {userProfile.institution}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="h-10 border border-[#08796f] bg-[#08796f] px-4 font-semibold text-white shadow-[0_2px_12px_rgba(8,121,111,0.22)] hover:bg-[#066a61] dark:border-[#52d8c4]/30 dark:bg-[#44cbb9] dark:text-[#041614] dark:hover:bg-[#57decb]"
            >
              <Plus className="mr-1.5 size-4 stroke-[2.5]" />
              Create Project
            </Button>
          </div>
        </div>

        {/* Quick Scientific Stats Strip */}
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-xl border border-[#cde0dd] bg-white p-4 shadow-2xs dark:border-white/[0.07] dark:bg-[#0b1b20]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#506c6a] dark:text-[#88a3a0]">
                Total Projects
              </span>
              <FolderKanban className="size-4 text-[#08796f] dark:text-[#52d8c4]" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#133033] dark:text-white">
              {projects.length}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Across 5 test paradigms
            </p>
          </div>

          <div className="rounded-xl border border-[#cde0dd] bg-white p-4 shadow-2xs dark:border-white/[0.07] dark:bg-[#0b1b20]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#506c6a] dark:text-[#88a3a0]">
                Recorded Trials
              </span>
              <Activity className="size-4 text-[#08796f] dark:text-[#52d8c4]" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#133033] dark:text-white">
              {totalTrials}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Complete trajectory logs
            </p>
          </div>

          <div className="rounded-xl border border-[#cde0dd] bg-white p-4 shadow-2xs dark:border-white/[0.07] dark:bg-[#0b1b20]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#506c6a] dark:text-[#88a3a0]">
                Animal Subjects
              </span>
              <Users className="size-4 text-[#08796f] dark:text-[#52d8c4]" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#133033] dark:text-white">
              {totalSubjects}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Mice &amp; rats in cohort
            </p>
          </div>

          <div className="rounded-xl border border-[#cde0dd] bg-white p-4 shadow-2xs dark:border-white/[0.07] dark:bg-[#0b1b20]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#506c6a] dark:text-[#88a3a0]">
                Arena Accuracy
              </span>
              <ScanSearch className="size-4 text-[#08796f] dark:text-[#52d8c4]" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#133033] dark:text-white">
              99.2%
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Automated zone extraction
            </p>
          </div>
        </div>

        {/* ==================================================== */}
        {/* 3. RECENT PROJECTS SECTION                           */}
        {/* ==================================================== */}
        <section className="space-y-5">
          {/* Section Header & Filters Toolbar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-[#11292c] dark:text-[#edf7f5]">
                Recent Projects
              </h2>
              <span className="rounded-full border border-[#cde0dd] bg-white px-2.5 py-0.5 font-mono text-xs font-semibold text-[#08796f] shadow-2xs dark:border-white/10 dark:bg-white/[0.04] dark:text-[#52d8c4]">
                {filteredProjects.length}
              </span>
            </div>

            {/* Filter and View Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-initial">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search projects, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 border-[#c5d7d5] bg-white pl-8 text-xs shadow-2xs dark:border-white/10 dark:bg-white/[0.04]"
                />
              </div>

              {/* Paradigm Filter Dropdown */}
              <select
                aria-label="Filter by Paradigm"
                value={selectedTemplateFilter}
                onChange={(e) => setSelectedTemplateFilter(e.target.value)}
                className="h-9 rounded-md border border-[#c5d7d5] bg-white px-2.5 text-xs text-[#203c3f] shadow-2xs outline-none focus:border-[#08796f] dark:border-white/10 dark:bg-[#0b1b20] dark:text-[#cfe0de]"
              >
                <option value="all">All Paradigms</option>
                <option value="open_field">Open Field (OFT)</option>
                <option value="elevated_plus">Elevated Plus Maze (EPM)</option>
                <option value="barnes_maze">Barnes Maze (BM)</option>
                <option value="y_maze">Y-Maze (YM)</option>
                <option value="nor">Novel Object (NOR)</option>
              </select>

              {/* View Toggle (Grid / List) */}
              <div className="flex items-center rounded-md border border-[#c5d7d5] bg-white p-0.5 shadow-2xs dark:border-white/10 dark:bg-white/[0.04]">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded p-1.5 transition-colors ${
                    viewMode === "grid"
                      ? "bg-[#08796f]/15 text-[#08796f] dark:bg-[#52d8c4]/20 dark:text-[#52d8c4]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`rounded p-1.5 transition-colors ${
                    viewMode === "table"
                      ? "bg-[#08796f]/15 text-[#08796f] dark:bg-[#52d8c4]/20 dark:text-[#52d8c4]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="List view"
                >
                  <List className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* Grid View of Recent Projects                       */}
          {/* -------------------------------------------------- */}
          {viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* "Create New Project" Card (Direct shortcut in grid) */}
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="group relative flex min-h-[250px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#bed2cf] bg-[#f1f7f6]/60 p-6 text-center transition-all hover:border-[#08796f] hover:bg-white dark:border-white/15 dark:bg-[#0a181d]/50 dark:hover:border-[#52d8c4] dark:hover:bg-[#0c1f26]"
              >
                <div className="grid size-12 place-items-center rounded-full border border-[#08796f]/30 bg-[#08796f]/10 text-[#08796f] transition-transform group-hover:scale-110 dark:border-[#52d8c4]/30 dark:bg-[#52d8c4]/15 dark:text-[#52d8c4]">
                  <Plus className="size-6 stroke-[2.5]" />
                </div>
                <h3 className="mt-4 font-semibold text-[#16363a] dark:text-[#ecf7f5]">
                  Create New Project
                </h3>
                <p className="mt-1.5 max-w-[220px] text-xs text-muted-foreground">
                  Initialize behavioral tracking arena, assign animal subjects, and calibrate camera.
                </p>
                <span className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] font-medium text-[#08796f] dark:text-[#52d8c4]">
                  Configure &amp; Launch <ArrowRight className="size-3" />
                </span>
              </button>

              {/* Projects List */}
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/project/${encodeURIComponent(project.id)}`)}
                  className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-[#c9dcd9] bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#08796f]/40 hover:shadow-md dark:border-white/[0.08] dark:bg-[#0b1b20] dark:hover:border-[#52d8c4]/35"
                >
                  {/* Top Bar of Project Card */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      {/* Template Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${project.templateColor}`}
                      >
                        <span className="font-mono text-[9px] font-bold">
                          {project.templateShort}
                        </span>
                        <span>{project.templateName}</span>
                      </span>

                      {/* Card Action Menu */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="rounded p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                              title="Project options"
                            >
                              <MoreVertical className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 rounded-lg border border-[#c4d6d4] bg-white p-1 text-xs shadow-lg dark:border-white/10 dark:bg-[#0c1e24]"
                          >
                            <DropdownMenuItem
                              onClick={() => {
                                navigate(`/project/${encodeURIComponent(project.id)}`);
                              }}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 font-medium hover:bg-[#08796f]/10 hover:text-[#08796f] dark:hover:bg-[#52d8c4]/15 dark:hover:text-[#52d8c4]"
                            >
                              <Eye className="size-3.5" />
                              <span>View Project Details &amp; Results</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                navigate(`/setup?projectId=${encodeURIComponent(project.id)}`);
                              }}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                            >
                              <Play className="size-3.5" />
                              <span>Open Tracking Suite</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicateProject(project)}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                            >
                              <Copy className="size-3.5" />
                              <span>Duplicate Project</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleExportProject(project)}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                            >
                              <Download className="size-3.5" />
                              <span>Export Data (JSON)</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem
                              onClick={() => handleDeleteProject(project.id, project.name)}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-3.5" />
                              <span>Delete Project</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3
                      onClick={() => navigate(`/project/${encodeURIComponent(project.id)}`)}
                      className="mt-3 cursor-pointer font-semibold tracking-tight text-[#153438] transition-colors hover:text-[#08796f] dark:text-[#ecf7f5] dark:hover:text-[#52d8c4]"
                      title="View Project Details & Results"
                    >
                      {project.name}
                    </h3>
                    <p
                      onClick={() => navigate(`/project/${encodeURIComponent(project.id)}`)}
                      className="mt-1 line-clamp-2 cursor-pointer text-xs leading-relaxed text-[#4f6c69] hover:text-foreground dark:text-[#8ea9a6]"
                    >
                      {project.description}
                    </p>

                    {/* Meta info tags */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-2 font-mono text-[10px] text-[#55716f] dark:text-[#85a19e]">
                      <span className="flex items-center gap-1 rounded bg-[#f0f6f5] px-2 py-0.5 dark:bg-white/[0.04]">
                        <User className="size-3 text-[#08796f] dark:text-[#52d8c4]" />
                        {project.investigator}
                      </span>
                      <span className="flex items-center gap-1 rounded bg-[#f0f6f5] px-2 py-0.5 dark:bg-white/[0.04]">
                        <MousePointer className="size-3 text-[#08796f] dark:text-[#52d8c4]" />
                        {project.strain}
                      </span>
                    </div>

                    {/* Quantitative Key Measures Preview */}
                    <div
                      onClick={() => navigate(`/project/${encodeURIComponent(project.id)}`)}
                      className="mt-4 cursor-pointer rounded-lg border border-[#d3e5e2] bg-[#f8fbfa] p-2.5 transition-colors hover:border-[#08796f]/40 dark:border-white/[0.06] dark:bg-white/[0.02]"
                      title="Click to view full results, graphs & tables"
                    >
                      <div className="grid grid-cols-3 divide-x divide-[#d3e5e2] dark:divide-white/[0.06]">
                        {project.metricsSummary.map((m, idx) => (
                          <div
                            key={idx}
                            className={`flex flex-col ${idx === 0 ? "pr-2" : idx === 1 ? "px-2" : "pl-2"}`}
                          >
                            <span className="truncate font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                              {m.label}
                            </span>
                            <span className="mt-0.5 font-mono text-xs font-semibold text-[#183a3e] dark:text-[#dcf2ee]">
                              {m.value}{" "}
                              {m.unit && (
                                <span className="font-normal text-[9px] text-muted-foreground">
                                  {m.unit}
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Stats & Actions */}
                  <div className="mt-5 border-t border-[#e2edea] pt-3 text-xs dark:border-white/[0.07]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Activity className="size-3 text-[#08796f] dark:text-[#52d8c4]" />
                          {project.trialCount} trials
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {project.lastModified}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/project/${encodeURIComponent(project.id)}`);
                          }}
                          className="h-7 gap-1 border-[#c8d9d7] px-2 text-[11px] font-semibold text-foreground shadow-2xs hover:bg-[#eef5f4] dark:border-white/10 dark:hover:bg-white/10"
                        >
                          <Eye className="size-3 text-[#08796f] dark:text-[#52d8c4]" />
                          Details &amp; Graphs
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/setup?projectId=${encodeURIComponent(project.id)}`);
                          }}
                          className="h-7 gap-1 bg-[#08796f] px-2 text-[11px] font-semibold text-white shadow-2xs hover:bg-[#0a8b80] dark:bg-[#52d8c4] dark:text-[#041614] dark:hover:bg-[#44cbb9]"
                        >
                          Track <ArrowRight className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* -------------------------------------------------- */
            /* Table View of Recent Projects                      */
            /* -------------------------------------------------- */
            <div className="overflow-hidden rounded-xl border border-[#c9dcd9] bg-white shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#d8e8e5] bg-[#f5f9f8] font-mono text-[10px] uppercase tracking-wider text-muted-foreground dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <tr>
                      <th className="px-4 py-3">Project &amp; Paradigm</th>
                      <th className="px-4 py-3">Investigator &amp; Animal</th>
                      <th className="px-4 py-3 text-center">Trials</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Last Modified</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4efec] dark:divide-white/[0.06]">
                    {filteredProjects.map((p) => (
                      <tr
                        key={p.id}
                        className="transition-colors hover:bg-[#f6faf9] dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${p.templateColor}`}
                            >
                              {p.templateShort}
                            </span>
                            <div
                              className="cursor-pointer"
                              onClick={() => navigate(`/project/${encodeURIComponent(p.id)}`)}
                              title="View Project Details & Results"
                            >
                              <p className="font-semibold text-[#16363a] transition-colors hover:text-[#08796f] dark:text-[#ecf7f5] dark:hover:text-[#52d8c4]">
                                {p.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {p.templateName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-foreground">{p.investigator}</p>
                          <p className="text-[10px] text-muted-foreground">{p.strain}</p>
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono font-medium">
                          {p.trialCount}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[11px] text-muted-foreground">
                          {p.lastModified}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/project/${encodeURIComponent(p.id)}`)}
                              className="h-7 px-2 text-xs border-[#c8d9d7] dark:border-white/10"
                            >
                              <Eye className="size-3 mr-1 text-[#08796f] dark:text-[#52d8c4]" />
                              Details
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => navigate(`/setup?projectId=${encodeURIComponent(p.id)}`)}
                              className="h-7 px-2 text-xs bg-[#08796f] text-white hover:bg-[#0a8b80] dark:bg-[#52d8c4] dark:text-[#041614]"
                            >
                              Track
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteProject(p.id, p.name)}
                              className="h-7 size-7 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty Search Fallback */}
          {filteredProjects.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#bed2cf] bg-white py-12 text-center dark:border-white/10 dark:bg-transparent">
              <FlaskConical className="mx-auto size-8 text-muted-foreground/60" />
              <h3 className="mt-3 font-semibold">No matching projects found</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Try searching with different keywords or reset your paradigm filter.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTemplateFilter("all");
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </section>
      </main>

      {/* ==================================================== */}
      {/* 4. "CREATE PROJECT" DIALOG                           */}
      {/* ==================================================== */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl border border-[#c4d7d4] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0a181d]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <FlaskConical className="size-5 text-[#08796f] dark:text-[#52d8c4]" />
              Create Behavioral Tracking Project
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure your experiment methodology, arena type, and experimental animals.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProject} className="mt-3 space-y-4">
            {/* 1. Project Title */}
            <div className="space-y-1.5">
              <Label htmlFor="proj-name" className="text-xs font-semibold">
                Project Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="proj-name"
                required
                placeholder="e.g. CORT Anxiolytic Screening in Plus-Maze"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            {/* 2. Principal Investigator */}
            <div className="space-y-1.5">
              <Label htmlFor="proj-lead" className="text-xs font-semibold">
                Principal Investigator <span className="text-destructive">*</span>
              </Label>
              <Input
                id="proj-lead"
                required
                placeholder="e.g. Dr. Alex Morgan"
                value={newProject.investigator}
                onChange={(e) =>
                  setNewProject({ ...newProject, investigator: e.target.value })
                }
                className="h-9 text-xs"
              />
            </div>

            {/* 3 & 4. Animal Strain and Number of Animals */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="proj-strain" className="text-xs font-semibold">
                  Animal Strain <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="proj-strain"
                  required
                  placeholder="e.g. C57BL/6J Mice"
                  value={newProject.strain}
                  onChange={(e) =>
                    setNewProject({ ...newProject, strain: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="proj-animals" className="text-xs font-semibold">
                  Number Animals <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="proj-animals"
                  type="number"
                  min="1"
                  max="1000"
                  required
                  placeholder="e.g. 12"
                  value={newProject.subjectCount}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      subjectCount: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* 5. Behavioural Tests */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Behavioural Tests <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TEMPLATE_OPTIONS.map((t) => {
                  const isSelected = newProject.templateId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setNewProject({ ...newProject, templateId: t.id as ProjectItem["templateId"] })
                      }
                      className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition-all ${
                        isSelected
                          ? "border-[#08796f] bg-[#08796f]/[0.08] ring-1 ring-[#08796f] dark:border-[#52d8c4] dark:bg-[#52d8c4]/15 dark:ring-[#52d8c4]"
                          : "border-[#d0e0de] bg-[#f9fcfa] hover:border-[#08796f]/40 dark:border-white/10 dark:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-[#08796f] dark:text-[#52d8c4]">
                          {t.short}
                        </span>
                        {isSelected && <Check className="size-3.5 text-[#08796f] dark:text-[#52d8c4]" />}
                      </div>
                      <span className="mt-1 text-xs font-semibold leading-tight text-foreground">
                        {t.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="border border-[#08796f] bg-[#08796f] px-5 font-semibold text-white shadow-xs hover:bg-[#066a61] dark:border-[#52d8c4]/30 dark:bg-[#44cbb9] dark:text-[#041614] dark:hover:bg-[#57decb]"
              >
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* 5. "USER PROFILE MANAGEMENT" DIALOG                  */}
      {/* ==================================================== */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-md border border-[#c4d7d4] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0a181d]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <UserCog className="size-5 text-[#08796f] dark:text-[#52d8c4]" />
              User Profile Management
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manage your academic credentials, institution, and laboratory identity.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="mt-3 space-y-4">
            {/* Avatar & Display Name preview */}
            <div className="flex items-center gap-3.5 rounded-lg border border-[#d2e4e1] bg-[#f5faf8] p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <Avatar className="size-12 border border-[#08796f]/40 dark:border-[#52d8c4]/40">
                <AvatarFallback className="bg-[#08796f] font-mono text-base font-bold text-white dark:bg-[#44cbb9] dark:text-[#041614]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold">{profileForm.name}</p>
                <p className="truncate text-xs text-muted-foreground">{profileForm.role}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-name" className="text-xs font-semibold">
                Full Name &amp; Title
              </Label>
              <Input
                id="user-name"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-email" className="text-xs font-semibold">
                Institutional Email
              </Label>
              <Input
                id="user-email"
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-inst" className="text-xs font-semibold">
                University / Research Institute
              </Label>
              <Input
                id="user-inst"
                required
                value={profileForm.institution}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, institution: e.target.value })
                }
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-dept" className="text-xs font-semibold">
                Department / Laboratory
              </Label>
              <Input
                id="user-dept"
                value={profileForm.department}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, department: e.target.value })
                }
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-role" className="text-xs font-semibold">
                Scientific Role
              </Label>
              <Input
                id="user-role"
                value={profileForm.role}
                onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsProfileOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="border border-[#08796f] bg-[#08796f] px-5 font-semibold text-white shadow-xs hover:bg-[#066a61] dark:border-[#52d8c4]/30 dark:bg-[#44cbb9] dark:text-[#041614] dark:hover:bg-[#57decb]"
              >
                Save Profile
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* 6. "SETTINGS" DIALOG                                 */}
      {/* ==================================================== */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md border border-[#c4d7d4] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0a181d]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <SettingsIcon className="size-5 text-[#08796f] dark:text-[#52d8c4]" />
              Analysis &amp; System Settings
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure video tracking parameters, metric units, and laboratory defaults.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSettings} className="mt-3 space-y-4">
            {/* Arena Auto-detection Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-[#d2e4e1] p-3 dark:border-white/10 dark:bg-white/[0.02]">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Automated Arena Fitting
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Fit borders and standard test zones automatically from the video background.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settingsForm.autoArenaDetect}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, autoArenaDetect: e.target.checked })
                }
                className="size-4 accent-[#08796f]"
              />
            </div>

            {/* Measurement Units */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Standard Metric Distance Unit</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["cm", "m", "px"] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setSettingsForm({ ...settingsForm, distanceUnit: unit })}
                    className={`rounded-md border py-1.5 text-xs font-semibold uppercase transition-colors ${
                      settingsForm.distanceUnit === unit
                        ? "border-[#08796f] bg-[#08796f]/10 text-[#08796f] dark:border-[#52d8c4] dark:bg-[#52d8c4]/20 dark:text-[#52d8c4]"
                        : "border-[#d0e0de] text-muted-foreground hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>

            {/* Immobility Velocity Threshold */}
            <div className="space-y-1.5">
              <Label htmlFor="immobility-threshold" className="text-xs font-semibold">
                Immobility Velocity Threshold (cm/s)
              </Label>
              <Input
                id="immobility-threshold"
                type="number"
                step="0.1"
                min="0.1"
                max="10.0"
                value={settingsForm.immobilityThreshold}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    immobilityThreshold: parseFloat(e.target.value) || 1.5,
                  })
                }
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Speeds below this threshold count toward animal freezing / immobility duration.
              </p>
            </div>

            {/* Default Video Frame Processing Rate */}
            <div className="space-y-1.5">
              <Label htmlFor="fps-rate" className="text-xs font-semibold">
                Video Processing Frame Rate (FPS)
              </Label>
              <select
                id="fps-rate"
                value={settingsForm.fpsDownsampling}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, fpsDownsampling: e.target.value })
                }
                className="h-9 w-full rounded-md border border-[#c5d7d5] bg-white px-2.5 text-xs text-[#203c3f] shadow-2xs outline-none focus:border-[#08796f] dark:border-white/10 dark:bg-[#0b1b20] dark:text-[#cfe0de]"
              >
                <option value="60">Native 60 FPS (High Precision)</option>
                <option value="30">30 FPS (Standard Balance)</option>
                <option value="15">15 FPS (Fast Batch Processing)</option>
              </select>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSettingsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="border border-[#08796f] bg-[#08796f] px-5 font-semibold text-white shadow-xs hover:bg-[#066a61] dark:border-[#52d8c4]/30 dark:bg-[#44cbb9] dark:text-[#041614] dark:hover:bg-[#57decb]"
              >
                Save Settings
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

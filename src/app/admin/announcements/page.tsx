"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Eye,
  X,
  Bold,
  Italic,
  Code,
  List,
  Heading,
  Clock,
  Archive,
  Info,
  AlertTriangle,
  Heart
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { logAdminAction } from "@/lib/adminService";
import { toast } from "sonner";

interface Announcement {
  id?: string;
  title: string;
  category: "Update" | "Maintenance" | "Alert" | "General";
  content: string;
  isPublished: boolean;
  publishedAt: any;
}

const CATEGORY_COLORS = {
  Update: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
  Maintenance: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  Alert: "bg-rose-500/10 border-rose-500/20 text-rose-400",
  General: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
};

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [isOpen, setIsOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Announcement["category"]>("General");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  // Live Preview Pane Toggle
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      if (!db) {
        // Fallback mock announcements
        const mockAnn: Announcement[] = [
          {
            id: "ann-1",
            title: "Typing Engine V2 Release Notes",
            category: "Update",
            content: "We have updated our core typing calculation models to improve latency. Live accuracy calculations are now 3x faster, reducing jitter on standard desktop builds.",
            isPublished: true,
            publishedAt: new Date(Date.now() - 3600000 * 24),
          },
          {
            id: "ann-2",
            title: "Database Server Migration & Maintenance",
            category: "Maintenance",
            content: "Platform login servers will experience a 15-minute maintenance window on Sunday at 04:00 UTC. Custom claims setup and cloud syncing will be temporarily cached locally.",
            isPublished: true,
            publishedAt: new Date(Date.now() - 3600000 * 48),
          },
          {
            id: "ann-3",
            title: "Typing Championship 2026 Announcement!",
            category: "General",
            content: "Signups are now open for the summer tournament! Win certificates signed by typing speed masters. Open globally to all verified accounts.",
            isPublished: false,
            publishedAt: new Date(),
          },
        ];
        setAnnouncements(mockAnn);
        setIsLoading(false);
        return;
      }

      const querySnapshot = await getDocs(collection(db, "announcements"));
      const annList: Announcement[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        annList.push({
          id: docSnap.id,
          title: data.title || "Untitled Bulletin",
          category: data.category || "General",
          content: data.content || "",
          isPublished: data.isPublished !== false,
          publishedAt: data.publishedAt ? data.publishedAt.toDate() : new Date(),
        });
      });
      setAnnouncements(annList);
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
      toast.error("Database Error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleOpenCreate = () => {
    setEditingAnn(null);
    setTitle("");
    setCategory("General");
    setContent("");
    setIsPublished(true);
    setIsPreviewMode(false);
    setIsOpen(true);
  };

  const handleOpenEdit = (ann: Announcement) => {
    setEditingAnn(ann);
    setTitle(ann.title);
    setCategory(ann.category);
    setContent(ann.content);
    setIsPublished(ann.isPublished);
    setIsPreviewMode(false);
    setIsOpen(true);
  };

  const insertMarkdownText = (tagOpen: string, tagClose: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = textarea.value.substring(start, end);
    const replacement = tagOpen + selection + tagClose;

    setContent(
      textarea.value.substring(0, start) +
      replacement +
      textarea.value.substring(end)
    );

    // Refocus and place cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selection.length);
    }, 50);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error("Validation Error", { description: "Title and content cannot be blank." });
      return;
    }

    try {
      const annData = {
        title: title.trim(),
        category,
        content: content.trim(),
        isPublished,
        publishedAt: new Date(),
      };

      if (editingAnn && editingAnn.id) {
        // Edit existing
        if (db) {
          await setDoc(doc(db, "announcements", editingAnn.id), {
            ...annData,
            publishedAt: editingAnn.publishedAt, // Keep original timestamp
          }, { merge: true });
        }
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === editingAnn.id ? { ...a, ...annData } : a))
        );
        await logAdminAction("Edit Announcement", `Title: ${title}`);
        toast.success("Announcement Updated");
      } else {
        // Create new
        let newId = `temp-${Date.now()}`;
        if (db) {
          const docRef = await addDoc(collection(db, "announcements"), {
            ...annData,
            publishedAt: serverTimestamp(),
          });
          newId = docRef.id;
        }
        setAnnouncements((prev) => [{ id: newId, ...annData }, ...prev]);
        await logAdminAction("Create Announcement", `Title: ${title}`);
        toast.success("Announcement Published");
      }

      setIsOpen(false);
    } catch (err) {
      console.error("Failed to save announcement:", err);
      toast.error("Save Failed");
    }
  };

  const handleDelete = async (annId: string, annTitle: string) => {
    const confirmDelete = window.confirm(`Delete announcement "${annTitle}"?`);
    if (!confirmDelete) return;

    try {
      if (db) {
        await deleteDoc(doc(db, "announcements", annId));
      }
      setAnnouncements((prev) => prev.filter((a) => a.id !== annId));
      await logAdminAction("Delete Announcement", `Title: ${annTitle}`);
      toast.success("Announcement Removed");
    } catch (err) {
      console.error("Failed to delete announcement:", err);
      toast.error("Deletion Failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Bulletins & Announcements
          </h1>
          <p className="text-sm text-slate-400">
            Publish site updates, maintenance notices, and general announcements.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4.5 h-4.5" />
          Create Announcement
        </button>
      </div>

      {/* Grid of Announcements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-slate-900/10 border border-slate-800/40 rounded-2xl p-6 space-y-4 animate-pulse"
            >
              <div className="w-16 h-5 bg-slate-800 rounded-full" />
              <div className="w-3/4 h-5 bg-slate-850 rounded" />
              <div className="w-full h-12 bg-slate-850 rounded" />
              <div className="w-24 h-4 bg-slate-800 rounded" />
            </div>
          ))
        ) : announcements.map((ann) => (
          <motion.div
            key={ann.id}
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700/60 transition-all duration-200"
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${CATEGORY_COLORS[ann.category]}`}>
                  {ann.category}
                </span>

                <span className={`flex items-center gap-1 text-[10px] font-bold ${
                  ann.isPublished ? "text-emerald-400" : "text-slate-500"
                }`}>
                  {ann.isPublished ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> Active Bulletin
                    </>
                  ) : (
                    <>
                      <Archive className="w-3.5 h-3.5" /> Draft/Archived
                    </>
                  )}
                </span>
              </div>

              <h3 className="text-slate-100 font-bold text-sm tracking-tight mb-2">
                {ann.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line mb-6">
                {ann.content}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-850 pt-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5" />
                {ann.publishedAt ? new Date(ann.publishedAt).toLocaleDateString() : "Recently"}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(ann)}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/20 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(ann.id!, ann.title)}
                  className="p-1.5 rounded-lg border border-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {!isLoading && announcements.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs font-semibold">
            No announcements have been published.
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-xl bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-slate-850 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Megaphone className="w-4.5 h-4.5 text-indigo-400" />
                  {editingAnn ? "Modify Bulletin" : "Create Bulletin"}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Bulletin Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Server Maintenance, Event Announcement..."
                    className="w-full bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3.5 py-2 text-xs focus:outline-none text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Category Tag</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Announcement["category"])}
                      className="w-full bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-200"
                    >
                      <option value="General">General Bulletin</option>
                      <option value="Update">Update / Release Notes</option>
                      <option value="Maintenance">Maintenance Schedule</option>
                      <option value="Alert">Important Security Alert</option>
                    </select>
                  </div>

                  {/* Publish Status Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Visibility</label>
                    <select
                      value={isPublished ? "true" : "false"}
                      onChange={(e) => setIsPublished(e.target.value === "true")}
                      className="w-full bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-200"
                    >
                      <option value="true">Publish Immediately</option>
                      <option value="false">Save as Draft</option>
                    </select>
                  </div>
                </div>

                {/* Content Editor with Formatting Helpers */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-400">Announcement Content</label>
                    <button
                      type="button"
                      onClick={() => setIsPreviewMode(!isPreviewMode)}
                      className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded hover:bg-indigo-500/10 transition-colors"
                    >
                      <Eye className="w-3 h-3" /> {isPreviewMode ? "Edit Mode" : "Preview Mode"}
                    </button>
                  </div>

                  {!isPreviewMode ? (
                    <div className="space-y-1 bg-slate-950/40 border border-slate-800 rounded-xl overflow-hidden">
                      {/* Markdown Toolbar */}
                      <div className="flex items-center gap-1.5 p-1.5 bg-slate-950 border-b border-slate-800">
                        <button
                          type="button"
                          onClick={() => insertMarkdownText("**", "**")}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Bold text"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertMarkdownText("*", "*")}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Italic text"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertMarkdownText("### ")}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Header tag"
                        >
                          <Heading className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertMarkdownText("`", "`")}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Inline code"
                        >
                          <Code className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertMarkdownText("- ")}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Bullet list"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write announcement body (supports markdown)..."
                        rows={6}
                        className="w-full bg-transparent px-3 py-2 text-xs focus:outline-none text-slate-200 resize-none font-mono"
                      />
                    </div>
                  ) : (
                    <div className="w-full bg-slate-950/40 border border-slate-850 rounded-xl p-4 min-h-[174px] max-h-60 overflow-y-auto text-xs leading-relaxed text-slate-300 whitespace-pre-wrap font-sans">
                      {content.trim() ? content : <span className="text-slate-500 italic">No content written yet.</span>}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all"
                  >
                    Post Bulletin
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

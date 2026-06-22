"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Globe,
  Code,
  Binary,
  X,
  Eye
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { logAdminAction } from "@/lib/adminService";
import { toast } from "sonner";

interface TypingTest {
  id?: string;
  title: string;
  category: "English" | "Hindi" | "Programming" | "Custom" | "Numbers";
  text: string;
  duration: number; // in seconds
  isPublished: boolean;
}

const CATEGORY_ICONS = {
  English: Globe,
  Hindi: FileText,
  Programming: Code,
  Custom: FileText,
  Numbers: Binary,
};

export default function AdminTestsPage() {
  const [tests, setTests] = useState<TypingTest[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<TypingTest | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TypingTest["category"]>("English");
  const [text, setText] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [isPublished, setIsPublished] = useState(true);

  // Preview State
  const [previewText, setPreviewText] = useState<string | null>(null);

  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedDefaultTests = async () => {
    setIsSeeding(true);
    try {
      const defaultTests: TypingTest[] = [
        {
          title: "Classic English Literature",
          category: "English",
          text: "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of light, it was the season of darkness.",
          duration: 60,
          isPublished: true,
        },
        {
          title: "Binary Tree Traversal Algorithm",
          category: "Programming",
          text: "void preOrder(Node* root) {\n  if (root == NULL) return;\n  cout << root->data << \" \";\n  preOrder(root->left);\n  preOrder(root->right);\n}",
          duration: 60,
          isPublished: true,
        },
        {
          title: "Hindi Moral Story (Sher aur Khargosh)",
          category: "Hindi",
          text: "एक समय की बात है, एक घने जंगल में एक शेर रहता था। वह बहुत शक्तिशाली और क्रूर था और जंगल के अन्य जानवरों का शिकार करता था।",
          duration: 60,
          isPublished: true,
        },
        {
          title: "Standard Number Sequence",
          category: "Numbers",
          text: "10 20 30 40 50 60 70 80 90 100 110 120 130 140 150 160 170 180 190 200",
          duration: 30,
          isPublished: true,
        },
        {
          title: "JavaScript Promise Async/Await",
          category: "Programming",
          text: "async function fetchUserData(userId) {\n  try {\n    const response = await fetch(`/api/users/${userId}`);\n    const data = await response.json();\n    return data;\n  } catch (error) {\n    console.error('Failed to fetch user:', error);\n  }\n}",
          duration: 60,
          isPublished: true,
        }
      ];

      if (db) {
        for (const test of defaultTests) {
          await addDoc(collection(db, "tests"), {
            ...test,
            createdAt: serverTimestamp(),
            updatedAt: Date.now()
          });
        }
      }
      
      toast.success("Database Seeded", {
        description: "Default typing tests have been successfully published.",
      });
      await logAdminAction("Seed Default Tests", "Published initial set of system paragraphs");
      fetchTests();
    } catch (err: any) {
      console.error("Failed to seed typing tests:", err);
      toast.error("Seeding Failed", { description: err.message || "An error occurred." });
    } finally {
      setIsSeeding(false);
    }
  };

  const fetchTests = async () => {
    setIsLoading(true);
    try {
      if (!db) {
        // Fallback mock tests
        const mockTests: TypingTest[] = [
          {
            id: "t1",
            title: "Classic English Literature",
            category: "English",
            text: "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.",
            duration: 60,
            isPublished: true,
          },
          {
            id: "t2",
            title: "C++ Tree Traversal Algorithm",
            category: "Programming",
            text: "struct Node {\n  int val;\n  Node *left, *right;\n  Node(int x) : val(x), left(NULL), right(NULL) {}\n};",
            duration: 120,
            isPublished: true,
          },
          {
            id: "t3",
            title: "Hindi Primary Alphabet Speedrun",
            category: "Hindi",
            text: "एक समय की बात है, एक घने जंगल में एक शेर रहता था। वह बहुत शक्तिशाली और क्रूर था।",
            duration: 60,
            isPublished: false,
          },
          {
            id: "t4",
            title: "Fibonacci Sequence Operations",
            category: "Numbers",
            text: "1 1 2 3 5 8 13 21 34 55 89 144 233 377 610 987 1597 2584 4181 6765",
            duration: 30,
            isPublished: true,
          },
        ];
        setTests(mockTests);
        setIsLoading(false);
        return;
      }

      const querySnapshot = await getDocs(collection(db, "tests"));
      const testsList: TypingTest[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        testsList.push({
          id: docSnap.id,
          title: data.title || "Untitled Test",
          category: data.category || "English",
          text: data.text || "",
          duration: data.duration || 60,
          isPublished: data.isPublished !== false,
        });
      });
      setTests(testsList);
    } catch (err) {
      console.error("Failed to fetch typing tests:", err);
      toast.error("Database Error", { description: "Could not fetch custom tests." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const openCreateModal = () => {
    setEditingTest(null);
    setTitle("");
    setCategory("English");
    setText("");
    setDuration(60);
    setIsPublished(true);
    setIsModalOpen(true);
  };

  const openEditModal = (test: TypingTest) => {
    setEditingTest(test);
    setTitle(test.title);
    setCategory(test.category);
    setText(test.text);
    setDuration(test.duration);
    setIsPublished(test.isPublished);
    setIsModalOpen(true);
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !text.trim()) {
      toast.error("Validation Error", { description: "All fields are required." });
      return;
    }

    try {
      const testData = {
        title: title.trim(),
        category,
        text: text.trim(),
        duration: Number(duration),
        isPublished,
        updatedAt: Date.now(),
      };

      if (editingTest && editingTest.id) {
        // Edit existing test
        if (db) {
          await setDoc(doc(db, "tests", editingTest.id), testData, { merge: true });
        }
        setTests((prev) =>
          prev.map((t) => (t.id === editingTest.id ? { ...t, ...testData } : t))
        );
        await logAdminAction("Edit Typing Test", `Test Title: ${title}`);
        toast.success("Test Updated", { description: `"${title}" has been successfully updated.` });
      } else {
        // Create new test
        let newId = `temp-${Date.now()}`;
        if (db) {
          const docRef = await addDoc(collection(db, "tests"), {
            ...testData,
            createdAt: serverTimestamp(),
          });
          newId = docRef.id;
        }
        setTests((prev) => [...prev, { id: newId, ...testData }]);
        await logAdminAction("Create Typing Test", `Test Title: ${title}`);
        toast.success("Test Created", { description: `"${title}" is now available in database.` });
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save typing test:", err);
      toast.error("Operation Failed");
    }
  };

  const handleDeleteTest = async (testId: string, testTitle: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete the test "${testTitle}"?`);
    if (!confirmDelete) return;

    try {
      if (db) {
        await deleteDoc(doc(db, "tests", testId));
      }
      setTests((prev) => prev.filter((t) => t.id !== testId));
      await logAdminAction("Delete Typing Test", `Test Title: ${testTitle}`);
      toast.success("Test Deleted", { description: `Successfully removed "${testTitle}".` });
    } catch (err) {
      console.error("Failed to delete typing test:", err);
      toast.error("Deletion Failed");
    }
  };

  const handleTogglePublish = async (test: TypingTest) => {
    try {
      const updatedPublish = !test.isPublished;
      if (db && test.id) {
        await setDoc(doc(db, "tests", test.id), { isPublished: updatedPublish }, { merge: true });
      }
      setTests((prev) =>
        prev.map((t) => (t.id === test.id ? { ...t, isPublished: updatedPublish } : t))
      );
      await logAdminAction(
        updatedPublish ? "Publish Test" : "Unpublish Test",
        `Test Title: ${test.title}`
      );
      toast.success(updatedPublish ? "Test Published" : "Test Unpublished", {
        description: `Visibility of "${test.title}" updated successfully.`,
      });
    } catch (err) {
      console.error("Failed to toggle publish status:", err);
      toast.error("Failed to update test status");
    }
  };

  const filteredTests = tests.filter(
    (t) => filterCategory === "all" || t.category === filterCategory
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Test Manager
          </h1>
          <p className="text-sm text-slate-400">
            Publish custom speed trials for users, edit paragraphs, or select specific categories.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4.5 h-4.5" />
          Create Test Paragraph
        </button>
      </div>

      {/* Control Bar (Categories Filter) */}
      <div className="flex gap-2 pb-2 overflow-x-auto border-b border-slate-800/40">
        {["all", "English", "Hindi", "Programming", "Custom", "Numbers"].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap border ${
              filterCategory === cat
                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                : "bg-slate-900/10 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-slate-900/10 border border-slate-800/40 rounded-2xl p-6 space-y-4 animate-pulse"
            >
              <div className="flex justify-between">
                <div className="w-10 h-10 bg-slate-800 rounded-lg" />
                <div className="w-20 h-5 bg-slate-800 rounded-full" />
              </div>
              <div className="w-3/4 h-5 bg-slate-850 rounded" />
              <div className="w-full h-12 bg-slate-850 rounded" />
              <div className="flex justify-between items-center pt-2">
                <div className="w-14 h-4 bg-slate-800 rounded" />
                <div className="w-20 h-8 bg-slate-800 rounded-lg" />
              </div>
            </div>
          ))
        ) : filteredTests.map((test) => {
          const CatIcon = CATEGORY_ICONS[test.category] || FileText;

          return (
            <motion.div
              key={test.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="group relative bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700/60 transition-all duration-200"
            >
              {/* Category Pill and Publish Status */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <CatIcon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-300 font-mono">
                    {test.category}
                  </span>
                </div>

                <button
                  onClick={() => handleTogglePublish(test)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-colors ${
                    test.isPublished
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                  }`}
                  title={test.isPublished ? "Unpublish Test" : "Publish Test"}
                >
                  {test.isPublished ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Published
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" /> Draft
                    </>
                  )}
                </button>
              </div>

              {/* Title and Excerpt */}
              <div className="mb-6">
                <h3 className="text-slate-100 font-bold text-sm tracking-tight mb-2 group-hover:text-white truncate">
                  {test.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed font-mono">
                  {test.text}
                </p>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between border-t border-slate-850 pt-4 text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {test.duration} seconds
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPreviewText(test.text)}
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/20 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Preview full paragraph"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(test)}
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/20 hover:bg-slate-800 text-slate-450 hover:text-white transition-colors"
                    title="Edit Test Details"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTest(test.id!, test.title)}
                    className="p-1.5 rounded-lg border border-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 transition-colors"
                    title="Delete Test"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {!isLoading && filteredTests.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-slate-950/20 border border-slate-800/40 rounded-2xl p-8">
            <p className="text-slate-400 text-xs font-semibold mb-4">
              No typing tests found in this category.
            </p>
            {filterCategory === "all" && tests.length === 0 && (
              <button
                type="button"
                onClick={handleSeedDefaultTests}
                disabled={isSeeding}
                className="px-5 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all"
              >
                {isSeeding ? "Seeding tests..." : "Seed Default Typing Paragraphs"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-xl bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-slate-850 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-100">
                  {editingTest ? "Edit Typing Test" : "Create New Typing Test"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTest} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Trial Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Algorithms Speed Test"
                      className="w-full bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3.5 py-2 text-xs focus:outline-none text-slate-200 transition-colors"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Category Language</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as TypingTest["category"])}
                      className="w-full bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-200 transition-colors"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Programming">Programming</option>
                      <option value="Custom">Custom Paragraph</option>
                      <option value="Numbers">Numbers</option>
                    </select>
                  </div>

                  {/* Duration */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Duration (Seconds)</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-200 transition-colors"
                    >
                      <option value={30}>30 Seconds</option>
                      <option value={60}>1 Minute</option>
                      <option value={120}>2 Minutes</option>
                      <option value={180}>3 Minutes</option>
                      <option value={300}>5 Minutes</option>
                    </select>
                  </div>
                </div>

                {/* Text Content */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Typing Text Paragraph</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter the precise paragraph/code the typist will copy..."
                    rows={6}
                    className="w-full bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none text-slate-200 transition-colors resize-none"
                  />
                </div>

                {/* Status Toggle */}
                <div className="flex items-center justify-between py-2 border-t border-b border-slate-850">
                  <div>
                    <h4 className="text-xs font-bold text-slate-300">Publish Immediately</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Toggle to make it visible to students.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-slate-950 border-slate-800 rounded focus:ring-indigo-500 focus:ring-offset-slate-900"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all"
                  >
                    {editingTest ? "Update Paragraph" : "Save Paragraph"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Paragraph Preview Modal */}
      <AnimatePresence>
        {previewText && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewText(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-lg bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4 border-b border-slate-850 pb-3">
                <h4 className="text-xs font-bold text-slate-300">Paragraph Content Preview</h4>
                <button
                  onClick={() => setPreviewText(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl max-h-60 overflow-y-auto">
                <p className="text-xs leading-relaxed text-slate-300 font-mono whitespace-pre-wrap">
                  {previewText}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

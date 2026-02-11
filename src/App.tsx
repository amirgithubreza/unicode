import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { unicodeCategories as baseCategories } from "./data/unicodeData";
import { extraUnicodeCategories } from "./data/unicodeDataExtra";
import { extraUnicodeCategories2 } from "./data/unicodeDataExtra2";
import type { UnicodeChar, UnicodeCategory } from "./data/unicodeData";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const unicodeCategories: UnicodeCategory[] = [
  ...baseCategories,
  ...extraUnicodeCategories,
  ...extraUnicodeCategories2,
];

function copyToClipboard(text: string) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

function CharCard({
  item,
  onCopied,
}: {
  item: UnicodeChar;
  onCopied: (text: string) => void;
}) {
  const entityCode = `&#${item.code};`;

  return (
    <div className="group relative flex flex-col items-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5">
      <button
        onClick={() => {
          copyToClipboard(item.char);
          onCopied(`Copied: ${item.char}`);
        }}
        className="mb-2 flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 text-3xl transition-colors group-hover:from-indigo-50 group-hover:to-purple-50 cursor-pointer"
        title={`Copy character: ${item.char}`}
      >
        {item.char}
      </button>
      <p className="mb-1 text-center text-xs font-medium text-slate-700 leading-tight line-clamp-2 min-h-[2rem]">
        {item.description}
      </p>
      <button
        onClick={() => {
          copyToClipboard(entityCode);
          onCopied(`Copied: ${entityCode}`);
        }}
        className="mt-auto rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500 transition-colors hover:bg-indigo-100 hover:text-indigo-700 cursor-pointer"
        title={`Copy HTML entity: ${entityCode}`}
      >
        {entityCode}
      </button>
    </div>
  );
}

function CategorySection({
  category,
  onCopied,
  defaultCollapsed,
}: {
  category: UnicodeCategory;
  onCopied: (text: string) => void;
  defaultCollapsed: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mb-8" ref={ref}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="mb-4 flex w-full items-center gap-3 cursor-pointer group"
      >
        <span className="text-2xl">{category.icon}</span>
        <h2 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
          {category.name}
        </h2>
        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
          {category.items.length}
        </span>
        <span
          className="ml-auto text-slate-400 transition-transform duration-200"
          style={{
            transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>
      </button>
      {!isCollapsed && isVisible && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {category.items.map((item, idx) => (
            <CharCard
              key={`${item.code}-${idx}`}
              item={item}
              onCopied={onCopied}
            />
          ))}
        </div>
      )}
      {!isCollapsed && !isVisible && (
        <div className="h-32 flex items-center justify-center text-slate-400">
          <span className="animate-pulse">Loading...</span>
        </div>
      )}
    </div>
  );
}

export function App() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [toast, setToast] = useState<string | null>(null);

  const totalChars = useMemo(
    () => unicodeCategories.reduce((sum, cat) => sum + cat.items.length, 0),
    []
  );

  const filteredCategories = useMemo(() => {
    const searchLower = search.toLowerCase().trim();

    return unicodeCategories
      .filter((cat) => activeCategory === "all" || cat.name === activeCategory)
      .map((cat) => {
        if (!searchLower) return cat;
        const filtered = cat.items.filter(
          (item) =>
            item.description.toLowerCase().includes(searchLower) ||
            item.char.includes(search) ||
            `&#${item.code};`.includes(searchLower) ||
            item.code.toString().includes(searchLower)
        );
        return { ...cat, items: filtered };
      })
      .filter((cat) => cat.items.length > 0);
  }, [search, activeCategory]);

  const filteredTotal = useMemo(
    () => filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0),
    [filteredCategories]
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  }, []);

  const exportPDF = useCallback(() => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(20);
    doc.setTextColor(49, 46, 129);
    doc.text("Unicode & Emoji Reference", 105, 18, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("for Web Development", 105, 24, { align: "center" });
    doc.text(`Total Characters: ${totalChars}`, 105, 30, { align: "center" });

    let startY = 38;

    const categoriesToExport =
      activeCategory === "all"
        ? unicodeCategories
        : unicodeCategories.filter((c) => c.name === activeCategory);

    for (const category of categoriesToExport) {
      const items = search
        ? category.items.filter(
            (item) =>
              item.description
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              item.char.includes(search) ||
              `&#${item.code};`.includes(search.toLowerCase()) ||
              item.code.toString().includes(search.toLowerCase())
          )
        : category.items;

      if (items.length === 0) continue;

      if (startY > 270) {
        doc.addPage();
        startY = 15;
      }

      doc.setFontSize(13);
      doc.setTextColor(49, 46, 129);
      doc.text(`${category.name} (${items.length})`, 14, startY);
      startY += 3;

      const tableData = items.map((item) => [
        item.char,
        item.description,
        `&#${item.code};`,
        `U+${item.code.toString(16).toUpperCase().padStart(4, "0")}`,
      ]);

      autoTable(doc, {
        startY: startY,
        head: [["Char", "Description", "HTML Entity", "Unicode"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [79, 70, 229],
          fontSize: 8,
          fontStyle: "bold",
          halign: "center",
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2,
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 15, fontSize: 12 },
          1: { cellWidth: 80 },
          2: {
            halign: "center",
            cellWidth: 30,
            fontStyle: "bold",
            fontSize: 7,
          },
          3: { halign: "center", cellWidth: 30, fontSize: 7 },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: () => {
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Unicode & Emoji Reference for Web Dev - Page ${doc.getNumberOfPages()}`,
            105,
            292,
            { align: "center" }
          );
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startY = (doc as any).lastAutoTable.finalY + 8;
    }

    doc.save("unicode-emoji-reference.pdf");
    showToast("PDF downloaded!");
  }, [activeCategory, search, totalChars, showToast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-bounce rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                <span className="text-indigo-600">Unicode</span> &{" "}
                <span className="text-purple-600">Emoji</span> Reference
              </h1>
              <p className="text-sm text-slate-500">
                {filteredTotal} of {totalChars} characters across{" "}
                {unicodeCategories.length} categories · Click to copy
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search characters..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
              {/* Export PDF */}
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg cursor-pointer"
              >
                📄 Export PDF
              </button>
            </div>
          </div>

          {/* Category tabs */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                activeCategory === "all"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({totalChars})
            </button>
            {unicodeCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  activeCategory === cat.name
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.icon} {cat.name} ({cat.items.length})
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="text-6xl mb-4">🔍</span>
            <p className="text-lg font-medium">No characters found</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        ) : (
          filteredCategories.map((cat, idx) => (
            <CategorySection
              key={cat.name}
              category={cat}
              onCopied={showToast}
              defaultCollapsed={activeCategory === "all" && idx > 5}
            />
          ))
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <p className="text-sm text-slate-500">
            Unicode & Emoji Reference for Web Development · {totalChars}+
            characters · Click any character to copy · Export as PDF for offline
            use
          </p>
        </div>
      </footer>
    </div>
  );
}

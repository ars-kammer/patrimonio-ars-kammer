import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export default function Modal({
  titulo,
  onFechar,
  children,
  largura = "max-w-lg",
}: {
  titulo: ReactNode;
  onFechar: () => void;
  children: ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div
        className={`relative flex max-h-[92vh] w-full ${largura} flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#e5e7eb] px-5 py-3.5">
          <h2 className="truncate text-base font-semibold">{titulo}</h2>
          <button onClick={onFechar} aria-label="Fechar" className="text-[#9ca3af] hover:text-[#1a1a1a]">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

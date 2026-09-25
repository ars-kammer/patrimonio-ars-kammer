import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Tipo = "ok" | "erro";
const ToastContext = createContext<(msg: string, tipo?: Tipo) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; tipo: Tipo } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const mostrar = useCallback((msg: string, tipo: Tipo = "ok") => {
    window.clearTimeout(timer.current);
    setToast({ msg, tipo });
    timer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4">
          <div
            role="status"
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
              toast.tipo === "ok" ? "bg-[#1a1a1a]" : "bg-[#C0392B]"
            }`}
          >
            {toast.tipo === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.msg}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext);
}

import { useToastStore } from '@/store/useToastStore';

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[120] flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto flex items-center gap-2.5 rounded-full py-2 pl-2 pr-4 text-[13px] font-medium text-white shadow-lg shadow-black/15 transition ${
            t.tone === 'error' ? 'bg-red-600' : 'bg-ink-900'
          }`}
        >
          {t.swatch ? (
            <span
              className="size-6 rounded-full ring-1 ring-white/25"
              style={{ background: t.swatch }}
              aria-hidden
            />
          ) : (
            <span className="size-6 rounded-full bg-white/15" aria-hidden />
          )}
          {t.message}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useActionState, useRef } from "react";
import { Send } from "lucide-react";
import { replyAction } from "@/app/actions/messages";

export function ReplyForm({ conversationId }: { conversationId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    async (previous: Awaited<ReturnType<typeof replyAction>>, formData: FormData) => {
      const result = await replyAction(previous, formData);
      if (result?.ok) formRef.current?.reset();
      return result;
    },
    undefined,
  );

  return (
    <form ref={formRef} action={action} className="flex items-end gap-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      <textarea
        name="body"
        rows={2}
        required
        placeholder="Escribe tu mensaje…"
        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
      />
      <button
        type="submit"
        disabled={pending}
        aria-label="Enviar"
        className="rounded-lg bg-brand-600 p-2.5 text-white hover:bg-brand-700 disabled:opacity-60"
      >
        <Send className="size-5" />
      </button>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}

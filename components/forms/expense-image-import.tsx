"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { parseReceiptOcrText } from "@/lib/parse-receipt-ocr-text";
import { ImagePlus, Loader2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

type ExpenseFormValues = {
  transactionDate: string;
  amount: number;
  description?: string;
  merchant?: string;
  installments: number;
  notes?: string;
  cardId: string;
  categoryId: string;
};

export function ExpenseImageImport({
  form,
  disabled,
}: {
  form: UseFormReturn<ExpenseFormValues>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [lastRaw, setLastRaw] = useState<string | null>(null);

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !file.type.startsWith("image/")) {
        setError("Elegí un archivo de imagen (JPG, PNG, etc.).");
        return;
      }
      setError(null);
      setHint(null);
      setLoading(true);
      setLastRaw(null);
      try {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("spa+eng");
        const {
          data: { text },
        } = await worker.recognize(file);
        await worker.terminate();

        const parsed = parseReceiptOcrText(text);
        setLastRaw(parsed.rawText);

        if (parsed.amount != null) {
          form.setValue("amount", Math.round(parsed.amount * 100) / 100, { shouldValidate: true });
        }
        if (parsed.transactionDate) {
          form.setValue("transactionDate", parsed.transactionDate, { shouldValidate: true });
        }
        if (parsed.merchant) {
          form.setValue("merchant", parsed.merchant.slice(0, 200), { shouldValidate: true });
        }
        if (parsed.description) {
          form.setValue("description", parsed.description.slice(0, 500), { shouldValidate: true });
        }

        const parts: string[] = [];
        if (parsed.amount != null) parts.push(`Monto ~ ${parsed.amount}`);
        if (parsed.transactionDate) parts.push(`Fecha ~ ${parsed.transactionDate}`);
        if (parsed.merchant) parts.push(`Comercio ~ ${parsed.merchant}`);
        setHint(
          parts.length > 0
            ? `Detectado (${parsed.confidence}): ${parts.join(" · ")}. Revisá y corregí si hace falta.`
            : "Se leyó la imagen pero no se detectaron datos claros. Revisá el texto OCR abajo o cargá a mano.",
        );
      } catch (err) {
        console.error(err);
        setError("No se pudo leer la imagen. Probá otra captura o cargá el gasto a mano.");
      } finally {
        setLoading(false);
      }
    },
    [form],
  );

  return (
    <div className="space-y-3 rounded-lg border border-dashed bg-muted/20 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <ImagePlus className="h-4 w-4" />
          Comprobante o captura
        </Label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled || loading}
          onChange={onFile}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || loading}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Leyendo…
            </>
          ) : (
            "Subir imagen"
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          En el celular podés elegir galería o cámara. El OCR corre en tu navegador.
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Pensado para capturas de Mercado Pago, banco o comercio. La primera vez puede tardar unos segundos (descarga del
        motor OCR). Si el monto o la fecha fallan, corregilos antes de guardar.
      </p>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {hint && !error && (
        <Alert>
          <AlertTitle>OCR</AlertTitle>
          <AlertDescription>{hint}</AlertDescription>
        </Alert>
      )}
      {lastRaw && (
        <div className="space-y-1">
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() => setShowRaw((s) => !s)}
          >
            {showRaw ? "Ocultar" : "Ver"} texto detectado
          </button>
          {showRaw && (
            <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 text-[11px] leading-snug text-muted-foreground">
              {lastRaw}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

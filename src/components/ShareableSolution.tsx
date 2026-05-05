import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Share2, FileText, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export function ShareableSolution({ question, answer }: { question: string; answer: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<null | "png" | "pdf">(null);

  async function exportPng() {
    if (!ref.current) return;
    setBusy("png");
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(ref.current, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl; a.download = `study-buddy-solution-${Date.now()}.png`; a.click();
      toast.success("Image saved");
    } catch (e: any) { toast.error("Couldn't export image"); }
    finally { setBusy(null); }
  }

  async function exportPdf() {
    if (!ref.current) return;
    setBusy("pdf");
    try {
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");
      const dataUrl = await toPng(ref.current, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
      const img = new Image();
      img.src = dataUrl;
      await new Promise(r => { img.onload = () => r(null); });
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const w = pageW - margin * 2;
      const h = (img.height * w) / img.width;
      let y = margin;
      let remaining = h;
      let sY = 0;
      // simple paginate by slicing the image vertically
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const scale = img.width / w;
      const pageContentH = (pageH - margin * 2) * scale;
      while (remaining > 0) {
        const sliceH = Math.min(pageContentH, img.height - sY);
        canvas.width = img.width; canvas.height = sliceH;
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, -sY);
        const slice = canvas.toDataURL("image/png");
        const sliceRenderH = sliceH / scale;
        if (sY > 0) { pdf.addPage(); y = margin; }
        pdf.addImage(slice, "PNG", margin, y, w, sliceRenderH);
        sY += sliceH;
        remaining -= sliceRenderH;
      }
      pdf.save(`study-buddy-solution-${Date.now()}.pdf`);
      toast.success("PDF saved");
    } catch (e: any) { console.error(e); toast.error("Couldn't export PDF"); }
    finally { setBusy(null); }
  }

  async function shareNative() {
    try {
      await navigator.share({ title: "Study Buddy solution", text: question + "\n\n" + answer });
    } catch {}
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-full" disabled={!!busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportPdf}><FileText className="w-4 h-4 mr-2" /> Export as PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={exportPng}><ImageIcon className="w-4 h-4 mr-2" /> Export as PNG</DropdownMenuItem>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <DropdownMenuItem onClick={shareNative}><Share2 className="w-4 h-4 mr-2" /> Share link/text</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Off-screen printable card with light theme for clean export */}
      <div className="absolute -z-10 -left-[9999px] top-0">
        <div ref={ref} style={{ width: 760, padding: 32, background: "#ffffff", color: "#0f172a", fontFamily: "Inter, system-ui, sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "2px solid #6366f1", paddingBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#06b6d4)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700 }}>SB</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Study Buddy · AI Tutor</div>
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{new Date().toLocaleDateString()}</div>
          </div>
          <div style={{ background: "#f1f5f9", borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", marginBottom: 6 }}>Question</div>
            <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{question || "(image attached)"}</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", marginBottom: 8 }}>Step-by-step hints</div>
          <div className="prose-print" style={{ fontSize: 14, lineHeight: 1.6 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{answer}</ReactMarkdown>
          </div>
          <div style={{ marginTop: 24, paddingTop: 10, borderTop: "1px solid #e2e8f0", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
            Generated by Study Buddy — find a study partner, beat the chapter together.
          </div>
        </div>
      </div>
    </div>
  );
}

export function HistoryCard() { return null; }

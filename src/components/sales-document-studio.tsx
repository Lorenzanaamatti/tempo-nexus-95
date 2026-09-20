import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Download, Eye, FilePlus2, Files, Layers3, Plus, Save, Trash2, Upload } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";
import { uploadMarketingAsset, signMarketingAsset, deleteMarketingAsset } from "@/lib/marketing-upload";
import { DECK_PURPOSES, DECK_PURPOSE_LABEL, MARKETING_LANGUAGES, MARKETING_LANGUAGE_LABEL, type DeckPurpose, type MarketingLanguage } from "@/lib/marketing-constants";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type DeckFile = { id: string; deck_id: string; storage_path: string; file_name: string | null; mime_type: string | null; size_bytes: number | null };
type Deck = { id: string; title: string; purpose: DeckPurpose; language: MarketingLanguage; audience: string | null; version: string | null; notes: string | null; tags: string[]; format: string; status: string; storage_path: string | null; marketing_deck_files?: DeckFile[] };
type Composition = { id: string; title: string; purpose: DeckPurpose; language: MarketingLanguage; status: string; notes: string | null; created_at: string };
type DraftItem = { key: string; file: DeckFile; deck: Deck; selectedParts: string };

const ACCEPT = ".ppt,.pptx,.doc,.docx,.pdf";
const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const normalizedFormat = (name: string) => ext(name).startsWith("ppt") ? "pptx" : ext(name).startsWith("doc") ? "docx" : "pdf";
const parsedParts = (value: string) => [...new Set(value.split(/[,;\s]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0))].sort((a,b) => a-b);

export function SalesDocumentStudio() {
  const qc = useQueryClient();
  const { isBigC } = useCurrentRole();
  const [tab, setTab] = useState<"library" | "compose" | "created">("library");
  const [newOpen, setNewOpen] = useState(false);
  const [preview, setPreview] = useState<DeckFile | null>(null);
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [compositionTitle, setCompositionTitle] = useState("");
  const [compositionPurpose, setCompositionPurpose] = useState<DeckPurpose>("generico");
  const [compositionLanguage, setCompositionLanguage] = useState<MarketingLanguage>("es");
  const [busy, setBusy] = useState(false);

  const decksQ = useQuery({ queryKey: ["sales-document-decks"], queryFn: async () => {
    const { data, error } = await (supabase as any).from("marketing_decks").select("*, marketing_deck_files(*)").eq("status", "active").order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Deck[];
  }});
  const compositionsQ = useQuery({ queryKey: ["sales-document-compositions"], queryFn: async () => {
    const { data, error } = await (supabase as any).from("sales_document_compositions").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Composition[];
  }});
  const deckFiles = (deck: Deck): DeckFile[] => deck.marketing_deck_files?.length
    ? deck.marketing_deck_files
    : deck.storage_path
      ? [{ id: `primary-${deck.id}`, deck_id: deck.id, storage_path: deck.storage_path, file_name: deck.storage_path.split("/").pop() ?? deck.title, mime_type: null, size_bytes: null }]
      : [];
  const files = useMemo(() => (decksQ.data ?? []).flatMap((deck) => deckFiles(deck).map((file) => ({ deck, file }))), [decksQ.data]);

  function addToDraft(deck: Deck, file: DeckFile) {
    setDraft((current) => [...current, { key: crypto.randomUUID(), deck, file, selectedParts: "" }]);
    setTab("compose");
  }
  function move(index: number, delta: number) {
    setDraft((current) => { const next = [...current]; const target = index + delta; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; });
  }
  async function saveComposition(generatePdf = false) {
    if (!compositionTitle.trim()) return toast.error("Escribe un nombre para el documento");
    if (!draft.length) return toast.error("Añade al menos un modelo");
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: composition, error } = await (supabase as any).from("sales_document_compositions").insert({ title: compositionTitle.trim(), purpose: compositionPurpose, language: compositionLanguage, status: generatePdf ? "generating" : "draft", created_by: userData.user?.id ?? null }).select("id").single();
      if (error || !composition) throw error ?? new Error("No se pudo guardar");
      const rows = draft.map((item, position) => { const parts = parsedParts(item.selectedParts); return { composition_id: composition.id, source_deck_id: item.deck.id, source_file_id: item.file.id, source_file_name: item.file.file_name ?? "archivo", source_storage_path: item.file.storage_path, source_format: normalizedFormat(item.file.file_name ?? item.file.storage_path), selection_kind: parts.length ? (normalizedFormat(item.file.file_name ?? "") === "pptx" ? "slides" : "pages") : "whole", selected_parts: parts, position, editability: normalizedFormat(item.file.file_name ?? "") === "pdf" ? "flattened" : "editable" }; });
      const { error: itemError } = await (supabase as any).from("sales_document_composition_items").insert(rows);
      if (itemError) throw itemError;
      if (generatePdf) await generatePdfOutput(composition.id, compositionTitle.trim(), draft);
      toast.success(generatePdf ? "PDF combinado creado" : "Borrador guardado");
      setDraft([]); setCompositionTitle(""); setTab("created");
      qc.invalidateQueries({ queryKey: ["sales-document-compositions"] });
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar"); }
    finally { setBusy(false); }
  }
  async function generatePdfOutput(compositionId: string, title: string, items: DraftItem[]) {
    if (items.some((item) => normalizedFormat(item.file.file_name ?? item.file.storage_path) !== "pdf")) {
      await (supabase as any).from("sales_document_compositions").update({ status: "draft", error_message: "La mezcla contiene archivos editables; requiere conversión previa a PDF." }).eq("id", compositionId);
      throw new Error("Para generar un PDF único, convierte primero los archivos PowerPoint o Word a PDF. El borrador se ha conservado.");
    }
    const output = await PDFDocument.create();
    for (const item of items) {
      const url = await signMarketingAsset(item.file.storage_path);
      if (!url) throw new Error(`No se pudo leer ${item.file.file_name ?? "un archivo"}`);
      const source = await PDFDocument.load(await (await fetch(url)).arrayBuffer());
      const requested = parsedParts(item.selectedParts).map((n) => n - 1).filter((n) => n >= 0 && n < source.getPageCount());
      const indices = requested.length ? requested : source.getPageIndices();
      const pages = await output.copyPages(source, indices);
      pages.forEach((page) => output.addPage(page));
    }
    const bytes = await output.save();
    const safe = title.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ._-]+/g, "_");
    const file = new File([bytes as BlobPart], `${safe}.pdf`, { type: "application/pdf" });
    const path = await uploadMarketingAsset("sales-documents/outputs", file);
    await (supabase as any).from("sales_document_outputs").insert({ composition_id: compositionId, format: "pdf", storage_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size });
    await (supabase as any).from("sales_document_compositions").update({ status: "ready", error_message: null }).eq("id", compositionId);
  }
  async function archiveDeck(deck: Deck) {
    if (!confirm(`¿Archivar “${deck.title}”?`)) return;
    const { error } = await (supabase as any).from("marketing_decks").update({ status: "archived" }).eq("id", deck.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["sales-document-decks"] });
  }

  return <div className="mx-auto max-w-[1700px] px-6 py-10">
    <header className="border-b border-border pb-7"><p className="smallcaps text-muted-foreground">Comunicación · Ventas</p><h1 className="mt-1 font-display text-5xl title-caps">Documentos de venta</h1><p className="mt-3 max-w-4xl text-base text-muted-foreground">Modelos por propósito e idioma. Combina documentos completos o páginas concretas sin modificar los originales.</p></header>
    <nav className="my-6 flex flex-wrap gap-2">{([["library","Biblioteca",Files],["compose","Compositor",Layers3],["created","Documentos creados",FilePlus2]] as const).map(([key,label,Icon]) => <Button key={key} variant={tab===key?"default":"outline"} onClick={()=>setTab(key)}><Icon className="mr-2 h-4 w-4"/>{label}{key==="compose"&&draft.length>0?` (${draft.length})`:""}</Button>)}</nav>

    {tab === "library" && <section><div className="mb-5 flex items-center justify-between"><div><h2 className="font-display text-3xl">Biblioteca de modelos</h2><p className="text-muted-foreground">PowerPoint, Word y PDF; clasificados por uso, idioma, versión y audiencia.</p></div>{isBigC&&<Button onClick={()=>setNewOpen(true)}><Plus className="mr-2 h-4 w-4"/>Subir modelo</Button>}</div>
      {decksQ.isLoading ? <p className="py-12 text-center text-muted-foreground">Cargando modelos…</p> : !files.length ? <EmptyLibrary canEdit={isBigC} onAdd={()=>setNewOpen(true)}/> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(decksQ.data??[]).map(deck=><article key={deck.id} className="border border-border bg-card p-5"><div className="flex items-start justify-between gap-4"><div><p className="smallcaps text-muted-foreground">{DECK_PURPOSE_LABEL[deck.purpose]} · {MARKETING_LANGUAGE_LABEL[deck.language]}</p><h3 className="mt-1 font-display text-2xl text-primary">{deck.title}</h3></div><span className="border border-border px-2 py-1 font-mono text-xs uppercase">{deck.format}</span></div><p className="mt-2 min-h-12 text-sm text-muted-foreground">{deck.audience||deck.notes||"Modelo general de venta"}</p><div className="mt-4 space-y-2">{deckFiles(deck).map(file=><div key={file.id} className="flex items-center gap-2 border-t border-border pt-2"><span className="min-w-0 flex-1 truncate text-sm">{file.file_name??"Archivo"}</span><Button size="icon" variant="ghost" title="Previsualizar" onClick={()=>setPreview(file)}><Eye className="h-4 w-4"/></Button><Button size="sm" variant="outline" onClick={()=>addToDraft(deck,file)}><Plus className="mr-1 h-4 w-4"/>Combinar</Button></div>)}</div>{isBigC&&<Button className="mt-3" size="sm" variant="ghost" onClick={()=>archiveDeck(deck)}><Trash2 className="mr-1 h-4 w-4"/>Archivar</Button>}</article>)}</div>}
    </section>}

    {tab === "compose" && <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]"><div><h2 className="font-display text-3xl">Orden del documento</h2><p className="mb-5 text-muted-foreground">Indica páginas o diapositivas separadas por comas. Déjalo vacío para incluir el archivo completo.</p>{!draft.length?<div className="border border-dashed border-border p-12 text-center text-muted-foreground">Añade modelos desde la Biblioteca.</div>:<ol className="space-y-3">{draft.map((item,index)=><li key={item.key} className="grid gap-3 border border-border bg-card p-4 md:grid-cols-[3rem_minmax(0,1fr)_14rem_auto]"><span className="font-display text-3xl text-primary">{index+1}</span><div><div className="font-display text-xl">{item.deck.title}</div><div className="text-sm text-muted-foreground">{item.file.file_name}</div><div className="mt-1 text-xs">{normalizedFormat(item.file.file_name??"")==="pdf"?"Se incorporará como páginas no editables":"Conserva edición si la salida usa su formato original"}</div></div><Input value={item.selectedParts} placeholder="Ej. 1, 3, 5" onChange={e=>setDraft(d=>d.map(x=>x.key===item.key?{...x,selectedParts:e.target.value}:x))}/><div className="flex"><Button size="icon" variant="ghost" title="Subir" onClick={()=>move(index,-1)}><ArrowUp className="h-4 w-4"/></Button><Button size="icon" variant="ghost" title="Bajar" onClick={()=>move(index,1)}><ArrowDown className="h-4 w-4"/></Button><Button size="icon" variant="ghost" title="Quitar" onClick={()=>setDraft(d=>d.filter(x=>x.key!==item.key))}><Trash2 className="h-4 w-4"/></Button></div></li>)}</ol>}</div><aside className="h-fit border border-border bg-card p-5"><h3 className="font-display text-2xl">Nuevo documento</h3><div className="mt-4 space-y-4"><Field label="Nombre"><Input value={compositionTitle} onChange={e=>setCompositionTitle(e.target.value)}/></Field><Field label="Propósito"><select className="h-10 w-full border border-input bg-background px-3" value={compositionPurpose} onChange={e=>setCompositionPurpose(e.target.value as DeckPurpose)}>{DECK_PURPOSES.map(x=><option key={x} value={x}>{DECK_PURPOSE_LABEL[x]}</option>)}</select></Field><Field label="Idioma"><select className="h-10 w-full border border-input bg-background px-3" value={compositionLanguage} onChange={e=>setCompositionLanguage(e.target.value as MarketingLanguage)}>{MARKETING_LANGUAGES.map(x=><option key={x} value={x}>{MARKETING_LANGUAGE_LABEL[x]}</option>)}</select></Field><Button className="w-full" disabled={busy||!isBigC} onClick={()=>saveComposition(false)}><Save className="mr-2 h-4 w-4"/>Guardar borrador</Button><Button className="w-full" variant="outline" disabled={busy||!isBigC||draft.some(x=>normalizedFormat(x.file.file_name??x.file.storage_path)!=="pdf")} onClick={()=>saveComposition(true)}><Download className="mr-2 h-4 w-4"/>Crear PDF</Button>{draft.some(x=>normalizedFormat(x.file.file_name??x.file.storage_path)!=="pdf")&&<p className="text-xs text-muted-foreground">Las mezclas con PowerPoint o Word se guardan como borrador hasta convertir sus partes a PDF.</p>}</div></aside></section>}

    {tab === "created" && <section><h2 className="font-display text-3xl">Documentos creados</h2><div className="mt-5 overflow-hidden border border-border"><table className="w-full text-left"><thead className="bg-muted/40"><tr><th className="p-3">Documento</th><th className="p-3">Propósito</th><th className="p-3">Idioma</th><th className="p-3">Estado</th><th className="p-3">Fecha</th></tr></thead><tbody>{(compositionsQ.data??[]).map(c=><tr key={c.id} className="border-t border-border"><td className="p-3 font-display">{c.title}</td><td className="p-3">{DECK_PURPOSE_LABEL[c.purpose]}</td><td className="p-3">{MARKETING_LANGUAGE_LABEL[c.language]}</td><td className="p-3">{c.status}</td><td className="p-3">{new Date(c.created_at).toLocaleDateString("es-ES")}</td></tr>)}</tbody></table>{!compositionsQ.data?.length&&<p className="p-10 text-center text-muted-foreground">Todavía no hay documentos creados.</p>}</div></section>}
    <NewDeckDialog open={newOpen} onClose={()=>setNewOpen(false)} onSaved={()=>qc.invalidateQueries({queryKey:["sales-document-decks"]})}/><PreviewDialog file={preview} onClose={()=>setPreview(null)}/>
  </div>;
}

function Field({label,children}:{label:string;children:React.ReactNode}) { return <div><Label className="mb-1 block">{label}</Label>{children}</div>; }
function EmptyLibrary({canEdit,onAdd}:{canEdit:boolean;onAdd:()=>void}) { return <div className="border border-dashed border-border p-14 text-center"><Files className="mx-auto h-10 w-10 text-primary"/><h3 className="mt-3 font-display text-2xl">Sin modelos todavía</h3><p className="mt-1 text-muted-foreground">Sube el primer documento de venta.</p>{canEdit&&<Button className="mt-5" onClick={onAdd}><Upload className="mr-2 h-4 w-4"/>Subir modelo</Button>}</div>; }
function NewDeckDialog({open,onClose,onSaved}:{open:boolean;onClose:()=>void;onSaved:()=>void}) {
  const [title,setTitle]=useState(""); const [purpose,setPurpose]=useState<DeckPurpose>("generico"); const [language,setLanguage]=useState<MarketingLanguage>("es"); const [audience,setAudience]=useState(""); const [version,setVersion]=useState("1.0"); const [notes,setNotes]=useState(""); const [tags,setTags]=useState(""); const [file,setFile]=useState<File|null>(null); const [busy,setBusy]=useState(false);
  async function submit(){if(!title.trim()||!file)return toast.error("Nombre y archivo son obligatorios");setBusy(true);let path:string|null=null;try{path=await uploadMarketingAsset("sales-documents/models",file);const format=normalizedFormat(file.name);const {data:deck,error}=await (supabase as any).from("marketing_decks").insert({title:title.trim(),purpose,language,audience:audience.trim()||null,version:version.trim()||null,notes:notes.trim()||null,tags:tags.split(",").map(x=>x.trim()).filter(Boolean),format,storage_path:path}).select("id").single();if(error||!deck)throw error??new Error("No se pudo crear el modelo");const {error:fileError}=await (supabase as any).from("marketing_deck_files").insert({deck_id:deck.id,storage_path:path,file_name:file.name,mime_type:file.type||null,size_bytes:file.size});if(fileError)throw fileError;toast.success("Modelo añadido");onSaved();onClose();setTitle("");setFile(null);}catch(error){if(path)await deleteMarketingAsset(path).catch(()=>{});toast.error(error instanceof Error?error.message:"No se pudo subir");}finally{setBusy(false)}}
  return <Dialog open={open} onOpenChange={v=>{if(!v)onClose()}}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Subir modelo de venta</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre *"><Input value={title} onChange={e=>setTitle(e.target.value)}/></Field><Field label="Archivo *"><Input type="file" accept={ACCEPT} onChange={e=>setFile(e.target.files?.[0]??null)}/></Field><Field label="Propósito *"><select className="h-10 w-full border border-input bg-background px-3" value={purpose} onChange={e=>setPurpose(e.target.value as DeckPurpose)}>{DECK_PURPOSES.map(x=><option key={x} value={x}>{DECK_PURPOSE_LABEL[x]}</option>)}</select></Field><Field label="Idioma *"><select className="h-10 w-full border border-input bg-background px-3" value={language} onChange={e=>setLanguage(e.target.value as MarketingLanguage)}>{MARKETING_LANGUAGES.map(x=><option key={x} value={x}>{MARKETING_LANGUAGE_LABEL[x]}</option>)}</select></Field><Field label="Audiencia"><Input value={audience} onChange={e=>setAudience(e.target.value)}/></Field><Field label="Versión"><Input value={version} onChange={e=>setVersion(e.target.value)}/></Field><Field label="Etiquetas"><Input value={tags} onChange={e=>setTags(e.target.value)} placeholder="cine, premium, plataformas"/></Field><div className="sm:col-span-2"><Field label="Notas"><Textarea value={notes} onChange={e=>setNotes(e.target.value)}/></Field></div></div><Button onClick={submit} disabled={busy}>{busy?"Subiendo…":"Crear modelo"}</Button></DialogContent></Dialog>;
}
function PreviewDialog({file,onClose}:{file:DeckFile|null;onClose:()=>void}) { const [url,setUrl]=useState<string|null>(null); useEffect(()=>{let active=true;setUrl(null);if(file)signMarketingAsset(file.storage_path).then(value=>{if(active)setUrl(value)});return()=>{active=false}},[file]); if(!file)return null; const name=file.file_name??"Archivo"; const format=normalizedFormat(name); const src=format==="pdf"?url:url?`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`:null; return <Dialog open onOpenChange={v=>{if(!v)onClose()}}><DialogContent className="max-w-5xl"><DialogHeader><DialogTitle>{name}</DialogTitle></DialogHeader><div className="h-[70vh] border border-border">{src?<iframe className="h-full w-full" src={src} title={name}/>:<div className="grid h-full place-items-center text-muted-foreground">Preparando previsualización…</div>}</div>{url&&<Button asChild><a href={url} download={name}><Download className="mr-2 h-4 w-4"/>Descargar original</a></Button>}</DialogContent></Dialog>; }

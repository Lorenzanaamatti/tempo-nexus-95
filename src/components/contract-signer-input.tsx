import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export type SignerValue = {
  signer_composer_id: string | null;
  signer_person_id: string | null;
  signer_name: string;
};

interface Props {
  value: SignerValue;
  onChange: (v: SignerValue) => void;
}

/**
 * Firmante: busca un representado (compositor) o una persona del CRM,
 * o escribe texto libre. Si se vincula, muestra un chip identificativo.
 */
export function ContractSignerInput({ value, onChange }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const composersQ = useQuery({
    queryKey: ["composers-signer-mini"],
    queryFn: async () => {
      const { data } = await supabase
        .from("composers")
        .select("id, full_name, artistic_name")
        .order("full_name");
      return data ?? [];
    },
  });

  const peopleQ = useQuery({
    queryKey: ["people-signer-mini"],
    queryFn: async () => {
      const { data } = await supabase.from("people").select("id, full_name, role").order("full_name");
      return data ?? [];
    },
  });

  // Resolve linked entity label
  const linkedLabel = useMemo(() => {
    if (value.signer_composer_id) {
      const c = (composersQ.data ?? []).find((x: any) => x.id === value.signer_composer_id);
      return c ? `Representado · ${c.artistic_name || c.full_name}` : "Representado";
    }
    if (value.signer_person_id) {
      const p = (peopleQ.data ?? []).find((x: any) => x.id === value.signer_person_id);
      return p ? `CRM · ${p.full_name}` : "CRM";
    }
    return null;
  }, [value, composersQ.data, peopleQ.data]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const matches = useMemo(() => {
    const needle = (q || value.signer_name).trim().toLowerCase();
    if (!needle) return { composers: [], people: [] };
    const composers = (composersQ.data ?? [])
      .filter((c: any) =>
        [c.full_name, c.artistic_name].some((s) => (s || "").toLowerCase().includes(needle)),
      )
      .slice(0, 5);
    const people = (peopleQ.data ?? [])
      .filter((p: any) => (p.full_name || "").toLowerCase().includes(needle))
      .slice(0, 5);
    return { composers, people };
  }, [q, value.signer_name, composersQ.data, peopleQ.data]);

  function clearLink() {
    onChange({ signer_composer_id: null, signer_person_id: null, signer_name: value.signer_name });
  }

  function pickComposer(c: any) {
    onChange({
      signer_composer_id: c.id,
      signer_person_id: null,
      signer_name: c.artistic_name || c.full_name,
    });
    setQ("");
    setOpen(false);
  }
  function pickPerson(p: any) {
    onChange({
      signer_composer_id: null,
      signer_person_id: p.id,
      signer_name: p.full_name,
    });
    setQ("");
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <Input
        value={value.signer_name}
        placeholder="Nombre del firmante · busca un representado o persona del CRM"
        onChange={(e) => {
          setQ(e.target.value);
          onChange({ ...value, signer_name: e.target.value, signer_composer_id: null, signer_person_id: null });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {linkedLabel && (
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="secondary" className="rounded-sm text-[10px] smallcaps">{linkedLabel}</Badge>
          <button type="button" onClick={clearLink} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <X className="h-3 w-3" /> desvincular
          </button>
        </div>
      )}
      {open && (matches.composers.length > 0 || matches.people.length > 0) && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-sm border border-border bg-popover shadow-lg">
          {matches.composers.length > 0 && (
            <li className="px-3 py-1 smallcaps text-[10px] text-muted-foreground bg-muted/40">Representados</li>
          )}
          {matches.composers.map((c: any) => (
            <li key={`c-${c.id}`}>
              <button type="button" onClick={() => pickComposer(c)} className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted">
                <span className="text-sm">{c.artistic_name || c.full_name}</span>
                {c.artistic_name && <span className="text-[10px] text-muted-foreground">{c.full_name}</span>}
              </button>
            </li>
          ))}
          {matches.people.length > 0 && (
            <li className="px-3 py-1 smallcaps text-[10px] text-muted-foreground bg-muted/40">CRM · Personas</li>
          )}
          {matches.people.map((p: any) => (
            <li key={`p-${p.id}`}>
              <button type="button" onClick={() => pickPerson(p)} className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted">
                <span className="text-sm">{p.full_name}</span>
                <span className="text-[10px] text-muted-foreground">{p.role}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
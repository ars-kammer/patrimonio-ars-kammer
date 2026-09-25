import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const BUCKET = "patrimonio";

/**
 * Foto de celular chega com 4–8 MB. Reduz para 1280px em JPEG antes de subir:
 * cabe no limite do bucket e a lista carrega rápido no 4G da obra.
 */
async function comprimir(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao processar a foto."))), "image/jpeg", 0.82),
  );
}

export async function enviarFoto(arquivo: File): Promise<string> {
  const blob = await comprimir(arquivo);
  const caminho = `itens/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return caminho;
}

export async function removerFoto(caminho: string) {
  await supabase.storage.from(BUCKET).remove([caminho]);
}

/** URLs assinadas de todas as fotos de uma vez (bucket privado). */
export function useFotos(caminhos: (string | null)[]) {
  const lista = [...new Set(caminhos.filter((c): c is string => !!c))].sort();
  return useQuery({
    queryKey: ["pat", "fotos", lista],
    enabled: lista.length > 0,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(lista, 3600);
      if (error) throw error;
      const mapa: Record<string, string> = {};
      for (const d of data ?? []) if (d.path && d.signedUrl) mapa[d.path] = d.signedUrl;
      return mapa;
    },
  });
}

import { readApiResponse } from "./api-response";
export async function api<T = any>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api/" + path, {
      method,
      headers: data ? { "Content-Type": "application/json" } : undefined,
      body: data ? JSON.stringify(data) : undefined,
    });
  } catch {
    throw new Error(
      "Could not reach FormChat. Check your connection and try again. Your input has been kept.",
    );
  }
  return readApiResponse<T>(res);
}
export async function upload(file: File) {
  if (
    file.size > 8_000_000 ||
    !["image/png", "image/jpeg", "image/webp"].includes(file.type)
  )
    throw new Error("Choose a PNG, JPEG or WebP under 8 MB.");
  const bitmap = await createImageBitmap(file);
  if (bitmap.width > 12000 || bitmap.height > 12000) {
    bitmap.close();
    throw new Error("Choose an image smaller than 12,000 pixels.");
  }
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, "image/webp", 0.82),
  );
  if (!blob) throw new Error("Could not read this image.");
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "image/webp" },
    body: blob,
  });
  const data: any = await readApiResponse(res);
  return data.url as string;
}
export async function copy(text: string) {
  await navigator.clipboard.writeText(text);
}

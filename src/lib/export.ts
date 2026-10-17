export function download(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportPng(svg: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" }),
    url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = image.naturalWidth * scale;
    canvas.height = image.naturalHeight * scale;
    if (canvas.height > 12000) throw new Error("Image too tall");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG unavailable"))),
        "image/png",
      ),
    );
    return png;
  } finally {
    URL.revokeObjectURL(url);
  }
}

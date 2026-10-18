interface CaptureTarget {
  renderer: {
    getPixelRatio(): number;
    setPixelRatio(ratio: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
  };
  canvas: Pick<HTMLCanvasElement, "toBlob">;
  viewport(): { width: number; height: number };
  render(): void;
  isDisposed(): boolean;
  invalidate(): void;
}

export async function captureThreePng(target: CaptureTarget): Promise<Blob> {
  if (target.isDisposed()) throw new Error("3D view unavailable");
  const pixelRatio = target.renderer.getPixelRatio();
  try {
    target.renderer.setPixelRatio(2);
    const { width, height } = target.viewport();
    target.renderer.setSize(width, height, false);
    target.render();
    return await new Promise<Blob>((resolve, reject) => {
      target.canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG unavailable"))),
        "image/png",
      );
    });
  } finally {
    // Encoding may finish after unmount. Never revive a disposed renderer.
    if (!target.isDisposed()) {
      target.renderer.setPixelRatio(pixelRatio);
      const { width, height } = target.viewport();
      target.renderer.setSize(width, height);
      target.invalidate();
    }
  }
}

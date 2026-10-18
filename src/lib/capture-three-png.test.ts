import { expect, it, vi } from "vitest";
import { captureThreePng } from "./capture-three-png";

function target() {
  let callback: BlobCallback | undefined;
  const renderer = {
    getPixelRatio: vi.fn(() => 1.25),
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
  };
  const output = {
    renderer,
    canvas: {
      toBlob: vi.fn((next: BlobCallback) => {
        callback = next;
      }),
    },
    viewport: vi.fn(() => ({ width: 800, height: 600 })),
    render: vi.fn(),
    isDisposed: vi.fn(() => false),
    invalidate: vi.fn(),
  };
  return { output, encode: (blob: Blob | null) => callback!(blob) };
}

it("captures at export resolution and restores the latest viewport on success", async () => {
  const { output, encode } = target();
  const pending = captureThreePng(output);
  expect(output.renderer.setPixelRatio).toHaveBeenCalledWith(2);
  expect(output.renderer.setSize).toHaveBeenCalledWith(800, 600, false);
  expect(output.render).toHaveBeenCalledOnce();
  output.viewport.mockReturnValue({ width: 640, height: 480 });
  const blob = new Blob(["png"], { type: "image/png" });
  encode(blob);
  expect(await pending).toBe(blob);
  expect(output.renderer.setPixelRatio).toHaveBeenLastCalledWith(1.25);
  expect(output.renderer.setSize).toHaveBeenLastCalledWith(640, 480);
  expect(output.invalidate).toHaveBeenCalledOnce();
});

it("restores interactive DPR and dimensions when the encoder fails", async () => {
  const { output, encode } = target();
  const pending = captureThreePng(output);
  const result = expect(pending).rejects.toThrow("PNG unavailable");
  encode(null);
  await result;
  expect(output.renderer.setPixelRatio).toHaveBeenLastCalledWith(1.25);
  expect(output.renderer.setSize).toHaveBeenLastCalledWith(800, 600);
  expect(output.invalidate).toHaveBeenCalledOnce();
});

it("restores interactive resolution when encoding throws synchronously", async () => {
  const { output } = target();
  output.canvas.toBlob.mockImplementation(() => {
    throw new Error("Encoder unavailable");
  });
  await expect(captureThreePng(output)).rejects.toThrow("Encoder unavailable");
  expect(output.renderer.setPixelRatio).toHaveBeenLastCalledWith(1.25);
  expect(output.renderer.setSize).toHaveBeenLastCalledWith(800, 600);
});

it("does not touch a disposed renderer when encoding finishes late", async () => {
  const { output, encode } = target();
  const pending = captureThreePng(output);
  output.isDisposed.mockReturnValue(true);
  encode(new Blob(["png"]));
  await pending;
  expect(output.renderer.setPixelRatio).toHaveBeenCalledTimes(1);
  expect(output.renderer.setSize).toHaveBeenCalledTimes(1);
  expect(output.invalidate).not.toHaveBeenCalled();
  await expect(captureThreePng(output)).rejects.toThrow("3D view unavailable");
  expect(output.renderer.getPixelRatio).toHaveBeenCalledTimes(1);
});

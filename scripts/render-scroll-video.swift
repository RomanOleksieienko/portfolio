import AppKit
import AVFoundation
import CoreVideo

guard CommandLine.arguments.count >= 3 else {
  fputs("Usage: render-scroll-video.swift <frames-dir> <output.mp4> [fps]\n", stderr)
  exit(2)
}

let framesDirectory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
let fps = Int32(CommandLine.arguments.count > 3 ? CommandLine.arguments[3] : "12") ?? 12
let fileManager = FileManager.default

let frameURLs = try fileManager.contentsOfDirectory(
  at: framesDirectory,
  includingPropertiesForKeys: nil
).filter { $0.pathExtension.lowercased() == "png" }.sorted { $0.lastPathComponent < $1.lastPathComponent }

guard let firstURL = frameURLs.first,
      let firstImage = NSImage(contentsOf: firstURL),
      let firstCGImage = firstImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
  fputs("No readable PNG frames found.\n", stderr)
  exit(3)
}

let width = firstCGImage.width
let height = firstCGImage.height
try? fileManager.removeItem(at: outputURL)

let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
let input = AVAssetWriterInput(
  mediaType: .video,
  outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
      AVVideoAverageBitRateKey: 4_500_000,
      AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
    ]
  ]
)
input.expectsMediaDataInRealTime = false

let adaptor = AVAssetWriterInputPixelBufferAdaptor(
  assetWriterInput: input,
  sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height
  ]
)

guard writer.canAdd(input) else {
  fputs("Cannot add video input.\n", stderr)
  exit(4)
}
writer.add(input)

func makePixelBuffer(from image: CGImage) -> CVPixelBuffer? {
  var buffer: CVPixelBuffer?
  let attributes = [
    kCVPixelBufferCGImageCompatibilityKey: true,
    kCVPixelBufferCGBitmapContextCompatibilityKey: true
  ] as CFDictionary
  let status = CVPixelBufferCreate(
    kCFAllocatorDefault,
    width,
    height,
    kCVPixelFormatType_32BGRA,
    attributes,
    &buffer
  )
  guard status == kCVReturnSuccess, let pixelBuffer = buffer else { return nil }

  CVPixelBufferLockBaseAddress(pixelBuffer, [])
  defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }

  guard let context = CGContext(
    data: CVPixelBufferGetBaseAddress(pixelBuffer),
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue
  ) else { return nil }

  context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
  return pixelBuffer
}

guard writer.startWriting() else {
  fputs("Could not start writer: \(writer.error?.localizedDescription ?? "unknown error")\n", stderr)
  exit(5)
}
writer.startSession(atSourceTime: .zero)

for (index, url) in frameURLs.enumerated() {
  while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.003) }
  guard let image = NSImage(contentsOf: url),
        let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil),
        let pixelBuffer = makePixelBuffer(from: cgImage) else {
    fputs("Could not decode \(url.lastPathComponent).\n", stderr)
    exit(6)
  }
  let presentationTime = CMTime(value: Int64(index), timescale: fps)
  guard adaptor.append(pixelBuffer, withPresentationTime: presentationTime) else {
    fputs("Could not append frame \(index).\n", stderr)
    exit(7)
  }
}

input.markAsFinished()
let semaphore = DispatchSemaphore(value: 0)
writer.finishWriting { semaphore.signal() }
semaphore.wait()

guard writer.status == .completed else {
  fputs("Encoding failed: \(writer.error?.localizedDescription ?? "unknown error")\n", stderr)
  exit(8)
}

print(outputURL.path)

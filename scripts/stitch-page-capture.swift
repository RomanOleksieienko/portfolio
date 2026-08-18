import AppKit
import Foundation

struct Strip: Decodable {
  let file: String
  let dest: Int
  let sourceY: Int
  let sourceBottom: Int
}

struct Manifest: Decodable {
  let width: Int
  let height: Int
  let viewportHeight: Int
  let cropRight: Int
  let strips: [Strip]
}

guard CommandLine.arguments.count == 4 else {
  fputs("Usage: stitch-page-capture.swift <strips-dir> <manifest.json> <output.png>\n", stderr)
  exit(2)
}

let stripsDirectory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let manifestURL = URL(fileURLWithPath: CommandLine.arguments[2])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[3])
let manifest = try JSONDecoder().decode(Manifest.self, from: Data(contentsOf: manifestURL))

guard let bitmap = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: manifest.width,
  pixelsHigh: manifest.height,
  bitsPerSample: 8,
  samplesPerPixel: 4,
  hasAlpha: true,
  isPlanar: false,
  colorSpaceName: .deviceRGB,
  bytesPerRow: 0,
  bitsPerPixel: 0
), let graphics = NSGraphicsContext(bitmapImageRep: bitmap) else {
  fputs("Could not allocate the output bitmap.\n", stderr)
  exit(3)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = graphics
graphics.imageInterpolation = .high
NSColor.black.setFill()
NSRect(x: 0, y: 0, width: manifest.width, height: manifest.height).fill()

let cleanWidth = manifest.width - manifest.cropRight

for strip in manifest.strips {
  let fileURL = stripsDirectory.appendingPathComponent(strip.file)
  guard let image = NSImage(contentsOf: fileURL) else {
    fputs("Could not read \(strip.file).\n", stderr)
    exit(4)
  }

  let availableSourceHeight = max(0, strip.sourceBottom - strip.sourceY)
  let availableDestinationHeight = max(0, manifest.height - strip.dest)
  let sliceHeight = min(availableSourceHeight, availableDestinationHeight)
  if sliceHeight == 0 { continue }

  let sourceYFromBottom = manifest.viewportHeight - strip.sourceY - sliceHeight
  let destinationYFromBottom = manifest.height - strip.dest - sliceHeight
  let sourceRect = NSRect(x: 0, y: sourceYFromBottom, width: cleanWidth, height: sliceHeight)
  let destinationRect = NSRect(x: 0, y: destinationYFromBottom, width: cleanWidth, height: sliceHeight)
  image.draw(in: destinationRect, from: sourceRect, operation: .copy, fraction: 1)

  if manifest.cropRight > 0 {
    let edgeSource = NSRect(x: cleanWidth - 1, y: sourceYFromBottom, width: 1, height: sliceHeight)
    let edgeDestination = NSRect(x: cleanWidth, y: destinationYFromBottom, width: manifest.cropRight, height: sliceHeight)
    image.draw(in: edgeDestination, from: edgeSource, operation: .copy, fraction: 1)
  }
}

NSGraphicsContext.restoreGraphicsState()

let wantsJPEG = ["jpg", "jpeg"].contains(outputURL.pathExtension.lowercased())
let fileType: NSBitmapImageRep.FileType = wantsJPEG ? .jpeg : .png
let properties: [NSBitmapImageRep.PropertyKey: Any] = wantsJPEG ? [.compressionFactor: 0.9] : [:]

guard let outputData = bitmap.representation(using: fileType, properties: properties) else {
  fputs("Could not encode the stitched image.\n", stderr)
  exit(5)
}

try outputData.write(to: outputURL, options: .atomic)
print(outputURL.path)

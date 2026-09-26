import AppKit
import Foundation
import Vision

let path = CommandLine.arguments.dropFirst().first ?? ""
let url = URL(fileURLWithPath: path)
guard
  let data = try? Data(contentsOf: url),
  let image = NSImage(data: data),
  let tiff = image.tiffRepresentation,
  let bitmap = NSBitmapImageRep(data: tiff),
  let cgImage = bitmap.cgImage
else {
  fputs("unreadable\n", stderr)
  exit(2)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
do {
  try handler.perform([request])
} catch {
  fputs("ocr failed\n", stderr)
  exit(3)
}

let lines = request.results?.compactMap { observation in
  observation.topCandidates(1).first?.string
} ?? []
print(lines.joined(separator: "\n"))

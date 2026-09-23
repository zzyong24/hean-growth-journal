import UIKit
import AVFoundation
import Photos
import React

@objc(HeanCamera)
final class HeanCamera: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { true }
  private var active = false
  @objc func capture(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard !self.active, let presenter = RCTPresentedViewController() else { reject("CAMERA_BUSY", "Camera unavailable", nil); return }
      self.active = true
      let camera = HeanCaptureController()
      camera.modalPresentationStyle = .fullScreen
      camera.finished = { result in
        camera.finished = nil
        camera.dismiss(animated: true) { self.active = false; resolve(result) }
      }
      presenter.present(camera, animated: true)
    }
  }
}

// One capture processor owns both resources until AVCapturePhotoOutput finishes.
private final class HeanCaptureController: UIViewController, AVCapturePhotoCaptureDelegate, AVCaptureFileOutputRecordingDelegate {
  let session = AVCaptureSession()
  let output = AVCapturePhotoOutput()
  let videoOutput = AVCaptureMovieFileOutput()
  let queue = DispatchQueue(label: "cloud.aitongban.hean.camera")
  var preview: AVCaptureVideoPreviewLayer!
  var finished: (([String: Any]) -> Void)?
  let shutter = UIButton(type: .system)
  let closeButton = UIButton(type: .system)
  let liveButton = UIButton(type: .system)
  let status = UILabel()
  var wantsLive = true
  var photoData: Data?
  var movieURL: URL?
  var captureError: Error?
  var capturing = false
  var capturedAt = Date()
  // Access these two flags only on the capture queue, including delegate callbacks.
  var videoRequested = false
  var stopRequested = false
  override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }
  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .black
    preview = AVCaptureVideoPreviewLayer(session: session)
    preview.videoGravity = .resizeAspect
    view.layer.addSublayer(preview)
    closeButton.setImage(UIImage(systemName: "xmark"), for: .normal)
    closeButton.tintColor = .white
    closeButton.accessibilityLabel = "关闭相机"
    closeButton.addTarget(self, action: #selector(cancel), for: .touchUpInside)
    liveButton.setTitle("实况 开", for: .normal)
    liveButton.tintColor = .systemYellow
    liveButton.addTarget(self, action: #selector(toggleLive), for: .touchUpInside)
    shutter.backgroundColor = .white
    shutter.layer.cornerRadius = 36
    shutter.layer.borderWidth = 5
    shutter.layer.borderColor = UIColor.lightGray.cgColor
    shutter.accessibilityLabel = "录制，轻点拍照，长按录像"
    shutter.isEnabled = false
    shutter.addTarget(self, action: #selector(takePhoto), for: .touchUpInside)
    let hold = UILongPressGestureRecognizer(target: self, action: #selector(holdShutter(_:)))
    hold.minimumPressDuration = 0.35
    hold.allowableMovement = 120
    hold.cancelsTouchesInView = true
    shutter.addGestureRecognizer(hold)
    shutter.accessibilityCustomActions = [UIAccessibilityCustomAction(name: "开始录像", target: self, selector: #selector(accessibleVideo))]
    status.textColor = .white
    status.textAlignment = .center
    status.font = .systemFont(ofSize: 14)
    status.text = "轻点拍照 · 长按录像，松开结束"
    [closeButton, liveButton, shutter, status].forEach(view.addSubview)
    NotificationCenter.default.addObserver(self, selector: #selector(interrupted), name: .AVCaptureSessionWasInterrupted, object: session)
    queue.async { self.configure() }
  }
  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    let top = view.safeAreaInsets.top
    preview.frame = CGRect(x: 0, y: top + 60, width: view.bounds.width, height: max(100, view.bounds.height - top - 220))
    closeButton.frame = CGRect(x: 20, y: top, width: 44, height: 44)
    liveButton.frame = CGRect(x: view.bounds.width - 120, y: top, width: 100, height: 44)
    shutter.frame = CGRect(x: (view.bounds.width - 72) / 2, y: view.bounds.height - view.safeAreaInsets.bottom - 100, width: 72, height: 72)
    status.frame = CGRect(x: 10, y: shutter.frame.minY - 42, width: view.bounds.width - 20, height: 30)
  }
  override func viewDidDisappear(_ animated: Bool) {
    super.viewDidDisappear(animated)
    queue.async { if self.session.isRunning { self.session.stopRunning() } }
  }
  deinit { NotificationCenter.default.removeObserver(self) }
  @objc func interrupted() {
    queue.async { self.stopRequested = true; if self.videoOutput.isRecording { self.videoOutput.stopRecording() } }
    DispatchQueue.main.async { self.status.text = "相机被中断，正在保留已录内容" }
  }
  func configure() {
    do {
      guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else { throw NSError(domain: "Camera", code: 1) }
      let input = try AVCaptureDeviceInput(device: device)
      session.beginConfiguration()
      session.sessionPreset = .photo
      guard session.canAddInput(input), session.canAddOutput(output) else { session.commitConfiguration(); throw NSError(domain: "Camera", code: 2) }
      session.addInput(input)
      session.addOutput(output)
      if AVCaptureDevice.authorizationStatus(for: .audio) == .authorized,
         let mic = AVCaptureDevice.default(for: .audio), let audio = try? AVCaptureDeviceInput(device: mic), session.canAddInput(audio) { session.addInput(audio) }
      session.commitConfiguration()
      output.isLivePhotoCaptureEnabled = output.isLivePhotoCaptureSupported
      if let c = output.connection(with: .video) {
        if #available(iOS 17.0, *) { if c.isVideoRotationAngleSupported(90) { c.videoRotationAngle = 90 } }
        else { c.videoOrientation = .portrait }
      }
      try device.lockForConfiguration()
      if device.hasTorch { device.torchMode = .off }
      device.unlockForConfiguration()
      session.startRunning()
      DispatchQueue.main.async {
        self.wantsLive = self.output.isLivePhotoCaptureEnabled
        self.liveButton.isEnabled = self.wantsLive
        self.liveButton.setTitle(self.wantsLive ? "实况 开" : "实况不可用", for: .normal)
        self.shutter.isEnabled = true
      }
    } catch { DispatchQueue.main.async { self.status.text = "相机暂不可用，请关闭后重试" } }
  }
  @objc func toggleLive() {
    wantsLive.toggle()
    liveButton.setTitle(wantsLive ? "实况 开" : "实况 关", for: .normal)
    liveButton.tintColor = wantsLive ? .systemYellow : .white
  }
  @objc func cancel() { guard !capturing else { return }; finished?(["canceled": true]) }
  @objc func accessibleVideo() -> Bool { beginVideo(); return true }
  @objc func holdShutter(_ gesture: UILongPressGestureRecognizer) {
    if gesture.state == .began { beginVideo() }
    else if [.ended, .cancelled, .failed].contains(gesture.state) { endVideo() }
  }
  func beginVideo() {
    guard !capturing else { return }
    capturing = true; capturedAt = Date()
    closeButton.isEnabled = false; liveButton.isEnabled = false
    shutter.backgroundColor = .systemRed
    shutter.accessibilityCustomActions = [UIAccessibilityCustomAction(name: "结束录像", target: self, selector: #selector(accessibleEndVideo))]
    status.text = "正在录像 · 松开结束（最长 60 秒）"
    queue.async {
      self.videoRequested = true; self.stopRequested = false
      // Movie output disables Live Photo support. Add it only for a held shutter.
      self.session.beginConfiguration()
      self.output.isLivePhotoCaptureEnabled = false
      self.session.sessionPreset = .high
      guard self.session.canAddOutput(self.videoOutput) else {
        self.session.commitConfiguration(); self.restorePhotoMode(); return
      }
      self.session.addOutput(self.videoOutput)
      self.session.commitConfiguration()
      if let connection = self.videoOutput.connection(with: .video) {
        if #available(iOS 17.0, *) { if connection.isVideoRotationAngleSupported(90) { connection.videoRotationAngle = 90 } }
        else { connection.videoOrientation = .portrait }
        if self.videoOutput.availableVideoCodecTypes.contains(.h264) { self.videoOutput.setOutputSettings([AVVideoCodecKey: AVVideoCodecType.h264], for: connection) }
      }
      self.videoOutput.maxRecordedDuration = CMTime(seconds: 60, preferredTimescale: 600)
      let file = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".mov")
      self.videoOutput.startRecording(to: file, recordingDelegate: self)
    }
  }
  @objc func accessibleEndVideo() -> Bool { endVideo(); return true }
  func endVideo() {
    queue.async {
      guard self.videoRequested else { return }
      self.stopRequested = true
      if self.videoOutput.isRecording { self.videoOutput.stopRecording() }
    }
  }
  func fileOutput(_ output: AVCaptureFileOutput, didStartRecordingTo fileURL: URL, from connections: [AVCaptureConnection]) {
    queue.async { if self.stopRequested && self.videoOutput.isRecording { self.videoOutput.stopRecording() } }
  }
  func restorePhotoMode() {
    videoRequested = false; stopRequested = false
    session.beginConfiguration()
    if session.outputs.contains(videoOutput) { session.removeOutput(videoOutput) }
    session.sessionPreset = .photo
    session.commitConfiguration()
    output.isLivePhotoCaptureEnabled = output.isLivePhotoCaptureSupported
    DispatchQueue.main.async {
      self.capturing = false; self.shutter.backgroundColor = .white; self.shutter.isEnabled = true
      self.closeButton.isEnabled = true; self.liveButton.isEnabled = self.output.isLivePhotoCaptureEnabled
      self.shutter.accessibilityCustomActions = [UIAccessibilityCustomAction(name: "开始录像", target: self, selector: #selector(self.accessibleVideo))]
      self.status.text = "录像未完成，请重试 · 轻点拍照，长按录像"
    }
  }
  func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo fileURL: URL, from connections: [AVCaptureConnection], error: Error?) {
    let successful = error == nil || (error as NSError?)?.userInfo[AVErrorRecordingSuccessfullyFinishedKey] as? Bool == true
    guard successful else { try? FileManager.default.removeItem(at: fileURL); queue.async { self.restorePhotoMode() }; return }
    DispatchQueue.main.async { self.shutter.isEnabled = false; self.status.text = "正在保存…" }
    let at = ISO8601DateFormatter().string(from: capturedAt)
    Task {
      let asset = AVURLAsset(url: fileURL)
      guard let duration = try? await asset.load(.duration), duration.seconds.isFinite, duration.seconds > 0,
            let track = try? await asset.loadTracks(withMediaType: .video).first,
            let size = try? await track.load(.naturalSize), let transform = try? await track.load(.preferredTransform) else {
        try? FileManager.default.removeItem(at: fileURL); queue.async { self.restorePhotoMode() }; return
      }
      let dimensions = size.applying(transform)
      let deliver: (Bool) -> Void = { saved in
        let result: [String: Any] = ["uri": fileURL.absoluteString, "type": "video", "mimeType": "video/quicktime", "width": abs(dimensions.width), "height": abs(dimensions.height), "duration": duration.seconds * 1000, "capturedAt": at]
        DispatchQueue.main.async { self.finished?(["canceled": false, "assets": [result], "savedToLibrary": saved]) }
      }
      PHPhotoLibrary.requestAuthorization(for: .addOnly) { permission in
        guard permission == .authorized || permission == .limited else { deliver(false); return }
        PHPhotoLibrary.shared().performChanges({ PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: fileURL) }) { saved, _ in deliver(saved) }
      }
    }
  }
  @objc func takePhoto() {
    guard !capturing else { return }
    capturing = true; capturedAt = Date(); shutter.isEnabled = false; closeButton.isEnabled = false; liveButton.isEnabled = false
    status.text = "拍摄中…"
    let live = wantsLive
    queue.async {
      self.photoData = nil; self.movieURL = nil; self.captureError = nil
      let settings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.jpeg])
      settings.flashMode = .off
      if live && self.output.isLivePhotoCaptureEnabled && !self.output.isLivePhotoCaptureSuspended {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".mov")
        self.movieURL = url
        settings.livePhotoMovieFileURL = url
      }
      self.output.capturePhoto(with: settings, delegate: self)
    }
  }
  func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
    if let error { captureError = error }; photoData = photo.fileDataRepresentation()
  }
  func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingLivePhotoToMovieFileAt url: URL, duration: CMTime, photoDisplayTime: CMTime, resolvedSettings: AVCaptureResolvedPhotoSettings, error: Error?) {
    if let error { captureError = error }
  }
  func photoOutput(_ output: AVCapturePhotoOutput, didFinishCaptureFor resolvedSettings: AVCaptureResolvedPhotoSettings, error: Error?) {
    guard error == nil, captureError == nil, let bytes = photoData else {
      if let url = movieURL { try? FileManager.default.removeItem(at: url) }
      DispatchQueue.main.async { self.status.text = "拍摄未完成，请重试"; self.capturing = false; self.shutter.isEnabled = true; self.closeButton.isEnabled = true; self.liveButton.isEnabled = self.output.isLivePhotoCaptureEnabled }
      return
    }
    let photo = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".jpg")
    do { try bytes.write(to: photo, options: .atomic) } catch {
      DispatchQueue.main.async { self.status.text = "存储空间不足，请关闭相机"; self.capturing = false; self.closeButton.isEnabled = true }; return
    }
    let movie = movieURL
    let deliver: (Bool) -> Void = { saved in
      var asset: [String: Any] = ["uri": photo.absoluteString, "type": "image", "mimeType": "image/jpeg", "width": resolvedSettings.photoDimensions.width, "height": resolvedSettings.photoDimensions.height, "capturedAt": ISO8601DateFormatter().string(from: self.capturedAt)]
      if let movie { asset["liveMovieURI"] = movie.absoluteString }
      DispatchQueue.main.async { self.finished?(["canceled": false, "assets": [asset], "savedToLibrary": saved]) }
    }
    PHPhotoLibrary.requestAuthorization(for: .addOnly) { permission in
      guard permission == .authorized || permission == .limited else { deliver(false); return }
      PHPhotoLibrary.shared().performChanges({
        let request = PHAssetCreationRequest.forAsset()
        request.addResource(with: .photo, fileURL: photo, options: nil)
        if let movie { request.addResource(with: .pairedVideo, fileURL: movie, options: nil) }
      }) { saved, _ in deliver(saved) }
    }
  }
}

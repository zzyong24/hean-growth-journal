import AppIntents
import Foundation

struct BabyQuickRecord: AppIntent {
  static var title: LocalizedStringResource = "宝宝记一笔"
  static var description = IntentDescription("说出喂奶、尿布等事件。明确的记录自动保存，需要核对时留作草稿。")
  static var openAppWhenRun = false
  static var authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed
  @Parameter(title: "记录内容", requestValueDialog: "宝宝刚刚发生了什么？") var text: String
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let reply = try await BabyVoiceStore.shared.record(text)
    return .result(dialog: IntentDialog(stringLiteral: reply))
  }
}
struct UndoBabyQuickRecord: AppIntent {
  static var title: LocalizedStringResource = "撤销上一笔语音记录"
  static var openAppWhenRun = false
  static var authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let reply = try await BabyVoiceStore.shared.undo()
    return .result(dialog: IntentDialog(stringLiteral: reply))
  }
}
struct BabyQuickShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(intent: BabyQuickRecord(), phrases: ["用\(.applicationName)记一笔", "用\(.applicationName)记录宝宝", "Log baby care with \(.applicationName)"], shortTitle: "宝宝记一笔", systemImageName: "mic.fill")
    AppShortcut(intent: UndoBabyQuickRecord(), phrases: ["用\(.applicationName)撤销上一笔"], shortTitle: "撤销上一笔", systemImageName: "arrow.uturn.backward")
  }
}
actor BabyVoiceStore {
  static let shared = BabyVoiceStore()
  private var busy = false
  private var lastText = ""
  private var lastDate = Date.distantPast
  private var lastReply = ""
  private let fm = FileManager.default
  private var folder: URL { fm.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("baby-voice", isDirectory: true) }
  private func write(_ object: [String: Any], to url: URL) throws {
    try fm.createDirectory(at: folder, withIntermediateDirectories: true)
    try JSONSerialization.data(withJSONObject: object).write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
  }
  func undo() throws -> String {
    guard !busy else { return "请等正在处理的记录完成后再撤销。" }
    guard let bytes=try? Data(contentsOf:folder.appendingPathComponent("config.json")), let config=try? JSONSerialization.jsonObject(with:bytes) as? [String:Any] else { return "请先打开 禾安成长日记。" }
    let profileKey=config["profileKey"] as? String ?? "legacy"
    let entries = ((try? fm.contentsOfDirectory(at: folder, includingPropertiesForKeys:nil)) ?? []).compactMap { url -> (URL,[String:Any])? in
      guard url.lastPathComponent != "config.json", let bytes=try? Data(contentsOf:url), let r=try? JSONSerialization.jsonObject(with:bytes) as? [String:Any], r["status"] as? String == "saved", (r["profileKey"] as? String ?? "legacy") == profileKey else { return nil }
      return (url,r)
    }.sorted { ($0.1["capturedAt"] as? String ?? "") > ($1.1["capturedAt"] as? String ?? "") }
    guard var latest=entries.first else { return "没有可撤销的语音记录。" }
    latest.1["status"] = "undone"; latest.1["reply"] = "已撤销上一笔语音记录。"
    try write(latest.1,to:latest.0)
    lastText = ""; lastReply = ""
    return "已撤销上一笔语音记录。"
  }
  func record(_ original: String) async throws -> String {
    let text = original.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !text.isEmpty, text.count <= 8000 else { return "请说出需要记录的内容。" }
    guard !busy else { return "上一笔还在处理中，请稍等。" }
    let configURL = folder.appendingPathComponent("config.json")
    guard let bytes = try? Data(contentsOf: configURL), let config = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any], config["enabled"] as? Bool == true else { return "请先打开 禾安成长日记，在设置里启用 Siri 快速记录。" }
    guard let base = config["apiURL"] as? String, let url = URL(string: base + "/api/interpret"), let profile = config["profile"] as? [String: Any], !(profile["name"] as? String ?? "").isEmpty else { return "请先在 禾安成长日记 完成宝宝档案和服务配置。" }
    busy = true
    defer { busy = false }
    let captured = Date()
    let stamp = ISO8601DateFormatter().string(from: captured)
    let id = UUID().uuidString
    let file = folder.appendingPathComponent(id + ".json")
    var receipt: [String: Any] = ["profileKey":config["profileKey"] as? String ?? "legacy","id":id,"text":text,"capturedAt":stamp,"timezone":TimeZone.current.identifier,"status":"processing","records":[]]
    // Persist the original before network work; an interrupted invocation is visible in the app.
    try write(receipt, to: file)
    do {
      var request = URLRequest(url: url)
      request.httpMethod = "POST"
      request.timeoutInterval = 25
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      if let token = config["token"] as? String, !token.isEmpty { request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
      var context = config["babyContext"] as? [String: Any] ?? [:]
      var history = context["history"] as? [[String: Any]] ?? []
      let processed = Set(config["processedReceipts"] as? [String] ?? [])
      let envelopes = ((try? fm.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)) ?? []).filter { $0.lastPathComponent != "config.json" }.compactMap { item -> [String:Any]? in
        guard let bytes = try? Data(contentsOf:item), let r = try? JSONSerialization.jsonObject(with:bytes) as? [String:Any], (r["profileKey"] as? String ?? "legacy") == (config["profileKey"] as? String ?? "legacy") else { return nil }; return r
      }.sorted { ($0["capturedAt"] as? String ?? "") < ($1["capturedAt"] as? String ?? "") }
      for envelope in envelopes {
        let status = envelope["status"] as? String ?? ""
        guard !processed.contains((envelope["id"] as? String ?? "") + ":" + status), let records = envelope["records"] as? [[String:Any]] else { continue }
        if status == "saved" {
          for record in records { history.removeAll { $0["id"] as? String == record["id"] as? String }; history.append(record) }
        } else if status == "undone" {
          let previous = envelope["previousRecords"] as? [[String:Any]] ?? []
          for record in records {
            // Only undo the version produced by this invocation; later edits win.
            guard let index = history.firstIndex(where: { $0["id"] as? String == record["id"] as? String }), history[index]["at"] as? String == record["at"] as? String, history[index]["value"] as? NSNumber == record["value"] as? NSNumber, history[index]["note"] as? String == record["note"] as? String else { continue }
            if let original = previous.first(where: { $0["id"] as? String == record["id"] as? String }) { history[index] = original }
            else if record["targetRecordId"] == nil { history.remove(at:index) }
          }
        }
      }
      history.sort { ($0["at"] as? String ?? "") > ($1["at"] as? String ?? "") }
      context["history"] = history
      // Rebuild request clock in the phone process, never inherit the last app-open timestamp.
      context["now"] = stamp; context["timezone"] = TimeZone.current.identifier
      request.httpBody = try JSONSerialization.data(withJSONObject: ["text":text,"now":stamp,"timezone":TimeZone.current.identifier,"profile":profile,"language":config["language"] as? String ?? "zh","babyContext":context,"records":Array(history.prefix(50)),"pending":[]])
      var responsePair: (Data, URLResponse)?
      for attempt in 0..<2 {
        do {
          let pair = try await URLSession.shared.data(for:request)
          if let http = pair.1 as? HTTPURLResponse, (http.statusCode == 429 || http.statusCode >= 500), attempt == 0 { try await Task.sleep(nanoseconds: 1_200_000_000); continue }
          responsePair = pair; break
        } catch {
          if attempt == 1 || Task.isCancelled { throw error }
          try await Task.sleep(nanoseconds: 1_200_000_000)
        }
      }
      guard let (data,response) = responsePair else { throw URLError(.badServerResponse) }
      guard (response as? HTTPURLResponse)?.statusCode == 200, let result = try JSONSerialization.jsonObject(with:data) as? [String:Any], let candidates = result["drafts"] as? [[String:Any]] else { throw URLError(.badServerResponse) }
      let allowed = Set(["bottle","nursing","diaper","sleep","temperature","weight","height","head","pumping","food","medicine","supplement","note"])
      guard candidates.count <= 30, candidates.allSatisfy({ allowed.contains($0["kind"] as? String ?? "") && ($0["at"] as? String) != nil }) else { throw URLError(.cannotParseResponse) }
      let records = candidates.enumerated().map { index, candidate -> [String:Any] in var r = candidate; r["id"] = (candidate["targetRecordId"] as? String) ?? (id + "-" + String(index)); return r }
      let targets = Set(records.compactMap { $0["targetRecordId"] as? String })
      receipt["previousRecords"] = history.filter { targets.contains($0["id"] as? String ?? "") }
      receipt["records"] = records
      receipt["status"] = records.isEmpty ? "review" : "saved"
      let reply: String
      if records.isEmpty { reply = result["reply"] as? String ?? "没有识别到明确事件，已保留原话，请在 App 中查看。" }
      else {
        let names = ["bottle":"瓶喂","nursing":"亲喂","diaper":"尿布","sleep":"睡眠","temperature":"体温","weight":"体重","height":"身高"]
        let summary = records.map { r -> String in let name = names[r["kind"] as? String ?? ""] ?? "记录"; if let value = r["value"] as? NSNumber { return name + value.stringValue + (r["unit"] as? String ?? "") }; return name }.joined(separator:"、")
        reply = "已保存" + summary + "。时间按你刚才所说的计算。"
      }
      guard let currentBytes = try? Data(contentsOf:configURL), let current = try? JSONSerialization.jsonObject(with:currentBytes) as? [String:Any], current["enabled"] as? Bool == true, current["profileKey"] as? String == config["profileKey"] as? String else {
        try? fm.removeItem(at:file)
        return "快速记录设置或宝宝档案已变化，这笔没有保存，请重新记录。"
      }
      receipt["reply"] = reply
      try write(receipt,to:file)
      lastText = text; lastDate = Date(); lastReply = reply
      return reply
    } catch {
      receipt["status"] = "failed"
      receipt["reply"] = "暂时无法连接，原话已保留在 禾安成长日记，尚未记入日常。"
      try write(receipt,to:file)
      return receipt["reply"] as! String
    }
  }
}

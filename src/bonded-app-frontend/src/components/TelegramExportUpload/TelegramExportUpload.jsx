import React, { useState } from "react";
import { textClassificationService } from "../../ai/textClassification";

export default function TelegramExportUpload() {
  const [status, setStatus] = useState("");
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [exportReady, setExportReady] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus("Parsing...");
    try {
      const text = await file.text();
      let messages = [];
      if (file.name.endsWith(".json")) {
        messages = parseTelegramJson(text);
      } else if (file.name.endsWith(".html")) {
        messages = parseTelegramHtml(text);
      } else {
        setStatus("Unsupported file type. Please upload a Telegram JSON or HTML export.");
        return;
      }
      setStatus(`Filtering ${messages.length} messages...`);
      // Filter with AI (no mock, only real data)
      const filtered = await textClassificationService.filterMessages(messages);
      setFilteredMessages(filtered);
      setExportReady(true);
      setStatus(`Ready: ${filtered.length} messages suitable for evidence.`);
    } catch (err) {
      setStatus("Failed to parse or filter: " + err.message);
    }
  };

  function parseTelegramJson(text) {
    const data = JSON.parse(text);
    if (!data.messages) throw new Error("No messages found in export.");
    return data.messages
      .filter(msg => msg.type === "message" && msg.text)
      .map(msg => ({
        id: msg.id,
        text: typeof msg.text === "string" ? msg.text : msg.text.map(t => (typeof t === "string" ? t : t.text)).join(""),
        timestamp: msg.date ? new Date(msg.date).getTime() : null,
        from: msg.from,
      }));
  }

  function parseTelegramHtml(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const nodes = doc.querySelectorAll(".message");
    return Array.from(nodes).map(node => ({
      id: node.getAttribute("id"),
      text: node.querySelector(".text")?.textContent || "",
      timestamp: new Date(node.querySelector(".pull_right.date")?.getAttribute("title")).getTime(),
      from: node.querySelector(".from_name")?.textContent,
    }));
  }

  // Export as plain text (all real, filtered messages)
  const handleExport = () => {
    const content = filteredMessages.map(
      m => `[${new Date(m.timestamp).toLocaleString()}] ${m.from}: ${m.text}`
    ).join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bonded_evidence_telegram.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h3>Import & Export Telegram DM Evidence</h3>
      <input type="file" accept=".json,.html" onChange={handleFileChange} />
      <div>{status}</div>
      {filteredMessages.length > 0 && (
        <div>
          <h4>Preview (first 10):</h4>
          <ul>
            {filteredMessages.slice(0, 10).map((msg, i) => (
              <li key={i}>
                <b>{msg.from}</b>: {msg.text} <i>({new Date(msg.timestamp).toLocaleString()})</i>
              </li>
            ))}
          </ul>
          <button onClick={handleExport} disabled={!exportReady}>
            Export Filtered Messages
          </button>
        </div>
      )}
    </div>
  );
} 
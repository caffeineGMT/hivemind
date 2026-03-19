import {
  exportData,
  exportTasks,
  exportAgents,
  exportActivityLogs,
  exportLogs,
  exportCosts,
  exportIncidents,
  runArchival,
  listArchives,
  readArchive,
} from "./data-exporter.js";

export function registerExportRoutes(app) {
  // Multi-entity export
  app.get("/api/export/:companyId", (req, res) => {
    try {
      const { companyId } = req.params;
      const {
        entities = "tasks,agents,activity",
        startDate,
        endDate,
        format = "json",
      } = req.query;

      const entityList = entities.split(",").map((e) => e.trim());
      const data = exportData({
        companyId,
        entities: entityList,
        startDate,
        endDate,
        format,
      });

      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="hivemind-export-${companyId.slice(0, 8)}-${Date.now()}.csv"`
        );
        return res.send(data);
      }

      res.json(data);
    } catch (err) {
      console.error("[export] Error:", err);
      res.status(500).json({ error: "Export failed" });
    }
  });

  // Single-entity exports
  app.get("/api/export/:companyId/tasks", (req, res) => {
    try {
      const { startDate, endDate, format = "json" } = req.query;
      const data = exportTasks({
        companyId: req.params.companyId,
        startDate,
        endDate,
        format,
      });
      sendExportResponse(res, data, format, "tasks", req.params.companyId);
    } catch (err) {
      console.error("[export] Tasks export error:", err);
      res.status(500).json({ error: "Export failed" });
    }
  });

  app.get("/api/export/:companyId/agents", (req, res) => {
    try {
      const { format = "json" } = req.query;
      const data = exportAgents({
        companyId: req.params.companyId,
        format,
      });
      sendExportResponse(res, data, format, "agents", req.params.companyId);
    } catch (err) {
      console.error("[export] Agents export error:", err);
      res.status(500).json({ error: "Export failed" });
    }
  });

  app.get("/api/export/:companyId/activity", (req, res) => {
    try {
      const { startDate, endDate, format = "json" } = req.query;
      const data = exportActivityLogs({
        companyId: req.params.companyId,
        startDate,
        endDate,
        format,
      });
      sendExportResponse(res, data, format, "activity", req.params.companyId);
    } catch (err) {
      console.error("[export] Activity export error:", err);
      res.status(500).json({ error: "Export failed" });
    }
  });

  app.get("/api/export/:companyId/logs", (req, res) => {
    try {
      const { startDate, endDate, level, source, format = "json" } = req.query;
      const data = exportLogs({
        companyId: req.params.companyId,
        startDate,
        endDate,
        level,
        source,
        format,
      });
      sendExportResponse(res, data, format, "logs", req.params.companyId);
    } catch (err) {
      console.error("[export] Logs export error:", err);
      res.status(500).json({ error: "Export failed" });
    }
  });

  // Export logs without company filter (global)
  app.get("/api/export/logs", (req, res) => {
    try {
      const { startDate, endDate, level, source, format = "json" } = req.query;
      const data = exportLogs({
        startDate,
        endDate,
        level,
        source,
        format,
      });
      sendExportResponse(res, data, format, "logs", "global");
    } catch (err) {
      console.error("[export] Global logs export error:", err);
      res.status(500).json({ error: "Export failed" });
    }
  });

  app.get("/api/export/:companyId/costs", (req, res) => {
    try {
      const { startDate, endDate, format = "json" } = req.query;
      const data = exportCosts({
        companyId: req.params.companyId,
        startDate,
        endDate,
        format,
      });
      sendExportResponse(res, data, format, "costs", req.params.companyId);
    } catch (err) {
      console.error("[export] Costs export error:", err);
      res.status(500).json({ error: "Export failed" });
    }
  });

  app.get("/api/export/:companyId/incidents", (req, res) => {
    try {
      const { startDate, endDate, format = "json" } = req.query;
      const data = exportIncidents({
        companyId: req.params.companyId,
        startDate,
        endDate,
        format,
      });
      sendExportResponse(res, data, format, "incidents", req.params.companyId);
    } catch (err) {
      console.error("[export] Incidents export error:", err);
      res.status(500).json({ error: "Export failed" });
    }
  });

  // Archival endpoints
  app.post("/api/export/archive", (req, res) => {
    try {
      const { daysOld = 30 } = req.body || {};
      const result = runArchival(daysOld);
      res.json(result);
    } catch (err) {
      console.error("[export] Archival error:", err);
      res.status(500).json({ error: "Archival failed" });
    }
  });

  app.get("/api/export/archives", (req, res) => {
    try {
      const archives = listArchives();
      res.json(archives);
    } catch (err) {
      console.error("[export] List archives error:", err);
      res.status(500).json({ error: "Failed to list archives" });
    }
  });

  app.get("/api/export/archives/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      // Validate filename format to prevent path traversal
      if (!/^[\w.-]+\.json\.gz$/.test(filename)) {
        return res.status(400).json({ error: "Invalid filename" });
      }
      const data = readArchive(filename);
      if (!data) {
        return res.status(404).json({ error: "Archive not found" });
      }
      res.json(data);
    } catch (err) {
      console.error("[export] Read archive error:", err);
      res.status(500).json({ error: "Failed to read archive" });
    }
  });
}

function sendExportResponse(res, data, format, entity, companyId) {
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="hivemind-${entity}-${companyId.slice(0, 8)}-${Date.now()}.csv"`
    );
    return res.send(data);
  }
  res.json(data);
}

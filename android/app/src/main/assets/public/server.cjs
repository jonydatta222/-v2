var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var BACKUP_FILE_NAME = "hisab_khata_backup.json";
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
  app.post("/api/gdrive/check", async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and trashed=false&fields=files(id,name,modifiedTime)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: `Google API Error: ${errorText}` });
      }
      const data = await response.json();
      const files = data.files || [];
      if (files.length > 0) {
        return res.json({
          fileId: files[0].id,
          modifiedTime: files[0].modifiedTime
        });
      }
      return res.json(null);
    } catch (err) {
      console.error("Server GDrive Check Error:", err);
      return res.status(500).json({ error: err.message || "Failed to check backup" });
    }
  });
  app.post("/api/gdrive/backup", async (req, res) => {
    const { accessToken, sales, expenses, storeInfo, language } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }
    try {
      const checkResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and trashed=false&fields=files(id,name)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      if (!checkResponse.ok) {
        const errText = await checkResponse.text();
        return res.status(checkResponse.status).json({ error: `Check Error: ${errText}` });
      }
      const checkData = await checkResponse.json();
      const files = checkData.files || [];
      let fileId = files.length > 0 ? files[0].id : null;
      if (!fileId) {
        const createRes = await fetch(
          "https://www.googleapis.com/drive/v3/files",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              name: BACKUP_FILE_NAME,
              mimeType: "application/json"
            })
          }
        );
        if (!createRes.ok) {
          const errText = await createRes.text();
          return res.status(createRes.status).json({ error: `Metadata Creation Error: ${errText}` });
        }
        const createData = await createRes.json();
        fileId = createData.id;
      }
      if (!fileId) {
        return res.status(500).json({ error: "Could not resolve Google Drive File ID" });
      }
      const uploadData = {
        sales,
        expenses,
        storeInfo,
        lastSync: (/* @__PURE__ */ new Date()).toISOString(),
        app: "HishabKhata"
      };
      const uploadRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(uploadData)
        }
      );
      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        return res.status(uploadRes.status).json({ error: `Media Upload Error: ${errText}` });
      }
      const locale = language === "bn" ? "bn-BD" : "en-US";
      const nowStr = (/* @__PURE__ */ new Date()).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }) + ", " + (/* @__PURE__ */ new Date()).toLocaleDateString(locale, {
        month: "short",
        day: "numeric"
      });
      return res.json({ lastSync: nowStr });
    } catch (err) {
      console.error("Server GDrive Backup Error:", err);
      return res.status(500).json({ error: err.message || "Failed to backup to Google Drive" });
    }
  });
  app.post("/api/gdrive/restore", async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }
    try {
      const checkResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and trashed=false&fields=files(id,name)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      if (!checkResponse.ok) {
        const errText = await checkResponse.text();
        return res.status(checkResponse.status).json({ error: `Check Error: ${errText}` });
      }
      const checkData = await checkResponse.json();
      const files = checkData.files || [];
      const fileId = files.length > 0 ? files[0].id : null;
      if (!fileId) {
        return res.status(404).json({ error: "\u0997\u09C1\u0997\u09B2 \u09A1\u09CD\u09B0\u09BE\u0987\u09AD\u09C7 \u0995\u09CB\u09A8\u09CB \u09AC\u09CD\u09AF\u09BE\u0995\u0986\u09AA \u09AB\u09BE\u0987\u09B2 \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF!" });
      }
      const getFileRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      if (!getFileRes.ok) {
        const errText = await getFileRes.text();
        return res.status(getFileRes.status).json({ error: `Download Error: ${errText}` });
      }
      const backupData = await getFileRes.json();
      if (backupData && Array.isArray(backupData.sales)) {
        return res.json({
          sales: backupData.sales,
          expenses: backupData.expenses || [],
          storeInfo: backupData.storeInfo || null
        });
      } else if (Array.isArray(backupData)) {
        return res.json({
          sales: backupData,
          expenses: [],
          storeInfo: null
        });
      }
      return res.status(400).json({ error: "Invalid backup data structure" });
    } catch (err) {
      console.error("Server GDrive Restore Error:", err);
      return res.status(500).json({ error: err.message || "Failed to restore backup" });
    }
  });
  app.get("/.well-known/assetlinks.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    const fingerprint = process.env.ANDROID_SHA256_FINGERPRINT || "A5:66:4E:EB:06:E3:91:AA:F9:BE:48:03:00:23:D0:13:15:A3:AC:5A:C6:FD:D8:4E:FD:D1:3A:6A:A8:8D:84:5D";
    const fingerprints = fingerprint.split(",").map((f) => f.trim());
    res.json([
      {
        "relation": [
          "delegate_permission/common.handle_all_urls"
        ],
        "target": {
          "namespace": "android_app",
          "package_name": "app.run.asia_southeast1.ais_pre_mhhmjbreiv2zflqgoeem73_273317504244.twa",
          "sha256_cert_fingerprints": fingerprints
        }
      }
    ]);
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = __dirname;
    app.use(import_express.default.static(distPath, { dotfiles: "allow" }));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map

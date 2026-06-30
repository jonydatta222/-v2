import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const BACKUP_FILE_NAME = "hisab_khata_backup.json";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser middlewares for handling backup payload sizes
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API: Check Google Drive Backup
  app.post("/api/gdrive/check", async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and trashed=false&fields=files(id,name,modifiedTime)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return res
          .status(response.status)
          .json({ error: `Google API Error: ${errorText}` });
      }

      const data = await response.json();
      const files = data.files || [];
      if (files.length > 0) {
        return res.json({
          fileId: files[0].id,
          modifiedTime: files[0].modifiedTime,
        });
      }
      return res.json(null);
    } catch (err: any) {
      console.error("Server GDrive Check Error:", err);
      return res
        .status(500)
        .json({ error: err.message || "Failed to check backup" });
    }
  });

  // API: Backup to Google Drive
  app.post("/api/gdrive/backup", async (req, res) => {
    const { accessToken, sales, expenses, storeInfo, language } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }

    try {
      // 1. Search if backup file already exists
      const checkResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and trashed=false&fields=files(id,name)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!checkResponse.ok) {
        const errText = await checkResponse.text();
        return res
          .status(checkResponse.status)
          .json({ error: `Check Error: ${errText}` });
      }

      const checkData = await checkResponse.json();
      const files = checkData.files || [];
      let fileId = files.length > 0 ? files[0].id : null;

      // 2. If it does not exist, create the file metadata first
      if (!fileId) {
        const createRes = await fetch(
          "https://www.googleapis.com/drive/v3/files",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: BACKUP_FILE_NAME,
              mimeType: "application/json",
            }),
          },
        );

        if (!createRes.ok) {
          const errText = await createRes.text();
          return res
            .status(createRes.status)
            .json({ error: `Metadata Creation Error: ${errText}` });
        }

        const createData = await createRes.json();
        fileId = createData.id;
      }

      if (!fileId) {
        return res
          .status(500)
          .json({ error: "Could not resolve Google Drive File ID" });
      }

      // 3. Upload/Update the actual sales data content (as media)
      const uploadData = {
        sales,
        expenses,
        storeInfo,
        lastSync: new Date().toISOString(),
        app: "HishabKhata",
      };

      const uploadRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(uploadData),
        },
      );

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        return res
          .status(uploadRes.status)
          .json({ error: `Media Upload Error: ${errText}` });
      }

      // Format current local time in localized representation
      const locale = language === "bn" ? "bn-BD" : "en-US";
      const nowStr =
        new Date().toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }) +
        ", " +
        new Date().toLocaleDateString(locale, {
          month: "short",
          day: "numeric",
        });

      return res.json({ lastSync: nowStr });
    } catch (err: any) {
      console.error("Server GDrive Backup Error:", err);
      return res
        .status(500)
        .json({ error: err.message || "Failed to backup to Google Drive" });
    }
  });

  // API: Restore from Google Drive
  app.post("/api/gdrive/restore", async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }

    try {
      // 1. Search if backup file already exists
      const checkResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and trashed=false&fields=files(id,name)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!checkResponse.ok) {
        const errText = await checkResponse.text();
        return res
          .status(checkResponse.status)
          .json({ error: `Check Error: ${errText}` });
      }

      const checkData = await checkResponse.json();
      const files = checkData.files || [];
      const fileId = files.length > 0 ? files[0].id : null;

      if (!fileId) {
        return res
          .status(404)
          .json({ error: "গুগল ড্রাইভে কোনো ব্যাকআপ ফাইল পাওয়া যায়নি!" });
      }

      // 2. Download contents
      const getFileRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!getFileRes.ok) {
        const errText = await getFileRes.text();
        return res
          .status(getFileRes.status)
          .json({ error: `Download Error: ${errText}` });
      }

      const backupData = await getFileRes.json();

      if (backupData && Array.isArray(backupData.sales)) {
        return res.json({
          sales: backupData.sales,
          expenses: backupData.expenses || [],
          storeInfo: backupData.storeInfo || null,
        });
      } else if (Array.isArray(backupData)) {
        return res.json({
          sales: backupData,
          expenses: [],
          storeInfo: null,
        });
      }

      return res.status(400).json({ error: "Invalid backup data structure" });
    } catch (err: any) {
      console.error("Server GDrive Restore Error:", err);
      return res
        .status(500)
        .json({ error: err.message || "Failed to restore backup" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

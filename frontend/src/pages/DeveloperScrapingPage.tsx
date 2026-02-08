import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import {
  CloudUpload,
  Description,
  InsertDriveFile,
  Storage,
  Upload,
} from "@mui/icons-material";
import { useEffect, useRef, useState } from "react";

import { apiFetch, getToken } from "../api/client";
import { colors } from "../theme";

type Direction = { id: number; name: string };

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const DeveloperScrapingPage = () => {
  const [directions, setDirections] = useState<Direction[]>([]);
  const [importDirectionId, setImportDirectionId] = useState<number | "">("");
  const [importPlatform, setImportPlatform] = useState<"vk" | "instagram" | "tiktok">(
    "vk"
  );
  const [importFormat, setImportFormat] = useState<"csv" | "json">("csv");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const data = (await apiFetch("/directions")) as Direction[];
        setDirections(data);
        if (data.length && !importDirectionId) {
          setImportDirectionId(data[0].id);
        }
      } catch (err) {
        setError((err as Error).message);
      }
    };
    void init();
  }, [importDirectionId]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setImportFile(file);
  };

  const handleImport = async () => {
    if (!importFile || !importDirectionId) {
      setError("Выберите файл и направление");
      return;
    }

    setError(null);
    setSuccess(null);
    setImporting(true);
    setImportProgress(0);

    // Estimate total time based on file size (~6 sec per MB)
    const estimatedSeconds = Math.max(10, (importFile.size / 1024 / 1024) * 6);
    const intervalMs = 500;
    const step = 95 / (estimatedSeconds * 1000 / intervalMs);
    progressTimer.current = setInterval(() => {
      setImportProgress((prev) => Math.min(prev + step, 95));
    }, intervalMs);

    const token = getToken();
    const apiBase = import.meta.env.VITE_API_BASE || "/api";
    const endpoint = `${apiBase}/scrape/import/${importPlatform}-${importFormat}?direction_id=${importDirectionId}`;

    const formData = new FormData();
    formData.append("file", importFile);

    const done = () => {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
      setImportProgress(100);
      setTimeout(() => {
        setImporting(false);
        setImportProgress(0);
      }, 400);
    };

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.withCredentials = true;

    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) {
          setError(result.detail || "Ошибка импорта");
        } else {
          const errorCount = result.errors?.length || 0;
          setSuccess(
            `Импортировано: ${result.imported}, обновлено: ${result.updated}${errorCount > 0 ? `. Ошибок: ${errorCount}` : ""}`
          );
          setImportFile(null);
        }
      } catch {
        setError("Ошибка обработки ответа");
      }
      done();
    };

    xhr.onerror = () => {
      setError("Ошибка сети при загрузке файла");
      done();
    };

    xhr.send(formData);
  };

  const platformConfig = {
    vk: { label: "VK", color: "#5181b8" },
    instagram: { label: "IG", color: "#e6683c" },
    tiktok: { label: "TT", color: "#fe2c55" },
  };

  return (
    <Stack spacing={3}>
      {/* Header banner */}
      <Card
        sx={{
          background: `linear-gradient(135deg, ${colors.primary.dark} 0%, ${colors.primary.main} 50%, ${colors.secondary.main} 100%)`,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: alpha("#fff", 0.05),
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -20,
            right: 80,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: alpha("#fff", 0.03),
          }}
        />
        <CardContent sx={{ p: { xs: 3, md: 4 }, position: "relative", zIndex: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                bgcolor: alpha("#fff", 0.15),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Storage sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Импорт данных
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Загрузка CSV/JSON файлов из ВКонтакте, Instagram и TikTok
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Main content - two columns */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
        }}
      >
        {/* Left: Settings */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 4px 14px ${alpha(colors.primary.main, 0.25)}`,
                }}
              >
                <Description sx={{ color: "#fff", fontSize: 18 }} />
              </Box>
              <Typography variant="h6" fontWeight={600}>
                Параметры импорта
              </Typography>
            </Stack>

            <Stack spacing={2.5}>
              <FormControl fullWidth>
                <InputLabel>Направление</InputLabel>
                <Select
                  label="Направление"
                  value={importDirectionId}
                  onChange={(event) => setImportDirectionId(Number(event.target.value))}
                >
                  {directions.map((direction) => (
                    <MenuItem key={direction.id} value={direction.id}>
                      {direction.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Платформа
                </Typography>
                <Stack direction="row" spacing={1}>
                  {(["vk", "instagram", "tiktok"] as const).map((p) => (
                    <Chip
                      key={p}
                      label={p === "vk" ? "ВКонтакте" : p === "instagram" ? "Instagram" : "TikTok"}
                      onClick={() => setImportPlatform(p)}
                      sx={{
                        fontWeight: 600,
                        px: 1,
                        bgcolor:
                          importPlatform === p
                            ? alpha(platformConfig[p].color, 0.15)
                            : colors.grey[100],
                        color:
                          importPlatform === p
                            ? platformConfig[p].color
                            : colors.grey[600],
                        border: `1.5px solid ${importPlatform === p ? platformConfig[p].color : "transparent"}`,
                        "&:hover": {
                          bgcolor: alpha(platformConfig[p].color, 0.1),
                        },
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Формат файла
                </Typography>
                <Stack direction="row" spacing={1}>
                  {(["csv", "json"] as const).map((f) => (
                    <Chip
                      key={f}
                      label={f.toUpperCase()}
                      onClick={() => setImportFormat(f)}
                      sx={{
                        fontWeight: 600,
                        px: 1.5,
                        bgcolor:
                          importFormat === f
                            ? alpha(colors.info.main, 0.15)
                            : colors.grey[100],
                        color:
                          importFormat === f ? colors.info.dark : colors.grey[600],
                        border: `1.5px solid ${importFormat === f ? colors.info.main : "transparent"}`,
                        "&:hover": {
                          bgcolor: alpha(colors.info.main, 0.1),
                        },
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              <TextField
                label="Комментарий (необязательно)"
                fullWidth
                multiline
                minRows={2}
                placeholder="Например: выгрузка за февраль 2026..."
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Right: File upload */}
        <Card>
          <CardContent sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${colors.info.main} 0%, ${colors.info.dark} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 4px 14px ${alpha(colors.info.main, 0.25)}`,
                }}
              >
                <CloudUpload sx={{ color: "#fff", fontSize: 18 }} />
              </Box>
              <Typography variant="h6" fontWeight={600}>
                Файл
              </Typography>
            </Stack>

            <Box
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              sx={{
                flex: 1,
                border: `2px dashed ${dragOver ? colors.info.main : importFile ? colors.success.main : colors.grey[300]}`,
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                bgcolor: dragOver
                  ? alpha(colors.info.main, 0.08)
                  : importFile
                    ? alpha(colors.success.main, 0.04)
                    : colors.grey[50],
                transition: "all 0.2s",
                cursor: "pointer",
                minHeight: 200,
                "&:hover": {
                  borderColor: colors.info.main,
                  bgcolor: alpha(colors.info.main, 0.05),
                },
              }}
            >
              <input
                accept={importFormat === "csv" ? ".csv,.tsv,.txt" : ".json"}
                style={{ display: "none" }}
                id="import-upload"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setImportFile(file);
                }}
              />
              <label htmlFor="import-upload" style={{ cursor: "pointer", width: "100%", padding: 24 }}>
                {importFile ? (
                  <Stack spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 3,
                        bgcolor: alpha(colors.success.main, 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <InsertDriveFile sx={{ fontSize: 28, color: colors.success.main }} />
                    </Box>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {importFile.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(importFile.size)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Нажмите чтобы выбрать другой файл
                    </Typography>
                  </Stack>
                ) : (
                  <Stack spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        bgcolor: alpha(colors.info.main, 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Upload sx={{ fontSize: 32, color: colors.info.main }} />
                    </Box>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Перетащите файл сюда
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        или нажмите для выбора
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      CSV, TSV, JSON
                    </Typography>
                  </Stack>
                )}
              </label>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Progress bar */}
      {importing && (
        <Card sx={{ overflow: "visible" }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Импорт данных
              </Typography>
              <Typography variant="subtitle2" fontWeight={700} color="info.main">
                {Math.round(importProgress)}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={importProgress}
              sx={{
                height: 10,
                borderRadius: 5,
                bgcolor: alpha(colors.info.main, 0.12),
                "& .MuiLinearProgress-bar": {
                  borderRadius: 5,
                  background: `linear-gradient(90deg, ${colors.info.main} 0%, ${colors.secondary.main} 100%)`,
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              Обработка записей на сервере...
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Import button */}
      <Button
        variant="contained"
        size="large"
        startIcon={<Upload />}
        onClick={handleImport}
        disabled={!importFile || !importDirectionId || importing}
        sx={{
          py: 2,
          fontSize: "1rem",
          background: `linear-gradient(135deg, ${colors.info.main} 0%, ${colors.info.dark} 100%)`,
          boxShadow: `0 8px 24px ${alpha(colors.info.main, 0.3)}`,
          "&:hover": {
            boxShadow: `0 12px 32px ${alpha(colors.info.main, 0.4)}`,
          },
        }}
      >
        {importing ? "Импорт..." : "Импортировать данные"}
      </Button>
    </Stack>
  );
};

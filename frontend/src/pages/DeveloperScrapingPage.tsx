import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import { FileUpload, Upload } from "@mui/icons-material";
import { useEffect, useState } from "react";

import { apiFetch, getToken } from "../api/client";
import { colors } from "../theme";

type Direction = { id: number; name: string };

const SectionCard = ({
  title,
  icon,
  children,
  headerColor,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  headerColor?: string;
}) => (
  <Card
    sx={{
      position: "relative",
      overflow: "visible",
      "&::before": headerColor
        ? {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: headerColor,
          borderRadius: "12px 12px 0 0",
        }
        : {},
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {icon && (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background:
                  headerColor ||
                  `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 14px ${alpha(colors.primary.main, 0.25)}`,
              }}
            >
              {icon}
            </Box>
          )}
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
        </Stack>
      </Stack>
      {children}
    </CardContent>
  </Card>
);

export const DeveloperScrapingPage = () => {
  const [directions, setDirections] = useState<Direction[]>([]);
  const [importDirectionId, setImportDirectionId] = useState<number | "">("");
  const [importPlatform, setImportPlatform] = useState<"vk" | "instagram" | "tiktok">(
    "vk"
  );
  const [importFormat, setImportFormat] = useState<"csv" | "json">("csv");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleImport = async () => {
    if (!importFile || !importDirectionId) {
      setError("Выберите файл и направление");
      return;
    }

    // Пока реализован только импорт VK CSV на бэкенде.
    if (!(importPlatform === "vk" && importFormat === "csv")) {
      setError("Импорт для выбранной соцсети/формата пока не реализован на бэкенде");
      return;
    }

    setError(null);
    setSuccess(null);
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const token = getToken();
      const apiBase = import.meta.env.VITE_API_BASE || "/api";
      const response = await fetch(
        `${apiBase}/scrape/import/vk-csv?direction_id=${importDirectionId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Ошибка импорта" }));
        throw new Error(errorData.detail || "Ошибка импорта");
      }

      const result = await response.json();
      const errorCount = result.errors?.length || 0;
      const successMsg = `Импортировано: ${result.members_imported}, обновлено: ${result.members_updated}${errorCount > 0 ? `. Ошибок: ${errorCount}` : ""
        }`;
      setSuccess(successMsg);
      setImportFile(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Stack spacing={3}>
      {/* Заголовок */}
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Импорт скрапленных данных
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Загрузка CSV/JSON файлов из ВКонтакте, Instagram и TikTok в разрезе направлений
        </Typography>
      </Box>

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

      <Grid container justifyContent="center">
        <Grid item xs={12} md={8} lg={6}>
          <SectionCard
            title="Импорт данных"
            icon={<FileUpload sx={{ color: "#fff", fontSize: 20 }} />}
            headerColor={`linear-gradient(135deg, ${colors.info.main} 0%, ${colors.info.dark} 100%)`}
          >
            <Stack spacing={2}>
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

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Соцсеть</InputLabel>
                    <Select
                      label="Соцсеть"
                      value={importPlatform}
                      onChange={(event) =>
                        setImportPlatform(
                          event.target.value as "vk" | "instagram" | "tiktok"
                        )
                      }
                    >
                      <MenuItem value="vk">ВКонтакте</MenuItem>
                      <MenuItem value="instagram">Instagram</MenuItem>
                      <MenuItem value="tiktok">TikTok</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Формат</InputLabel>
                    <Select
                      label="Формат"
                      value={importFormat}
                      onChange={(event) =>
                        setImportFormat(event.target.value as "csv" | "json")
                      }
                    >
                      <MenuItem value="csv">CSV</MenuItem>
                      <MenuItem value="json">JSON</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Box
                sx={{
                  border: `2px dashed ${colors.grey[300]}`,
                  borderRadius: 2,
                  p: 3,
                  textAlign: "center",
                  bgcolor: importFile ? alpha(colors.info.main, 0.05) : colors.grey[50],
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: colors.info.main,
                    bgcolor: alpha(colors.info.main, 0.05),
                  },
                }}
              >
                <input
                  accept={importFormat === "csv" ? ".csv" : ".json"}
                  style={{ display: "none" }}
                  id="import-upload"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImportFile(file);
                    }
                  }}
                />
                <label htmlFor="import-upload">
                  <Stack spacing={1} alignItems="center" sx={{ cursor: "pointer" }}>
                    <Upload sx={{ fontSize: 40, color: colors.info.main }} />
                    <Typography variant="body2" fontWeight={500}>
                      {importFile ? importFile.name : "Выберите файл для импорта"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Форматы: CSV или JSON. Сейчас на бэкенде поддержан только VK CSV, остальные
                      варианты появятся позже.
                    </Typography>
                  </Stack>
                </label>
              </Box>

              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<Upload />}
                onClick={handleImport}
                disabled={!importFile || !importDirectionId || importing}
                sx={{
                  py: 1.5,
                  background: `linear-gradient(135deg, ${colors.info.main} 0%, ${colors.info.dark} 100%)`,
                }}
              >
                {importing ? "Импорт..." : "Импортировать"}
              </Button>

              <TextField
                label="Комментарий / описание выгрузки (необязательно)"
                fullWidth
                multiline
                minRows={2}
                placeholder="Например: VK Madhal, выгрузка за март 2026, группа club123456..."
              />
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </Stack>
  );
};


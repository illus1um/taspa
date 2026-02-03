import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import {
  Add,
  Delete,
  Folder,
  FolderOpen,
  Instagram,
  Code,
  ContentPaste,
  Close,
  CloudUpload,
} from "@mui/icons-material";
import { useEffect, useState } from "react";

import { apiFetch } from "../api/client";
import { colors } from "../theme";

type Direction = { id: number; name: string };
type Source = {
  id: number;
  direction_id: number;
  source_type: "vk_group" | "instagram_account" | "tiktok_account";
  source_identifier: string;
};

// Компонент секции
const SectionCard = ({
  title,
  icon,
  children,
  action,
  headerColor,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
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
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {icon && (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: headerColor || `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`,
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
        {action}
      </Stack>
      {children}
    </CardContent>
  </Card>
);

// Иконка типа источника
const SourceTypeIcon = ({ type }: { type: Source["source_type"] }) => {
  switch (type) {
    case "vk_group":
      return (
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: 1,
            bgcolor: "#4A76A8",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          VK
        </Box>
      );
    case "instagram_account":
      return (
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: 1,
            background: "linear-gradient(45deg, #f09433, #dc2743)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Instagram sx={{ fontSize: 14 }} />
        </Box>
      );
    case "tiktok_account":
      return (
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: 1,
            bgcolor: "#000",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          TT
        </Box>
      );
  }
};

// Название типа источника
const sourceTypeName = (type: Source["source_type"]) => {
  switch (type) {
    case "vk_group":
      return "VK группа";
    case "instagram_account":
      return "Instagram";
    case "tiktok_account":
      return "TikTok";
  }
};

export const AdminDirectionsPage = () => {
  const [directions, setDirections] = useState<Direction[]>([]);
  const [selectedDirectionId, setSelectedDirectionId] = useState<number | "">("");
  const [sources, setSources] = useState<Source[]>([]);

  const [directionName, setDirectionName] = useState("");
  const [sourceType, setSourceType] = useState<Source["source_type"]>("vk_group");
  const [sourceIdentifier, setSourceIdentifier] = useState("");
  const [bulkSources, setBulkSources] = useState("");
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadDirections = async () => {
    const data = (await apiFetch("/directions")) as Direction[];
    setDirections(data);
    if (!selectedDirectionId && data.length) {
      setSelectedDirectionId(data[0].id);
    }
  };

  const loadSources = async (directionId: number) => {
    const data = (await apiFetch(`/directions/${directionId}/sources`)) as Source[];
    setSources(data);
  };

  useEffect(() => {
    const init = async () => {
      setError(null);
      try {
        await loadDirections();
      } catch (err) {
        setError((err as Error).message);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedDirectionId) {
      return;
    }
    loadSources(selectedDirectionId).catch((err) =>
      setError((err as Error).message)
    );
  }, [selectedDirectionId]);

  const handleCreateDirection = async () => {
    if (!directionName.trim()) return;
    setError(null);
    setSuccess(null);
    try {
      const data = (await apiFetch("/directions", {
        method: "POST",
        body: JSON.stringify({ name: directionName }),
      })) as Direction;
      setDirectionName("");
      await loadDirections();
      setSelectedDirectionId(data.id);
      setSuccess("Направление создано");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteDirection = async (directionId: number) => {
    const confirmed = window.confirm("Удалить направление? Все источники будут удалены.");
    if (!confirmed) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/directions/${directionId}`, { method: "DELETE" });
      await loadDirections();
      setSources([]);
      setSelectedDirectionId("");
      setSuccess("Направление удалено");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleAddSource = async () => {
    if (!selectedDirectionId || !sourceIdentifier.trim()) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/directions/${selectedDirectionId}/sources`, {
        method: "POST",
        body: JSON.stringify({
          source_type: sourceType,
          source_identifier: sourceIdentifier.trim(),
        }),
      });
      setSourceIdentifier("");
      await loadSources(selectedDirectionId);
      setSuccess("Источник добавлен");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleBulkAddSources = async () => {
    if (!selectedDirectionId) {
      return;
    }
    const items = bulkSources
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!items.length) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      for (const item of items) {
        await apiFetch(`/directions/${selectedDirectionId}/sources`, {
          method: "POST",
          body: JSON.stringify({
            source_type: sourceType,
            source_identifier: item,
          }),
        });
      }
      setBulkSources("");
      setShowBulkDialog(false);
      await loadSources(selectedDirectionId);
      setSuccess(`Добавлено источников: ${items.length}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteSource = async (sourceId: number) => {
    if (!selectedDirectionId) {
      return;
    }
    const confirmed = window.confirm("Удалить источник?");
    if (!confirmed) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/directions/${selectedDirectionId}/sources/${sourceId}`, {
        method: "DELETE",
      });
      await loadSources(selectedDirectionId);
      setSuccess("Источник удалён");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const selectedDirection = directions.find((d) => d.id === selectedDirectionId);

  return (
    <Stack spacing={3}>
      {/* Заголовок */}
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Управление направлениями
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Создание направлений и добавление источников
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

      <Grid container spacing={3}>
        {/* Левая колонка - Направления */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard
            title="Направления"
            icon={<Folder sx={{ color: "#fff", fontSize: 20 }} />}
            headerColor={`linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`}
          >
            {/* Создание направления */}
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField
                label="Название"
                value={directionName}
                onChange={(event) => setDirectionName(event.target.value)}
                fullWidth
                size="small"
                onKeyDown={(e) => e.key === "Enter" && handleCreateDirection()}
              />
              <Button
                variant="contained"
                onClick={handleCreateDirection}
                sx={{ minWidth: 100 }}
              >
                <Add />
              </Button>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* Список направлений */}
            <Stack spacing={1} sx={{ maxHeight: 400, overflow: "auto" }}>
              {directions.map((direction) => {
                const isSelected = direction.id === selectedDirectionId;
                return (
                  <Box
                    key={direction.id}
                    onClick={() => setSelectedDirectionId(direction.id)}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      bgcolor: isSelected
                        ? alpha(colors.primary.main, 0.1)
                        : "transparent",
                      border: `1px solid ${
                        isSelected ? colors.primary.main : "transparent"
                      }`,
                      "&:hover": {
                        bgcolor: isSelected
                          ? alpha(colors.primary.main, 0.15)
                          : colors.grey[50],
                      },
                      transition: "all 0.2s",
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      {isSelected ? (
                        <FolderOpen sx={{ color: colors.primary.main }} />
                      ) : (
                        <Folder sx={{ color: colors.grey[400] }} />
                      )}
                      <Typography
                        fontWeight={isSelected ? 600 : 400}
                        color={isSelected ? "primary" : "text.primary"}
                      >
                        {direction.name}
                      </Typography>
                    </Stack>
                    <Tooltip title="Удалить">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDirection(direction.id);
                        }}
                        sx={{
                          opacity: 0.5,
                          "&:hover": {
                            opacity: 1,
                            color: colors.error.main,
                          },
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                );
              })}
              {!directions.length && (
                <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                  <Typography variant="body2">Нет направлений</Typography>
                </Box>
              )}
            </Stack>
          </SectionCard>
        </Grid>

        {/* Правая колонка - Источники */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard
            title={
              selectedDirection
                ? `Источники: ${selectedDirection.name}`
                : "Источники"
            }
            icon={<Code sx={{ color: "#fff", fontSize: 20 }} />}
            headerColor={`linear-gradient(135deg, ${colors.secondary.main} 0%, ${colors.secondary.dark} 100%)`}
            action={
              selectedDirectionId && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentPaste />}
                  onClick={() => setShowBulkDialog(true)}
                >
                  Массовое добавление
                </Button>
              )
            }
          >
            {!selectedDirectionId ? (
              <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
                <Typography variant="body2">Выберите направление слева</Typography>
              </Box>
            ) : (
              <>
                {/* Добавление источника */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Тип</InputLabel>
                      <Select
                        label="Тип"
                        value={sourceType}
                        onChange={(event) =>
                          setSourceType(event.target.value as Source["source_type"])
                        }
                      >
                        <MenuItem value="vk_group">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <SourceTypeIcon type="vk_group" />
                            <span>VK группа</span>
                          </Stack>
                        </MenuItem>
                        <MenuItem value="instagram_account">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <SourceTypeIcon type="instagram_account" />
                            <span>Instagram</span>
                          </Stack>
                        </MenuItem>
                        <MenuItem value="tiktok_account">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <SourceTypeIcon type="tiktok_account" />
                            <span>TikTok</span>
                          </Stack>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <Stack direction="row" spacing={1}>
                      <TextField
                        label="Идентификатор"
                        value={sourceIdentifier}
                        onChange={(event) => setSourceIdentifier(event.target.value)}
                        fullWidth
                        size="small"
                        placeholder={
                          sourceType === "vk_group"
                            ? "club123456"
                            : sourceType === "instagram_account"
                            ? "username"
                            : "username"
                        }
                        onKeyDown={(e) => e.key === "Enter" && handleAddSource()}
                      />
                      <Button variant="contained" onClick={handleAddSource}>
                        <Add />
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Таблица источников */}
                <TableContainer sx={{ maxHeight: 350 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell width={80}>Тип</TableCell>
                        <TableCell>Идентификатор</TableCell>
                        <TableCell align="right" width={80}>
                          Действия
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sources.map((source) => (
                        <TableRow key={source.id}>
                          <TableCell>
                            <Tooltip title={sourceTypeName(source.source_type)}>
                              <Box sx={{ display: "inline-flex" }}>
                                <SourceTypeIcon type={source.source_type} />
                              </Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight={500}>
                              {source.source_identifier}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Удалить">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteSource(source.id)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!sources.length && (
                        <TableRow>
                          <TableCell colSpan={3}>
                            <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                              <Typography variant="body2">Нет источников</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* Диалог массового добавления */}
      <Dialog
        open={showBulkDialog}
        onClose={() => setShowBulkDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Массовое добавление источников</Typography>
            <IconButton onClick={() => setShowBulkDialog(false)} size="small">
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Тип источников</InputLabel>
              <Select
                label="Тип источников"
                value={sourceType}
                onChange={(event) =>
                  setSourceType(event.target.value as Source["source_type"])
                }
              >
                <MenuItem value="vk_group">VK группы</MenuItem>
                <MenuItem value="instagram_account">Instagram аккаунты</MenuItem>
                <MenuItem value="tiktok_account">TikTok аккаунты</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Идентификаторы (по одному на строку)"
              value={bulkSources}
              onChange={(event) => setBulkSources(event.target.value)}
              fullWidth
              multiline
              rows={8}
              placeholder={
                sourceType === "vk_group"
                  ? "club123456\nclub789012\n..."
                  : "username1\nusername2\n..."
              }
            />
            <Typography variant="caption" color="text.secondary">
              Введите идентификаторы, каждый на новой строке. Будет добавлено в направление:{" "}
              <strong>{selectedDirection?.name}</strong>
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowBulkDialog(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleBulkAddSources}
            startIcon={<CloudUpload />}
          >
            Добавить все
          </Button>
        </DialogActions>
      </Dialog>

    </Stack>
  );
};

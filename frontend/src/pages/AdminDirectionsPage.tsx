import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
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
  People,
  PersonAdd,
  Block,
  CheckCircle,
  Instagram,
  Code,
  ContentPaste,
  Close,
  Search,
  Edit,
  MoreVert,
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
type UserItem = {
  id: number;
  email: string;
  roles: string[];
  is_active: boolean;
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
  const [users, setUsers] = useState<UserItem[]>([]);

  const [directionName, setDirectionName] = useState("");
  const [sourceType, setSourceType] = useState<Source["source_type"]>("vk_group");
  const [sourceIdentifier, setSourceIdentifier] = useState("");
  const [bulkSources, setBulkSources] = useState("");
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [showUserDialog, setShowUserDialog] = useState(false);

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

  const loadUsers = async () => {
    const data = (await apiFetch("/auth/users")) as UserItem[];
    setUsers(data);
  };

  useEffect(() => {
    const init = async () => {
      setError(null);
      try {
        await Promise.all([loadDirections(), loadUsers()]);
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

  const handleCreateUser = async () => {
    if (!userEmail.trim() || !userPassword.trim()) return;
    setError(null);
    setSuccess(null);
    try {
      await apiFetch("/auth/users", {
        method: "POST",
        body: JSON.stringify({
          email: userEmail.trim(),
          password: userPassword,
          role: userRole,
        }),
      });
      setUserEmail("");
      setUserPassword("");
      setShowUserDialog(false);
      await loadUsers();
      setSuccess("Пользователь создан");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleToggleBlock = async (user: UserItem) => {
    setError(null);
    setSuccess(null);
    try {
      const action = user.is_active ? "block" : "unblock";
      await apiFetch(`/auth/users/${user.id}/${action}`, { method: "POST" });
      await loadUsers();
      setSuccess(user.is_active ? "Пользователь заблокирован" : "Пользователь разблокирован");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const selectedDirection = directions.find((d) => d.id === selectedDirectionId);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "error";
      case "developer":
        return "warning";
      default:
        return "primary";
    }
  };

  const getUserInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  return (
    <Stack spacing={3}>
      {/* Заголовок */}
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Управление направлениями
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Создание направлений, добавление источников и управление пользователями
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
        <Grid item xs={12} lg={4}>
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
        <Grid item xs={12} lg={8}>
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
                  <Grid item xs={12} sm={4}>
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
                  <Grid item xs={12} sm={8}>
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

      {/* Пользователи */}
      <SectionCard
        title="Пользователи системы"
        icon={<People sx={{ color: "#fff", fontSize: 20 }} />}
        headerColor={`linear-gradient(135deg, ${colors.info.main} 0%, ${colors.info.dark} 100%)`}
        action={
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setShowUserDialog(true)}
          >
            Добавить
          </Button>
        }
      >
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Пользователь</TableCell>
                <TableCell>Роли</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: user.is_active
                            ? colors.primary.main
                            : colors.grey[400],
                          fontSize: "0.9rem",
                        }}
                      >
                        {getUserInitials(user.email)}
                      </Avatar>
                      <Box>
                        <Typography fontWeight={500}>{user.email}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {user.id}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {user.roles.map((role) => (
                        <Chip
                          key={role}
                          label={role}
                          size="small"
                          color={getRoleColor(role) as any}
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={user.is_active ? <CheckCircle /> : <Block />}
                      label={user.is_active ? "Активен" : "Заблокирован"}
                      size="small"
                      color={user.is_active ? "success" : "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={user.is_active ? "Заблокировать" : "Разблокировать"}>
                      <IconButton
                        size="small"
                        color={user.is_active ? "error" : "success"}
                        onClick={() => handleToggleBlock(user)}
                      >
                        {user.is_active ? <Block /> : <CheckCircle />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!users.length && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                      <Typography variant="body2">Нет пользователей</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

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

      {/* Диалог создания пользователя */}
      <Dialog
        open={showUserDialog}
        onClose={() => setShowUserDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Создание пользователя</Typography>
            <IconButton onClick={() => setShowUserDialog(false)} size="small">
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Email"
              type="email"
              value={userEmail}
              onChange={(event) => setUserEmail(event.target.value)}
              fullWidth
            />
            <TextField
              label="Пароль"
              type="password"
              value={userPassword}
              onChange={(event) => setUserPassword(event.target.value)}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Роль</InputLabel>
              <Select
                label="Роль"
                value={userRole}
                onChange={(event) => setUserRole(String(event.target.value))}
              >
                <MenuItem value="user">User — только просмотр</MenuItem>
                <MenuItem value="admin">Admin — управление</MenuItem>
                <MenuItem value="developer">Developer — скрапинг</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowUserDialog(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleCreateUser}
            startIcon={<PersonAdd />}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

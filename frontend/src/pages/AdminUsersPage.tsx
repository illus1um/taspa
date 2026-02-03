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
  Block,
  CheckCircle,
  Close,
  Edit,
  Email,
  LockReset,
  People,
  Person,
  PersonAdd,
  Search,
  Shield,
} from "@mui/icons-material";
import { useEffect, useState } from "react";

import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { hasRole } from "../auth/role";
import { colors } from "../theme";

type UserItem = {
  id: number;
  email: string;
  roles: string[];
  is_active: boolean;
  first_name?: string | null;
  last_name?: string | null;
};

const StatCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) => (
  <Card sx={{ height: "100%" }}>
    <CardContent sx={{ p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={700}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: alpha(color, 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

export const AdminUsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Create user dialog
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("user");

  // Edit user dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Role dialog
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  // Reset password dialog
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isDeveloper = currentUser ? hasRole(currentUser.roles, "developer") : false;
  const isAdmin = currentUser ? hasRole(currentUser.roles, "admin") : false;

  useEffect(() => {
    if (!isDeveloper && userRole !== "user") {
      setUserRole("user");
    }
  }, [isDeveloper, userRole]);

  const loadUsers = async () => {
    const data = (await apiFetch("/auth/users")) as UserItem[];
    setUsers(data);
  };

  useEffect(() => {
    const init = async () => {
      setError(null);
      try {
        await loadUsers();
      } catch (err) {
        setError((err as Error).message);
      }
    };
    init();
  }, []);

  const handleCreateUser = async () => {
    if (!userEmail.trim() || !userPassword.trim()) return;
    setError(null);
    setSuccess(null);
    if (!isDeveloper && userRole !== "user") {
      setError("Админ может создавать только пользователей");
      return;
    }
    try {
      await apiFetch("/auth/users", {
        method: "POST",
        body: JSON.stringify({
          email: userEmail.trim(),
          password: userPassword,
          role: isDeveloper ? userRole : "user",
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
        }),
      });
      setFirstName("");
      setLastName("");
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

  const handleOpenEditDialog = (user: UserItem) => {
    setSelectedUser(user);
    setEditFirstName(user.first_name || "");
    setEditLastName(user.last_name || "");
    setEditEmail(user.email);
    setShowEditDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/auth/users/${selectedUser.id}`, {
        method: "PUT",
        body: JSON.stringify({
          first_name: editFirstName.trim() || null,
          last_name: editLastName.trim() || null,
          email: editEmail.trim() || null,
        }),
      });
      setShowEditDialog(false);
      await loadUsers();
      setSuccess("Данные пользователя обновлены");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleOpenRoleDialog = (user: UserItem) => {
    setSelectedUser(user);
    setUserRole(user.roles[0] || "user");
    setShowRoleDialog(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/auth/users/${selectedUser.id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: userRole }),
      });
      setShowRoleDialog(false);
      await loadUsers();
      setSuccess("Роль обновлена");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleOpenResetDialog = (user: UserItem) => {
    setSelectedUser(user);
    setNewPassword("");
    setShowResetDialog(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword.trim()) return;
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/auth/users/${selectedUser.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password: newPassword }),
      });
      setShowResetDialog(false);
      setNewPassword("");
      setSuccess("Пароль обновлён");
    } catch (err) {
      setError((err as Error).message);
    }
  };

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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Админ";
      case "developer":
        return "Разработчик";
      default:
        return "Пользователь";
    }
  };

  const getUserInitials = (email: string, firstName?: string | null, lastName?: string | null) => {
    const first = (firstName || "").trim();
    const last = (lastName || "").trim();
    if (first || last) {
      return `${first.charAt(0)}${last.charAt(0)}`.trim().toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  };

  const getUserFullName = (user: UserItem) => {
    const full = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    return full || "—";
  };

  const canManageUser = (target: UserItem) => {
    if (isDeveloper) return true;
    if (!isAdmin) return false;
    return target.roles.length === 1 && target.roles[0] === "user";
  };

  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      (user.first_name || "").toLowerCase().includes(query) ||
      (user.last_name || "").toLowerCase().includes(query)
    );
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    admins: users.filter((u) => u.roles.includes("admin") || u.roles.includes("developer")).length,
    blocked: users.filter((u) => !u.is_active).length,
  };

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Управление пользователями
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Создание, редактирование и управление доступом пользователей системы
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => setShowUserDialog(true)}
          sx={{
            background: `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`,
            boxShadow: `0 4px 14px ${alpha(colors.primary.main, 0.4)}`,
          }}
        >
          Добавить пользователя
        </Button>
      </Stack>

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

      {/* Stats */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          gap: 2,
        }}
      >
        <StatCard
          label="Всего пользователей"
          value={stats.total}
          icon={<People sx={{ color: colors.primary.main, fontSize: 24 }} />}
          color={colors.primary.main}
        />
        <StatCard
          label="Активных"
          value={stats.active}
          icon={<CheckCircle sx={{ color: colors.success.main, fontSize: 24 }} />}
          color={colors.success.main}
        />
        <StatCard
          label="Администраторов"
          value={stats.admins}
          icon={<Shield sx={{ color: colors.warning.main, fontSize: 24 }} />}
          color={colors.warning.main}
        />
        <StatCard
          label="Заблокированных"
          value={stats.blocked}
          icon={<Block sx={{ color: colors.error.main, fontSize: 24 }} />}
          color={colors.error.main}
        />
      </Box>

      {/* Users Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {/* Search */}
          <Box sx={{ p: 2, borderBottom: `1px solid ${colors.grey[200]}` }}>
            <TextField
              placeholder="Поиск по имени или email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ width: { xs: "100%", sm: 320 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: colors.grey[50] }}>
                  <TableCell sx={{ fontWeight: 600 }}>Пользователь</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Роль</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Статус</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Действия
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    sx={{
                      "&:hover": { bgcolor: alpha(colors.primary.main, 0.02) },
                      transition: "background-color 0.2s",
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: user.is_active ? colors.primary.main : colors.grey[400],
                            fontSize: "0.9rem",
                            fontWeight: 600,
                          }}
                        >
                          {getUserInitials(user.email, user.first_name, user.last_name)}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={500}>{getUserFullName(user)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {user.id}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {user.roles.map((role) => (
                          <Chip
                            key={role}
                            label={getRoleLabel(role)}
                            size="small"
                            color={getRoleColor(role) as any}
                            sx={{ fontWeight: 500 }}
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
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title={canManageUser(user) ? "Редактировать" : "Недостаточно прав"}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEditDialog(user)}
                              disabled={!canManageUser(user)}
                              sx={{
                                color: colors.primary.main,
                                "&:hover": { bgcolor: alpha(colors.primary.main, 0.1) },
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip
                          title={
                            canManageUser(user) && isDeveloper
                              ? "Сменить роль"
                              : "Недостаточно прав"
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenRoleDialog(user)}
                              disabled={!canManageUser(user) || !isDeveloper}
                              sx={{
                                color: colors.warning.main,
                                "&:hover": { bgcolor: alpha(colors.warning.main, 0.1) },
                              }}
                            >
                              <Shield fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={canManageUser(user) ? "Сбросить пароль" : "Недостаточно прав"}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenResetDialog(user)}
                              disabled={!canManageUser(user)}
                              sx={{
                                color: colors.info.main,
                                "&:hover": { bgcolor: alpha(colors.info.main, 0.1) },
                              }}
                            >
                              <LockReset fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip
                          title={
                            canManageUser(user)
                              ? user.is_active
                                ? "Заблокировать"
                                : "Разблокировать"
                              : "Недостаточно прав"
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleBlock(user)}
                              disabled={!canManageUser(user)}
                              sx={{
                                color: user.is_active ? colors.error.main : colors.success.main,
                                "&:hover": {
                                  bgcolor: alpha(
                                    user.is_active ? colors.error.main : colors.success.main,
                                    0.1
                                  ),
                                },
                              }}
                            >
                              {user.is_active ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredUsers.length && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Box sx={{ py: 6, textAlign: "center" }}>
                        <People sx={{ fontSize: 48, color: colors.grey[300], mb: 2 }} />
                        <Typography variant="body1" color="text.secondary">
                          {searchQuery ? "Пользователи не найдены" : "Нет пользователей"}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showUserDialog} onClose={() => setShowUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PersonAdd sx={{ color: "#fff", fontSize: 20 }} />
              </Box>
              <Typography variant="h6" fontWeight={600}>
                Создание пользователя
              </Typography>
            </Stack>
            <IconButton onClick={() => setShowUserDialog(false)} size="small">
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Имя"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Фамилия"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
              />
            </Stack>
            <TextField
              label="Email"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Пароль"
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              fullWidth
              helperText="Минимум 8 символов"
            />
            <FormControl fullWidth>
              <InputLabel>Роль</InputLabel>
              <Select
                label="Роль"
                value={isDeveloper ? userRole : "user"}
                onChange={(e) => setUserRole(String(e.target.value))}
                disabled={!isDeveloper}
              >
                <MenuItem value="user">Пользователь — только просмотр</MenuItem>
                {isDeveloper && <MenuItem value="admin">Админ — управление направлениями</MenuItem>}
                {isDeveloper && <MenuItem value="developer">Разработчик — полный доступ</MenuItem>}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowUserDialog(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleCreateUser} startIcon={<PersonAdd />}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${colors.info.main} 0%, ${colors.info.dark} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Edit sx={{ color: "#fff", fontSize: 20 }} />
              </Box>
              <Typography variant="h6" fontWeight={600}>
                Редактирование пользователя
              </Typography>
            </Stack>
            <IconButton onClick={() => setShowEditDialog(false)} size="small">
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <Box sx={{ p: 2, bgcolor: colors.grey[50], borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Редактирование пользователя
              </Typography>
              <Typography fontWeight={500}>
                {selectedUser?.first_name} {selectedUser?.last_name} ({selectedUser?.email})
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Имя"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                fullWidth
              />
              <TextField
                label="Фамилия"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                fullWidth
              />
            </Stack>
            <TextField
              label="Email"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowEditDialog(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleUpdateUser} startIcon={<Edit />}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={showRoleDialog} onClose={() => setShowRoleDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${colors.warning.main} 0%, ${colors.warning.dark} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Shield sx={{ color: "#fff", fontSize: 20 }} />
              </Box>
              <Typography variant="h6" fontWeight={600}>
                Смена роли
              </Typography>
            </Stack>
            <IconButton onClick={() => setShowRoleDialog(false)} size="small">
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <Box sx={{ p: 2, bgcolor: colors.grey[50], borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Пользователь
              </Typography>
              <Typography fontWeight={500}>{selectedUser?.email}</Typography>
            </Box>
            <FormControl fullWidth>
              <InputLabel>Роль</InputLabel>
              <Select
                label="Роль"
                value={userRole}
                onChange={(e) => setUserRole(String(e.target.value))}
              >
                <MenuItem value="user">Пользователь</MenuItem>
                <MenuItem value="admin">Админ</MenuItem>
                <MenuItem value="developer">Разработчик</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowRoleDialog(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleUpdateRole}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onClose={() => setShowResetDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${colors.error.main} 0%, ${colors.error.dark} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LockReset sx={{ color: "#fff", fontSize: 20 }} />
              </Box>
              <Typography variant="h6" fontWeight={600}>
                Сброс пароля
              </Typography>
            </Stack>
            <IconButton onClick={() => setShowResetDialog(false)} size="small">
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <Box sx={{ p: 2, bgcolor: colors.grey[50], borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Пользователь
              </Typography>
              <Typography fontWeight={500}>{selectedUser?.email}</Typography>
            </Box>
            <TextField
              label="Новый пароль"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              helperText="Минимум 8 символов"
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowResetDialog(false)}>Отмена</Button>
          <Button variant="contained" color="error" onClick={handleResetPassword} startIcon={<LockReset />}>
            Сбросить пароль
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

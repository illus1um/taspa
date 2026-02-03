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
  People,
  PersonAdd,
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
};

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
        {action}
      </Stack>
      {children}
    </CardContent>
  </Card>
);

export const AdminUsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [showUserDialog, setShowUserDialog] = useState(false);
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

  const canManageUser = (target: UserItem) => {
    if (isDeveloper) return true;
    if (!isAdmin) return false;
    return target.roles.length === 1 && target.roles[0] === "user";
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Пользователи системы
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Создание пользователей и управление доступом
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

      <SectionCard
        title="Пользователи"
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
                          bgcolor: user.is_active ? colors.primary.main : colors.grey[400],
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
                    <Tooltip
                      title={
                        canManageUser(user)
                          ? user.is_active
                            ? "Заблокировать"
                            : "Разблокировать"
                          : "Недостаточно прав для этого пользователя"
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          color={user.is_active ? "error" : "success"}
                          onClick={() => handleToggleBlock(user)}
                          disabled={!canManageUser(user)}
                        >
                          {user.is_active ? <Block /> : <CheckCircle />}
                        </IconButton>
                      </span>
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
                value={isDeveloper ? userRole : "user"}
                onChange={(event) => setUserRole(String(event.target.value))}
                disabled={!isDeveloper}
              >
                <MenuItem value="user">User — только просмотр</MenuItem>
                {isDeveloper && <MenuItem value="admin">Admin — управление</MenuItem>}
                {isDeveloper && (
                  <MenuItem value="developer">Developer — скрапинг</MenuItem>
                )}
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

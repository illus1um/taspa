import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import {
  Badge,
  Email,
  Lock,
  Person,
  Save,
  Shield,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useEffect, useState } from "react";

import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { hasRole } from "../auth/role";
import { colors } from "../theme";

export const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(user?.first_name ?? "");
    setLastName(user?.last_name ?? "");
  }, [user?.first_name, user?.last_name]);

  const handleSaveProfile = async () => {
    setError(null);
    setSuccess(null);
    try {
      await apiFetch("/auth/me", {
        method: "PUT",
        body: JSON.stringify({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
        }),
      });
      await refreshUser();
      setSuccess("Профиль обновлён");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(null);
    if (!currentPassword || !newPassword) {
      setError("Заполните текущий и новый пароль");
      return;
    }
    if (newPassword.length < 8) {
      setError("Новый пароль должен содержать минимум 8 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    try {
      await apiFetch("/auth/me/password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Пароль успешно изменён");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const getUserInitials = () => {
    const first = (user?.first_name || "").trim();
    const last = (user?.last_name || "").trim();
    if (first || last) {
      return `${first.charAt(0)}${last.charAt(0)}`.trim().toUpperCase();
    }
    return (user?.email || "U").charAt(0).toUpperCase();
  };

  const getUserFullName = () => {
    const first = user?.first_name?.trim();
    const last = user?.last_name?.trim();
    const full = [first, last].filter(Boolean).join(" ");
    return full || "Не указано";
  };

  const getRoleBadge = () => {
    if (hasRole(user?.roles || [], "developer"))
      return { label: "Разработчик", color: colors.warning.main };
    if (hasRole(user?.roles || [], "admin")) return { label: "Админ", color: colors.error.main };
    return { label: "Пользователь", color: colors.primary.main };
  };

  const roleBadge = getRoleBadge();

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Мой профиль
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Управление личными данными и настройками безопасности
        </Typography>
      </Box>

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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "340px 1fr" },
          gap: 3,
        }}
      >
        {/* Profile Card */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            {/* Header with gradient */}
            <Box
              sx={{
                height: 100,
                background: `linear-gradient(135deg, ${colors.primary.dark} 0%, ${colors.primary.main} 50%, ${colors.secondary.main} 100%)`,
                position: "relative",
              }}
            />

            {/* Avatar and info */}
            <Box sx={{ px: 3, pb: 3 }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: "#fff",
                  color: colors.primary.main,
                  fontSize: "2rem",
                  fontWeight: 700,
                  border: `4px solid #fff`,
                  boxShadow: `0 4px 14px ${alpha(colors.primary.main, 0.25)}`,
                  mt: -6,
                  mb: 2,
                }}
              >
                {getUserInitials()}
              </Avatar>

              <Typography variant="h6" fontWeight={700} gutterBottom>
                {getUserFullName()}
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Email sx={{ fontSize: 18, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                  Роли в системе
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {(user?.roles || []).map((role) => (
                    <Chip
                      key={role}
                      icon={<Shield sx={{ fontSize: 16 }} />}
                      label={
                        role === "developer"
                          ? "Разработчик"
                          : role === "admin"
                          ? "Админ"
                          : "Пользователь"
                      }
                      size="small"
                      sx={{
                        bgcolor: alpha(
                          role === "developer"
                            ? colors.warning.main
                            : role === "admin"
                            ? colors.error.main
                            : colors.primary.main,
                          0.1
                        ),
                        color:
                          role === "developer"
                            ? colors.warning.dark
                            : role === "admin"
                            ? colors.error.dark
                            : colors.primary.dark,
                        fontWeight: 500,
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Settings Cards */}
        <Stack spacing={3}>
          {/* Personal Info Card */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
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
                  <Person sx={{ color: "#fff", fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Личные данные
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Измените ваше имя и фамилию
                  </Typography>
                </Box>
              </Stack>

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
                          <Badge sx={{ color: "text.secondary" }} />
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
                  value={user?.email || ""}
                  fullWidth
                  disabled
                  helperText="Email изменить нельзя"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    variant="contained"
                    onClick={handleSaveProfile}
                    startIcon={<Save />}
                    sx={{
                      background: `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`,
                      boxShadow: `0 4px 14px ${alpha(colors.primary.main, 0.4)}`,
                    }}
                  >
                    Сохранить изменения
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Password Card */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
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
                  <Lock sx={{ color: "#fff", fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Безопасность
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Измените пароль для входа в систему
                  </Typography>
                </Box>
              </Stack>

              <Stack spacing={2.5}>
                <TextField
                  label="Текущий пароль"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Box
                          component="span"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          sx={{ cursor: "pointer", display: "flex" }}
                        >
                          {showCurrentPassword ? (
                            <VisibilityOff sx={{ color: "text.secondary" }} />
                          ) : (
                            <Visibility sx={{ color: "text.secondary" }} />
                          )}
                        </Box>
                      </InputAdornment>
                    ),
                  }}
                />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Новый пароль"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    fullWidth
                    helperText="Минимум 8 символов"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Box
                            component="span"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            sx={{ cursor: "pointer", display: "flex" }}
                          >
                            {showNewPassword ? (
                              <VisibilityOff sx={{ color: "text.secondary" }} />
                            ) : (
                              <Visibility sx={{ color: "text.secondary" }} />
                            )}
                          </Box>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Повторите пароль"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth
                    error={confirmPassword !== "" && newPassword !== confirmPassword}
                    helperText={
                      confirmPassword !== "" && newPassword !== confirmPassword
                        ? "Пароли не совпадают"
                        : " "
                    }
                  />
                </Stack>

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    variant="outlined"
                    onClick={handleChangePassword}
                    startIcon={<Lock />}
                    sx={{
                      borderColor: colors.warning.main,
                      color: colors.warning.dark,
                      "&:hover": {
                        borderColor: colors.warning.dark,
                        bgcolor: alpha(colors.warning.main, 0.05),
                      },
                    }}
                  >
                    Обновить пароль
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Stack>
  );
};

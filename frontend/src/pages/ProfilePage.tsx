import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { colors } from "../theme";

export const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      setError("Новый пароль слишком короткий");
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
      setSuccess("Пароль изменён");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Профиль
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Управление личными данными и паролем
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
        <Grid xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Личные данные
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Имя"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  fullWidth
                />
                <TextField
                  label="Фамилия"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  fullWidth
                />
                <TextField label="Email" value={user?.email || ""} fullWidth disabled />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Роли
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }} useFlexGap>
                    {(user?.roles || []).map((role) => (
                      <Chip key={role} label={role} size="small" />
                    ))}
                  </Stack>
                </Box>
                <Button variant="contained" onClick={handleSaveProfile}>
                  Сохранить
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Смена пароля
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Текущий пароль"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  fullWidth
                />
                <TextField
                  label="Новый пароль"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  fullWidth
                />
                <TextField
                  label="Повторите пароль"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  fullWidth
                />
                <Button
                  variant="outlined"
                  onClick={handleChangePassword}
                  sx={{ borderColor: colors.primary.main }}
                >
                  Обновить пароль
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
} from "@mui/icons-material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { getDefaultPath } from "../auth/role";
import { colors } from "../theme";

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok || !result.roles) {
      setError("Неверный логин или пароль");
      return;
    }
    navigate(getDefaultPath(result.roles), { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${colors.primary.dark} 0%, ${colors.primary.main} 50%, ${colors.primary.light} 100%)`,
        padding: 3,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Декоративные элементы - круги как в логотипе */}
      <Box
        sx={{
          position: "absolute",
          top: "10%",
          right: "10%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          border: `2px solid ${alpha("#fff", 0.1)}`,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "15%",
          right: "15%",
          width: 200,
          height: 200,
          borderRadius: "50%",
          border: `2px solid ${alpha("#fff", 0.08)}`,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "10%",
          left: "5%",
          width: 250,
          height: 250,
          borderRadius: "50%",
          border: `2px solid ${alpha("#fff", 0.1)}`,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "15%",
          left: "10%",
          width: 150,
          height: 150,
          borderRadius: "50%",
          border: `2px solid ${alpha("#fff", 0.08)}`,
        }}
      />
      {/* Точки-узлы как в логотипе */}
      <Box
        sx={{
          position: "absolute",
          top: "20%",
          left: "20%",
          width: 12,
          height: 12,
          borderRadius: "50%",
          bgcolor: alpha("#fff", 0.3),
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "40%",
          right: "25%",
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: alpha("#fff", 0.2),
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "30%",
          right: "15%",
          width: 10,
          height: 10,
          borderRadius: "50%",
          bgcolor: alpha("#fff", 0.25),
        }}
      />

      <Paper
        elevation={6}
        sx={{
          p: { xs: 3, sm: 5 },
          width: "100%",
          maxWidth: 440,
          borderRadius: 4,
          position: "relative",
          background: "#ffffff",
          overflow: "hidden",
        }}
      >
        {/* Градиентная полоска сверху */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${colors.primary.main}, ${colors.secondary.main})`,
          }}
        />

        <Stack spacing={4}>
          {/* Логотип */}
          <Box sx={{ textAlign: "center" }}>
            <Box
              component="img"
              src="/assets/original.png"
              alt="TASPA"
              sx={{
                width: 140,
                height: "auto",
                mb: 2,
              }}
            />
            <Typography variant="body2" color="text.secondary">
              Платформа аналитики социальных сетей
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{ borderRadius: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Форма */}
          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: colors.grey[400] }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: colors.grey[50],
                  "&:hover": {
                    backgroundColor: "#fff",
                  },
                  "&.Mui-focused": {
                    backgroundColor: "#fff",
                  },
                },
                "& .MuiInputBase-input": {
                  paddingLeft: 1,
                },
              }}
            />
            <TextField
              label="Пароль"
              type={showPassword ? "text" : "password"}
              fullWidth
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: colors.grey[400] }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? (
                        <VisibilityOff sx={{ fontSize: 20 }} />
                      ) : (
                        <Visibility sx={{ fontSize: 20 }} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: colors.grey[50],
                  "&:hover": {
                    backgroundColor: "#fff",
                  },
                  "&.Mui-focused": {
                    backgroundColor: "#fff",
                  },
                },
                "& .MuiInputBase-input": {
                  paddingLeft: 1,
                },
              }}
            />
            <Button
              variant="contained"
              type="submit"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                fontSize: "1rem",
                background: `linear-gradient(135deg, ${colors.primary.light} 0%, ${colors.primary.main} 100%)`,
                boxShadow: `0 4px 14px ${alpha(colors.primary.main, 0.4)}`,
                "&:hover": {
                  background: `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`,
                  boxShadow: `0 6px 20px ${alpha(colors.primary.main, 0.5)}`,
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: "#fff" }} />
              ) : (
                "Войти в систему"
              )}
            </Button>
          </Stack>

          {/* Футер */}
          <Box sx={{ textAlign: "center", pt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              VK · Instagram · TikTok
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

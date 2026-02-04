import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import {
  Assignment,
  Memory,
  Person,
  Shield,
} from "@mui/icons-material";
import { BarChart, Users, ShieldAlert, Instagram  } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ChartLine } from 'lucide-react';
import { useAuth } from "../auth/AuthContext";
import { hasRole } from "../auth/role";
import { colors } from "../theme";

const QuickActionCard = ({
  title,
  description,
  icon,
  gradient,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  onClick: () => void;
}) => (
  <Card
    sx={{
      height: "100%",
      transition: "all 0.3s ease",
      "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: `0 12px 24px ${alpha(colors.primary.main, 0.15)}`,
      },
    }}
  >
    <CardActionArea onClick={onClick} sx={{ height: "100%", p: 0 }}>
      <CardContent sx={{ p: 3, height: "100%" }}>
        <Stack spacing={2}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              background: gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 8px 16px ${alpha(colors.primary.main, 0.2)}`,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </CardActionArea>
  </Card>
);

const StatCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
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

export const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getUserName = () => {
    const first = user?.first_name?.trim();
    const last = user?.last_name?.trim();
    const full = [first, last].filter(Boolean).join(" ");
    return full || user?.email?.split("@")[0] || "Пользователь";
  };

  const getUserInitials = () => {
    const first = (user?.first_name || "").trim();
    const last = (user?.last_name || "").trim();
    if (first || last) {
      return `${first.charAt(0)}${last.charAt(0)}`.trim().toUpperCase();
    }
    return (user?.email || "U").charAt(0).toUpperCase();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Доброе утро";
    if (hour < 18) return "Добрый день";
    return "Добрый вечер";
  };

  const getRoleBadge = () => {
    if (hasRole(user?.roles || [], "developer")) return { label: "Developer", color: colors.warning.main };
    if (hasRole(user?.roles || [], "admin")) return { label: "Admin", color: colors.error.main };
    return { label: "User", color: colors.primary.main };
  };

  const roleBadge = getRoleBadge();
  const isDeveloper = hasRole(user?.roles || [], "developer");
  const isAdmin = hasRole(user?.roles || [], "admin");

  const quickActions = [
    {
      title: "VK Аналитика",
      description: "Просмотр данных ВКонтакте групп и участников",
      icon: <Typography sx={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>VK</Typography>,
      gradient: `linear-gradient(135deg, #5181b8 0%, #3b5998 100%)`,
      onClick: () => navigate("/analytics/vk"),
      show: true,
    },
    {
      title: "Instagram Аналитика",
      description: "Анализ Instagram аккаунтов по регионам",
      icon: <Instagram size={28} color="#fff" />,
      gradient: `linear-gradient(135deg, #f09433 0%, #e6683c 50%, #dc2743 100%)`,
      onClick: () => navigate("/analytics/instagram"),
      show: true,
    },
    {
      title: "TikTok Аналитика",
      description: "Мониторинг TikTok аккаунтов и подписчиков",
      icon: <BarChart size={28} color="#fff" />,
      gradient: `linear-gradient(135deg, #25f4ee 0%, #fe2c55 100%)`,
      onClick: () => navigate("/analytics/tiktok"),
      show: true,
    },
    {
      title: "Направления",
      description: "Управление направлениями и источниками данных",
      icon: <Assignment sx={{ color: "#fff", fontSize: 28 }} />,
      gradient: `linear-gradient(135deg, ${colors.info.main} 0%, ${colors.info.dark} 100%)`,
      onClick: () => navigate("/admin"),
      show: isAdmin,
    },
    {
      title: "Пользователи",
      description: "Управление пользователями системы",
      icon: <Users size={28} color="#fff" />,
      gradient: `linear-gradient(135deg, ${colors.secondary.main} 0%, ${colors.secondary.dark} 100%)`,
      onClick: () => navigate("/admin/users"),
      show: isAdmin,
    },
    {
      title: "Скрапинг",
      description: "Управление задачами сбора данных",
      icon: <Memory sx={{ color: "#fff", fontSize: 28 }} />,
      gradient: `linear-gradient(135deg, ${colors.warning.main} 0%, ${colors.warning.dark} 100%)`,
      onClick: () => navigate("/developer"),
      show: isDeveloper,
    },
  ].filter((action) => action.show);

  return (
    <Stack spacing={4}>
      {/* Welcome Section */}
      <Card
        sx={{
          background: `linear-gradient(135deg, ${colors.primary.dark} 0%, ${colors.primary.main} 50%, ${colors.secondary.main} 100%)`,
          color: "#fff",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: alpha("#fff", 0.05),
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -30,
            right: 100,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: alpha("#fff", 0.03),
          }}
        />
        <CardContent sx={{ p: { xs: 3, md: 4 }, position: "relative", zIndex: 1 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={3}
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: alpha("#fff", 0.2),
                fontSize: "1.75rem",
                fontWeight: 700,
                border: `3px solid ${alpha("#fff", 0.3)}`,
              }}
            >
              {getUserInitials()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h4" fontWeight={700}>
                  {getGreeting()}, {getUserName()}!
                </Typography>
                <Chip
                  icon={<Shield sx={{ fontSize: 16 }} />}
                  label={roleBadge.label}
                  size="small"
                  sx={{
                    bgcolor: alpha("#fff", 0.2),
                    color: "#fff",
                    fontWeight: 600,
                    "& .MuiChip-icon": { color: "#fff" },
                  }}
                />
              </Stack>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Добро пожаловать в аналитическую платформу ТАСПА
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Stats Section */}
      <Box>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Обзор системы
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(4, 1fr)",
            },
            gap: 2,
          }}
        >
          <StatCard
            label="Направлений"
            value="—"
            icon={<Assignment sx={{ color: colors.primary.main, fontSize: 24 }} />}
            color={colors.primary.main}
          />
          <StatCard
            label="VK групп"
            value="—"
            icon={<Users size={24} color={colors.info.main} />}
            color={colors.info.main}
          />
          <StatCard
            label="Instagram аккаунтов"
            value="—"
            icon={<Person sx={{ color: "#e6683c", fontSize: 24 }} />}
            color="#e6683c"
          />
          <StatCard
            label="TikTok аккаунтов"
            value="—"
            icon={<Person sx={{ color: "#fe2c55", fontSize: 24 }} />}
            color="#fe2c55"
          />
        </Box>
      </Box>

      {/* Quick Actions */}
      <Box>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Быстрые действия
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
            },
            gap: 2,
          }}
        >
          {quickActions.map((action) => (
            <QuickActionCard
              key={action.title}
              title={action.title}
              description={action.description}
              icon={action.icon}
              gradient={action.gradient}
              onClick={action.onClick}
            />
          ))}
        </Box>
      </Box>

      {/* Info Section */}
      <Card sx={{ bgcolor: alpha(colors.info.main, 0.05), border: `1px solid ${alpha(colors.info.main, 0.2)}` }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: alpha(colors.info.main, 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ShieldAlert size={24} color={colors.info.main} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                О платформе ТАСПА
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Программный комплекс «ТАСПА» предназначен для мониторинга социальных сетей, анализа деятельности религиозных течений, выявления взаимосвязей, тенденций, источников пропаганды
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

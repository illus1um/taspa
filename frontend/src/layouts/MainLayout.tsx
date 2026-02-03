import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Collapse,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  alpha,
  Divider,
  Badge,
} from "@mui/material";
import {
  Dashboard,
  AdminPanelSettings,
  Code,
  Logout,
  Person,
  Menu as MenuIcon,
  ChevronLeft,
  Notifications,
  Settings,
  ExpandMore,
  People,
} from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { hasRole } from "../auth/role";
import { colors } from "../theme";

const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  show: boolean;
};

export const MainLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);

  const navItems: NavItem[] = [
    {
      label: "Направления",
      to: "/admin",
      icon: <AdminPanelSettings />,
      show: user ? hasRole(user.roles, "admin") : false,
    },
    {
      label: "Пользователи",
      to: "/admin/users",
      icon: <People />,
      show: user ? hasRole(user.roles, "admin") : false,
    },
    {
      label: "Скрапинг",
      to: "/developer",
      icon: <Code />,
      show: user ? hasRole(user.roles, "developer") : false,
    },
  ].filter((item) => item.show);

  const analyticsItems = useMemo(
    () => [
      { label: "VK", to: "/analytics/vk", color: "#4A76A8" },
      { label: "Instagram", to: "/analytics/instagram", color: "#E1306C" },
      { label: "TikTok", to: "/analytics/tiktok", color: "#111827" },
    ],
    []
  );

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleAnalyticsToggle = () => {
    if (collapsed && !isMobile) {
      handleNavigate("/analytics/vk");
      return;
    }
    setAnalyticsOpen((prev) => !prev);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  useEffect(() => {
    if (location.pathname.startsWith("/analytics")) {
      setAnalyticsOpen(true);
    }
  }, [location.pathname]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  const getUserInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const getRoleBadge = () => {
    if (user?.roles.includes("developer")) return "Dev";
    if (user?.roles.includes("admin")) return "Admin";
    return "User";
  };

  const drawerWidth = isMobile ? DRAWER_WIDTH : collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;
  const isAnalyticsActive = location.pathname.startsWith("/analytics");

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith("/analytics/vk")) {
      return "VK аналитика";
    }
    if (location.pathname.startsWith("/analytics/instagram")) {
      return "Instagram аналитика";
    }
    if (location.pathname.startsWith("/analytics/tiktok")) {
      return "TikTok аналитика";
    }
    if (location.pathname.startsWith("/admin/users")) {
      return "Пользователи";
    }
    const navMatch = navItems.find((item) => location.pathname.startsWith(item.to));
    return navMatch?.label || "Аналитика";
  }, [location.pathname, navItems]);

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(180deg, ${colors.primary.dark} 0%, ${colors.primary.main} 100%)`,
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed && !isMobile ? "center" : "space-between",
          minHeight: 72,
          gap: 1,
        }}
      >
        {!collapsed && (
          <Box
            sx={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              flex: 1,
            }}
            onClick={() => handleNavigate("/user")}
          >
            <Box
              component="img"
              src="/assets/white_on_trans.png"
              alt="TASPA"
              sx={{
                height: 44,
                width: "auto",
              }}
            />
          </Box>
        )}
        {!isMobile && (
          <IconButton
            onClick={() => setCollapsed(!collapsed)}
            sx={{ color: alpha("#fff", 0.6), "&:hover": { color: "#fff" } }}
            size="small"
          >
            <ChevronLeft
              sx={{
                transform: collapsed ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: alpha("#fff", 0.1) }} />

      {/* Navigation */}
      <List sx={{ flex: 1, py: 2, px: 1 }}>
        {/* Analytics section */}
        <Tooltip title={collapsed && !isMobile ? "Аналитика" : ""} placement="right">
          <ListItemButton
            onClick={handleAnalyticsToggle}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              py: 1.25,
              px: collapsed && !isMobile ? 1.5 : 2,
              justifyContent: collapsed && !isMobile ? "center" : "flex-start",
              backgroundColor: isAnalyticsActive ? alpha("#fff", 0.15) : "transparent",
              "&:hover": {
                backgroundColor: isAnalyticsActive ? alpha("#fff", 0.2) : alpha("#fff", 0.08),
              },
              transition: "all 0.2s",
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: collapsed && !isMobile ? 0 : 40,
                color: isAnalyticsActive ? "#fff" : alpha("#fff", 0.7),
              }}
            >
              <Dashboard />
            </ListItemIcon>
            {(!collapsed || isMobile) && (
              <>
                <ListItemText
                  primary="Аналитика"
                  primaryTypographyProps={{
                    fontWeight: isAnalyticsActive ? 600 : 500,
                    fontSize: "0.9rem",
                    color: isAnalyticsActive ? "#fff" : alpha("#fff", 0.8),
                  }}
                />
                <ExpandMore
                  sx={{
                    color: alpha("#fff", 0.7),
                    transform: analyticsOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </>
            )}
          </ListItemButton>
        </Tooltip>

        <Collapse in={analyticsOpen && (!collapsed || isMobile)} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 2 }}>
            {analyticsItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <ListItemButton
                  key={item.to}
                  onClick={() => handleNavigate(item.to)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    py: 1,
                    px: 2,
                    backgroundColor: isActive ? alpha("#fff", 0.15) : "transparent",
                    "&:hover": {
                      backgroundColor: isActive ? alpha("#fff", 0.2) : alpha("#fff", 0.08),
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: item.color,
                        boxShadow: `0 0 0 2px ${alpha(item.color, 0.25)}`,
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 500,
                      fontSize: "0.85rem",
                      color: isActive ? "#fff" : alpha("#fff", 0.8),
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Collapse>

        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Tooltip
              key={item.to}
              title={collapsed && !isMobile ? item.label : ""}
              placement="right"
            >
              <ListItemButton
                onClick={() => handleNavigate(item.to)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  py: 1.25,
                  px: collapsed && !isMobile ? 1.5 : 2,
                  justifyContent: collapsed && !isMobile ? "center" : "flex-start",
                  backgroundColor: isActive
                    ? alpha("#fff", 0.15)
                    : "transparent",
                  "&:hover": {
                    backgroundColor: isActive
                      ? alpha("#fff", 0.2)
                      : alpha("#fff", 0.08),
                  },
                  transition: "all 0.2s",
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed && !isMobile ? 0 : 40,
                    color: isActive ? "#fff" : alpha("#fff", 0.7),
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {(!collapsed || isMobile) && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 500,
                      fontSize: "0.9rem",
                      color: isActive ? "#fff" : alpha("#fff", 0.8),
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      {/* User info */}
      <Box sx={{ p: 2 }}>
        <Divider sx={{ borderColor: alpha("#fff", 0.15), mb: 2 }} />
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.5,
            borderRadius: 2,
            backgroundColor: alpha("#fff", 0.1),
            cursor: "pointer",
            justifyContent: collapsed && !isMobile ? "center" : "flex-start",
            "&:hover": {
              backgroundColor: alpha("#fff", 0.15),
            },
          }}
          onClick={handleMenuOpen}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: colors.secondary.main,
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            {user ? getUserInitials(user.email) : "?"}
          </Avatar>
          {(!collapsed || isMobile) && (
            <Box sx={{ flex: 1, overflow: "hidden" }}>
              <Typography
                variant="body2"
                sx={{
                  color: "#fff",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.email}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: alpha("#fff", 0.7) }}
              >
                {getRoleBadge()}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            border: "none",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            border: "none",
            transition: "width 0.2s ease-in-out",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          minWidth: 0, // Важно для flex-контейнера
          overflow: "hidden",
        }}
      >
        {/* Top bar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            backgroundColor: "background.paper",
            borderBottom: `1px solid ${colors.grey[200]}`,
          }}
        >
          <Toolbar sx={{ justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton
                onClick={handleDrawerToggle}
                sx={{ display: { md: "none" } }}
              >
                <MenuIcon />
              </IconButton>
              <Typography
                variant="h6"
                sx={{ color: colors.grey[800], fontWeight: 600 }}
              >
                {pageTitle}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Уведомления">
                <IconButton sx={{ color: colors.grey[600] }}>
                  <Badge badgeContent={0} color="error">
                    <Notifications />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="Настройки">
                <IconButton sx={{ color: colors.grey[600] }}>
                  <Settings />
                </IconButton>
              </Tooltip>
              <Tooltip title="Профиль">
                <IconButton onClick={handleMenuOpen} sx={{ ml: 1 }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: colors.primary.main,
                      fontSize: "0.9rem",
                    }}
                  >
                    {user ? getUserInitials(user.email) : "?"}
                  </Avatar>
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box sx={{ flex: 1, p: { xs: 2, sm: 3, md: 4 }, overflow: "auto" }}>
          <Outlet />
        </Box>
      </Box>

      {/* User menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 180,
            borderRadius: 2,
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${colors.grey[100]}` }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {user?.email}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.roles.join(", ")}
          </Typography>
        </Box>
        <MenuItem onClick={handleMenuClose} sx={{ py: 1.25 }}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Профиль" />
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ py: 1.25 }}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Настройки" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ py: 1.25, color: colors.error.main }}>
          <ListItemIcon>
            <Logout fontSize="small" sx={{ color: colors.error.main }} />
          </ListItemIcon>
          <ListItemText primary="Выйти" />
        </MenuItem>
      </Menu>
    </Box>
  );
};

import {
  Alert,
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
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
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
  LinearProgress,
} from "@mui/material";
import {
  PlayArrow,
  Stop,
  Refresh,
  Settings,
  Terminal,
  Speed,
  VpnKey,
  CloudQueue,
  Dns,
  FilterList,
  Clear,
  Close,
  Save,
  Visibility,
  VisibilityOff,
  Schedule,
  CheckCircle,
  Error,
  HourglassEmpty,
  Cancel,
} from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

import { apiFetch, getToken } from "../api/client";
import { colors } from "../theme";

type Direction = { id: number; name: string };
type JobItem = {
  id: number;
  service_name: string;
  direction_id: number;
  status: string;
  created_at: string;
};
type LogItem = {
  job_id: number;
  level: string;
  message: string;
  created_at?: string;
};
type ServiceConfig = {
  proxies: string[];
  api_key?: string | null;
  requests_per_min?: number | null;
  concurrency?: number | null;
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
        sx={{ mb: 2 }}
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

// Иконка статуса задачи
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "finished":
      return <CheckCircle sx={{ color: colors.success.main, fontSize: 18 }} />;
    case "failed":
      return <Error sx={{ color: colors.error.main, fontSize: 18 }} />;
    case "running":
      return <HourglassEmpty sx={{ color: colors.warning.main, fontSize: 18 }} />;
    case "stopped":
      return <Cancel sx={{ color: colors.grey[500], fontSize: 18 }} />;
    default:
      return <Schedule sx={{ color: colors.grey[400], fontSize: 18 }} />;
  }
};

// Цвет статуса
const getStatusColor = (status: string): "success" | "error" | "warning" | "default" | "info" => {
  switch (status) {
    case "finished":
      return "success";
    case "failed":
      return "error";
    case "running":
      return "warning";
    case "stopped":
      return "default";
    default:
      return "info";
  }
};

// Название сервиса
const getServiceLabel = (service: string) => {
  switch (service) {
    case "vk":
      return "ВКонтакте";
    case "instagram":
      return "Instagram";
    case "tiktok":
      return "TikTok";
    default:
      return service;
  }
};

// Цвет сервиса
const getServiceColor = (service: string) => {
  switch (service) {
    case "vk":
      return "#4A76A8";
    case "instagram":
      return "#E1306C";
    case "tiktok":
      return "#000000";
    default:
      return colors.grey[500];
  }
};

export const DeveloperScrapingPage = () => {
  const [directions, setDirections] = useState<Direction[]>([]);
  const [directionId, setDirectionId] = useState<number | "">("");
  const [serviceName, setServiceName] = useState("vk");
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [logJobFilter, setLogJobFilter] = useState<number | "all">("all");
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  const [configService, setConfigService] = useState("vk");
  const [proxiesText, setProxiesText] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [rpm, setRpm] = useState("");
  const [concurrency, setConcurrency] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const data = (await apiFetch("/directions")) as Direction[];
        setDirections(data);
        setDirectionId(data[0]?.id ?? "");
      } catch (err) {
        setError((err as Error).message);
      }
    };
    init();
  }, []);

  const loadJobs = async () => {
    try {
      const data = (await apiFetch("/scrape/jobs")) as JobItem[];
      setJobs(data);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const loadConfig = async (service: string) => {
    try {
      const data = (await apiFetch(`/scrape/config/${service}`)) as ServiceConfig;
      setProxiesText((data.proxies || []).join("\n"));
      setApiKey(data.api_key ?? "");
      setRpm(data.requests_per_min?.toString() ?? "");
      setConcurrency(data.concurrency?.toString() ?? "");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }
    const interval = setInterval(() => {
      loadJobs();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    loadConfig(configService);
  }, [configService]);

  const handleStart = async () => {
    if (!directionId) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await apiFetch("/scrape/start", {
        method: "POST",
        body: JSON.stringify({
          service_name: serviceName,
          direction_id: directionId,
        }),
      });
      await loadJobs();
      setSuccess("Задача создана и запущена");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleStop = async (jobId: number) => {
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/scrape/jobs/${jobId}/stop`, { method: "POST" });
      await loadJobs();
      setSuccess("Задача остановлена");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSaveConfig = async () => {
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/scrape/config/${configService}`, {
        method: "PUT",
        body: JSON.stringify({
          proxies: proxiesText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          api_key: apiKey || null,
          requests_per_min: rpm ? Number(rpm) : null,
          concurrency: concurrency ? Number(concurrency) : null,
        }),
      });
      setSuccess("Конфигурация сохранена");
      setShowConfigDialog(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      return;
    }
    const socket = io("/ws", {
      path: "/ws/socket.io",
      query: { token },
    });
    socket.on("log", (payload: LogItem) => {
      setLogs((prev) => [payload, ...prev].slice(0, 200));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (logJobFilter === "all") {
      return;
    }
    const exists = jobs.some((job) => job.id === logJobFilter);
    if (!exists) {
      setLogJobFilter("all");
    }
  }, [jobs, logJobFilter]);

  const directionMap = useMemo(
    () => new Map(directions.map((direction) => [direction.id, direction.name])),
    [directions]
  );

  const filteredLogs = useMemo(() => {
    if (logJobFilter === "all") {
      return logs;
    }
    return logs.filter((log) => log.job_id === logJobFilter);
  }, [logs, logJobFilter]);

  const runningJobs = jobs.filter((j) => j.status === "running").length;
  const selectedDirection = directions.find((d) => d.id === directionId);

  return (
    <Stack spacing={3}>
      {/* Заголовок */}
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Управление скрапингом
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Запуск задач, мониторинг и настройка скраперов
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

      {/* Статистика */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)` }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ color: alpha("#fff", 0.8) }}>
                    Всего задач
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: "#fff" }}>
                    {jobs.length}
                  </Typography>
                </Box>
                <CloudQueue sx={{ fontSize: 40, color: alpha("#fff", 0.3) }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: `linear-gradient(135deg, ${colors.warning.main} 0%, ${colors.warning.dark} 100%)` }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ color: alpha("#fff", 0.8) }}>
                    Выполняются
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: "#fff" }}>
                    {runningJobs}
                  </Typography>
                </Box>
                <PlayArrow sx={{ fontSize: 40, color: alpha("#fff", 0.3) }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: `linear-gradient(135deg, ${colors.success.main} 0%, ${colors.success.dark} 100%)` }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ color: alpha("#fff", 0.8) }}>
                    Завершено
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: "#fff" }}>
                    {jobs.filter((j) => j.status === "finished").length}
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, color: alpha("#fff", 0.3) }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: `linear-gradient(135deg, ${colors.error.main} 0%, ${colors.error.dark} 100%)` }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ color: alpha("#fff", 0.8) }}>
                    Ошибок
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: "#fff" }}>
                    {jobs.filter((j) => j.status === "failed").length}
                  </Typography>
                </Box>
                <Error sx={{ fontSize: 40, color: alpha("#fff", 0.3) }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Запуск задач */}
        <Grid item xs={12} lg={4}>
          <SectionCard
            title="Новая задача"
            icon={<PlayArrow sx={{ color: "#fff", fontSize: 20 }} />}
            headerColor={`linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`}
          >
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Направление</InputLabel>
                <Select
                  label="Направление"
                  value={directionId}
                  onChange={(event) => setDirectionId(Number(event.target.value))}
                >
                  {directions.map((direction) => (
                    <MenuItem key={direction.id} value={direction.id}>
                      {direction.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Сервис</InputLabel>
                <Select
                  label="Сервис"
                  value={serviceName}
                  onChange={(event) => setServiceName(String(event.target.value))}
                >
                  <MenuItem value="vk">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: 1,
                          bgcolor: "#4A76A8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 8,
                          fontWeight: 700,
                        }}
                      >
                        VK
                      </Box>
                      <span>ВКонтакте</span>
                    </Stack>
                  </MenuItem>
                  <MenuItem value="instagram">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: 1,
                          background: "linear-gradient(45deg, #f09433, #dc2743)",
                        }}
                      />
                      <span>Instagram</span>
                    </Stack>
                  </MenuItem>
                  <MenuItem value="tiktok">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: 1,
                          bgcolor: "#000",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 8,
                          fontWeight: 700,
                        }}
                      >
                        TT
                      </Box>
                      <span>TikTok</span>
                    </Stack>
                  </MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<PlayArrow />}
                onClick={handleStart}
                disabled={!directionId}
                sx={{ py: 1.5 }}
              >
                Запустить скрапинг
              </Button>

              {selectedDirection && (
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  Направление: <strong>{selectedDirection.name}</strong>
                </Typography>
              )}
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Button
              variant="outlined"
              fullWidth
              startIcon={<Settings />}
              onClick={() => setShowConfigDialog(true)}
            >
              Настройки скраперов
            </Button>
          </SectionCard>
        </Grid>

        {/* Очередь задач */}
        <Grid item xs={12} lg={8}>
          <SectionCard
            title="Очередь задач"
            icon={<CloudQueue sx={{ color: "#fff", fontSize: 20 }} />}
            headerColor={`linear-gradient(135deg, ${colors.secondary.main} 0%, ${colors.secondary.dark} 100%)`}
            action={
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoRefresh}
                      onChange={(event) => setAutoRefresh(event.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="caption" color="text.secondary">
                      Авто
                    </Typography>
                  }
                />
                <Tooltip title="Обновить">
                  <IconButton size="small" onClick={loadJobs}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Stack>
            }
          >
            {runningJobs > 0 && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: alpha(colors.primary.main, 0.1),
                    "& .MuiLinearProgress-bar": {
                      background: `linear-gradient(90deg, ${colors.primary.main}, ${colors.secondary.main})`,
                    },
                  }}
                />
              </Box>
            )}

            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell width={60}>ID</TableCell>
                    <TableCell>Сервис</TableCell>
                    <TableCell>Направление</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Создано</TableCell>
                    <TableCell align="right" width={80}>Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow
                      key={job.id}
                      sx={{
                        bgcolor:
                          job.status === "running"
                            ? alpha(colors.warning.main, 0.05)
                            : "transparent",
                      }}
                    >
                      <TableCell>
                        <Typography fontWeight={500}>#{job.id}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={getServiceLabel(job.service_name)}
                          sx={{
                            bgcolor: alpha(getServiceColor(job.service_name), 0.1),
                            color: getServiceColor(job.service_name),
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {directionMap.get(job.direction_id) || `ID: ${job.direction_id}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={<StatusIcon status={job.status} />}
                          label={job.status}
                          color={getStatusColor(job.status)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(job.created_at).toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Остановить">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleStop(job.id)}
                            disabled={job.status !== "running"}
                          >
                            <Stop />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!jobs.length && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                          <Typography variant="body2">Нет задач</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        </Grid>
      </Grid>

      {/* Realtime логи */}
      <SectionCard
        title="Realtime логи"
        icon={<Terminal sx={{ color: "#fff", fontSize: 20 }} />}
        headerColor={`linear-gradient(135deg, ${colors.grey[800]} 0%, ${colors.grey[900]} 100%)`}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Фильтр</InputLabel>
              <Select
                label="Фильтр"
                value={logJobFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  setLogJobFilter(value === "all" ? "all" : Number(value));
                }}
              >
                <MenuItem value="all">Все задачи</MenuItem>
                {jobs.map((job) => (
                  <MenuItem key={job.id} value={job.id}>
                    #{job.id} {job.service_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="Очистить">
              <IconButton size="small" onClick={() => setLogs([])}>
                <Clear />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      >
        <Box
          sx={{
            bgcolor: colors.grey[900],
            borderRadius: 2,
            p: 2,
            maxHeight: 300,
            overflow: "auto",
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: 12,
            lineHeight: 1.8,
            "&::-webkit-scrollbar": {
              width: 8,
            },
            "&::-webkit-scrollbar-track": {
              background: colors.grey[800],
              borderRadius: 4,
            },
            "&::-webkit-scrollbar-thumb": {
              background: colors.grey[600],
              borderRadius: 4,
            },
          }}
        >
          {filteredLogs.map((log, index) => {
            const levelColor =
              log.level === "error"
                ? colors.error.light
                : log.level === "warning"
                ? colors.warning.light
                : log.level === "info"
                ? colors.info.light
                : colors.grey[400];

            return (
              <Box
                key={`${log.job_id}-${index}`}
                sx={{
                  display: "flex",
                  gap: 1.5,
                  py: 0.5,
                  "&:hover": {
                    bgcolor: alpha("#fff", 0.02),
                  },
                }}
              >
                <Typography
                  component="span"
                  sx={{ color: colors.grey[500], minWidth: 70 }}
                >
                  {log.created_at
                    ? new Date(log.created_at).toLocaleTimeString("ru-RU")
                    : "now"}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    color: levelColor,
                    fontWeight: 600,
                    minWidth: 50,
                    textTransform: "uppercase",
                  }}
                >
                  {log.level}
                </Typography>
                <Typography
                  component="span"
                  sx={{ color: colors.primary.light, minWidth: 50 }}
                >
                  #{log.job_id}
                </Typography>
                <Typography component="span" sx={{ color: colors.grey[300], flex: 1 }}>
                  {log.message}
                </Typography>
              </Box>
            );
          })}
          {!filteredLogs.length && (
            <Box sx={{ py: 4, textAlign: "center", color: colors.grey[500] }}>
              <Terminal sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2">Ожидание логов...</Typography>
            </Box>
          )}
        </Box>
      </SectionCard>

      {/* Диалог настроек */}
      <Dialog
        open={showConfigDialog}
        onClose={() => setShowConfigDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Settings sx={{ color: colors.primary.main }} />
              <Typography variant="h6">Настройки скраперов</Typography>
            </Stack>
            <IconButton onClick={() => setShowConfigDialog(false)} size="small">
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Сервис</InputLabel>
              <Select
                label="Сервис"
                value={configService}
                onChange={(event) => setConfigService(String(event.target.value))}
              >
                <MenuItem value="vk">ВКонтакте</MenuItem>
                <MenuItem value="instagram">Instagram</MenuItem>
                <MenuItem value="tiktok">TikTok</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="API ключ"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              fullWidth
              type={showApiKey ? "text" : "password"}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <VpnKey sx={{ color: colors.grey[400] }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowApiKey(!showApiKey)}
                      edge="end"
                      size="small"
                    >
                      {showApiKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Запросов в минуту"
                  value={rpm}
                  onChange={(event) => setRpm(event.target.value)}
                  fullWidth
                  type="number"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Speed sx={{ color: colors.grey[400] }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Concurrency"
                  value={concurrency}
                  onChange={(event) => setConcurrency(event.target.value)}
                  fullWidth
                  type="number"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Dns sx={{ color: colors.grey[400] }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            <TextField
              label="Прокси (по одной на строку)"
              value={proxiesText}
              onChange={(event) => setProxiesText(event.target.value)}
              fullWidth
              multiline
              rows={5}
              placeholder="http://user:pass@host:port"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowConfigDialog(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSaveConfig} startIcon={<Save />}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

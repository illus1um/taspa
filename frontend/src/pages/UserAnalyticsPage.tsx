import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  People,
  Groups,
  TrendingUp,
  Male,
  Female,
  School,
  AccountBalance,
  Search,
  Download,
  Instagram,
  Refresh,
  OpenInNew,
  FilterList,
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";

import { apiFetch } from "../api/client";
import { colors } from "../theme";

type Direction = { id: number; name: string };
type VkSummary = { direction_id: number; total_members: number; group_count: number };
type VkGenderItem = { gender: string; count: number };
type VkUniItem = { university: string; count: number };
type VkSchoolItem = { school: string; count: number };
type VkTimelineItem = { day: string; count: number };
type VkGroupItem = { name?: string | null; members_count?: number | null };
type VkMemberItem = {
  vk_user_id: string;
  full_name?: string | null;
  gender?: string | null;
  university?: string | null;
  school?: string | null;
};
type InstagramItem = { username: string; url?: string | null; location?: string | null };
type TikTokItem = {
  username: string;
  url?: string | null;
  location?: string | null;
  followers_count?: number | null;
};

const GENDER_COLORS = [colors.primary.main, colors.secondary.main, colors.grey[400]];

// Компонент статистической карточки
const StatCard = ({
  title,
  value,
  icon,
  gradient,
  subtitle,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  subtitle?: string;
  loading?: boolean;
}) => (
  <Card
    sx={{
      position: "relative",
      overflow: "hidden",
      "&::before": {
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: gradient,
      },
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 0.5, fontWeight: 500 }}
          >
            {title}
          </Typography>
          {loading ? (
            <Skeleton width={80} height={40} />
          ) : (
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            background: gradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 4px 14px ${alpha(colors.primary.main, 0.25)}`,
          }}
        >
          {icon}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

// Компонент секции карточки
const SectionCard = ({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <Card>
    <CardContent sx={{ p: 3 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          {icon && (
            <Box sx={{ color: colors.primary.main, display: "flex" }}>{icon}</Box>
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

// Компонент пустого состояния
const EmptyState = ({ message }: { message: string }) => (
  <Box
    sx={{
      py: 6,
      textAlign: "center",
      color: "text.secondary",
    }}
  >
    <Typography variant="body2">{message}</Typography>
  </Box>
);

export const UserAnalyticsPage = () => {
  const [directions, setDirections] = useState<Direction[]>([]);
  const [directionId, setDirectionId] = useState<number | "">("");
  const [loadingDirections, setLoadingDirections] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  const [summary, setSummary] = useState<VkSummary | null>(null);
  const [gender, setGender] = useState<VkGenderItem[]>([]);
  const [universities, setUniversities] = useState<VkUniItem[]>([]);
  const [schools, setSchools] = useState<VkSchoolItem[]>([]);
  const [timeline, setTimeline] = useState<VkTimelineItem[]>([]);
  const [groups, setGroups] = useState<VkGroupItem[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramItem[]>([]);
  const [instagramUsers, setInstagramUsers] = useState<InstagramItem[]>([]);
  const [tiktokAccounts, setTiktokAccounts] = useState<TikTokItem[]>([]);
  const [tiktokUsers, setTiktokUsers] = useState<TikTokItem[]>([]);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VkMemberItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const loadDirections = async () => {
      setLoadingDirections(true);
      try {
        const data = (await apiFetch("/directions")) as Direction[];
        setDirections(data);
        setDirectionId(data[0]?.id ?? "");
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoadingDirections(false);
      }
    };
    loadDirections();
  }, []);

  useEffect(() => {
    if (!directionId) {
      return;
    }
    const loadAnalytics = async () => {
      setLoadingData(true);
      setError(null);
      try {
        const [
          summaryData,
          genderData,
          universitiesData,
          schoolsData,
          timelineData,
          groupsData,
          instagramAccountsData,
          instagramUsersData,
          tiktokAccountsData,
          tiktokUsersData,
        ] = await Promise.all([
          apiFetch(`/analytics/vk/summary/${directionId}`),
          apiFetch(`/analytics/vk/gender/${directionId}`),
          apiFetch(`/analytics/vk/universities/${directionId}`),
          apiFetch(`/analytics/vk/schools/${directionId}`),
          apiFetch(`/analytics/vk/timeline/${directionId}`),
          apiFetch(`/analytics/vk/groups/${directionId}`),
          apiFetch(`/analytics/instagram/accounts/${directionId}`),
          apiFetch(`/analytics/instagram/users/${directionId}`),
          apiFetch(`/analytics/tiktok/accounts/${directionId}`),
          apiFetch(`/analytics/tiktok/users/${directionId}`),
        ]);

        setSummary(summaryData as VkSummary);
        setGender(genderData as VkGenderItem[]);
        setUniversities(universitiesData as VkUniItem[]);
        setSchools(schoolsData as VkSchoolItem[]);
        setTimeline(timelineData as VkTimelineItem[]);
        setGroups((groupsData as { items: VkGroupItem[] }).items ?? []);
        setInstagramAccounts(
          (instagramAccountsData as { items: InstagramItem[] }).items ?? []
        );
        setInstagramUsers(
          (instagramUsersData as { items: InstagramItem[] }).items ?? []
        );
        setTiktokAccounts((tiktokAccountsData as { items: TikTokItem[] }).items ?? []);
        setTiktokUsers((tiktokUsersData as { items: TikTokItem[] }).items ?? []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoadingData(false);
      }
    };
    loadAnalytics();
  }, [directionId]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!directionId || !searchQuery.trim()) {
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const data = await apiFetch(
        `/analytics/vk/search?direction_id=${directionId}&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      setSearchResults((data as { items: VkMemberItem[] }).items ?? []);
    } catch (err) {
      setSearchError((err as Error).message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleExport = async (dataset: string, format: "pdf" | "xlsx") => {
    if (!directionId) {
      return;
    }
    setExportError(null);
    setExportStatus(null);
    try {
      const data = await apiFetch("/export", {
        method: "POST",
        body: JSON.stringify({
          direction_id: directionId,
          format,
          dataset,
        }),
      });
      setExportStatus(
        `Экспорт создан: ${data.bucket}/${data.object_name}`
      );
    } catch (err) {
      setExportError((err as Error).message);
    }
  };

  const currentDirection = directions.find((d) => d.id === directionId);

  // Преобразуем данные пола для красивого отображения
  const genderDisplay = gender.map((g) => ({
    ...g,
    name: g.gender === "male" ? "Мужчины" : g.gender === "female" ? "Женщины" : "Не указан",
  }));

  return (
    <Stack spacing={3}>
      {/* Заголовок и выбор направления */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
            spacing={2}
          >
            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Аналитика социальных сетей
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Просмотр и анализ данных по направлениям
              </Typography>
            </Box>
            <FormControl sx={{ minWidth: 240 }}>
              <InputLabel id="direction-label">Направление</InputLabel>
              <Select
                labelId="direction-label"
                label="Направление"
                value={directionId}
                onChange={(event) => setDirectionId(Number(event.target.value))}
                disabled={loadingDirections}
                startAdornment={
                  loadingDirections ? (
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                  ) : null
                }
              >
                {directions.map((direction) => (
                  <MenuItem key={direction.id} value={direction.id}>
                    {direction.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Табы */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{
            "& .MuiTab-root": {
              minHeight: 56,
              px: 3,
            },
          }}
        >
          <Tab
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "#4A76A8",
                  }}
                />
                <span>ВКонтакте</span>
              </Stack>
            }
          />
          <Tab
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                  }}
                />
                <span>Instagram</span>
              </Stack>
            }
          />
          <Tab
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "#000",
                  }}
                />
                <span>TikTok</span>
              </Stack>
            }
          />
        </Tabs>
      </Box>

      {/* ВКонтакте */}
      {tab === 0 && (
        <Stack spacing={3}>
          {/* Статистика */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Всего подписчиков"
                value={summary?.total_members?.toLocaleString() ?? "—"}
                icon={<People sx={{ color: "#fff", fontSize: 24 }} />}
                gradient={`linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`}
                loading={loadingData}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Групп в направлении"
                value={summary?.group_count ?? "—"}
                icon={<Groups sx={{ color: "#fff", fontSize: 24 }} />}
                gradient={`linear-gradient(135deg, ${colors.secondary.main} 0%, ${colors.secondary.dark} 100%)`}
                loading={loadingData}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="ВУЗов"
                value={universities.length}
                icon={<AccountBalance sx={{ color: "#fff", fontSize: 24 }} />}
                gradient={`linear-gradient(135deg, ${colors.info.main} 0%, ${colors.info.dark} 100%)`}
                loading={loadingData}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Школ"
                value={schools.length}
                icon={<School sx={{ color: "#fff", fontSize: 24 }} />}
                gradient={`linear-gradient(135deg, ${colors.success.main} 0%, ${colors.success.dark} 100%)`}
                loading={loadingData}
              />
            </Grid>
          </Grid>

          {/* Графики */}
          <Grid container spacing={3}>
            <Grid item xs={12} lg={6}>
              <SectionCard
                title="Распределение по полу"
                icon={<TrendingUp />}
              >
                <Box sx={{ height: 280 }}>
                  {loadingData ? (
                    <Box sx={{ display: "flex", justifyContent: "center", pt: 10 }}>
                      <CircularProgress />
                    </Box>
                  ) : !genderDisplay.length ? (
                    <EmptyState message="Нет данных о поле" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={genderDisplay}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {genderDisplay.map((entry, index) => (
                            <Cell
                              key={`cell-${entry.gender}`}
                              fill={GENDER_COLORS[index % GENDER_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number) => [value.toLocaleString(), "Человек"]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </SectionCard>
            </Grid>
            <Grid item xs={12} lg={6}>
              <SectionCard
                title="Временная динамика"
                icon={<TrendingUp />}
              >
                <Box sx={{ height: 280 }}>
                  {loadingData ? (
                    <Box sx={{ display: "flex", justifyContent: "center", pt: 10 }}>
                      <CircularProgress />
                    </Box>
                  ) : !timeline.length ? (
                    <EmptyState message="Нет данных о временной динамике" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timeline}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.primary.main} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={colors.primary.main} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.grey[200]} />
                        <XAxis dataKey="day" stroke={colors.grey[400]} fontSize={12} />
                        <YAxis stroke={colors.grey[400]} fontSize={12} />
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: 8,
                            border: "none",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke={colors.primary.main}
                          fillOpacity={1}
                          fill="url(#colorCount)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </SectionCard>
            </Grid>
          </Grid>

          {/* Таблицы ВУЗов и школ */}
          <Grid container spacing={3}>
            <Grid item xs={12} lg={6}>
              <SectionCard title="ВУЗы" icon={<AccountBalance />}>
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Название</TableCell>
                        <TableCell align="right">Кол-во</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {universities.slice(0, 10).map((item, index) => (
                        <TableRow key={`${item.university}-${index}`}>
                          <TableCell>{item.university || "Не указан"}</TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              label={item.count.toLocaleString()}
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {!universities.length && (
                        <TableRow>
                          <TableCell colSpan={2}>
                            <EmptyState message="Нет данных" />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            </Grid>
            <Grid item xs={12} lg={6}>
              <SectionCard title="Школы" icon={<School />}>
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Название</TableCell>
                        <TableCell align="right">Кол-во</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {schools.slice(0, 10).map((item, index) => (
                        <TableRow key={`${item.school}-${index}`}>
                          <TableCell>{item.school || "Не указана"}</TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              label={item.count.toLocaleString()}
                              color="secondary"
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {!schools.length && (
                        <TableRow>
                          <TableCell colSpan={2}>
                            <EmptyState message="Нет данных" />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            </Grid>
          </Grid>

          {/* Поиск */}
          <SectionCard title="Поиск участников" icon={<Search />}>
            <Stack
              spacing={2}
              direction={{ xs: "column", md: "row" }}
              component="form"
              onSubmit={handleSearch}
              sx={{ mb: 2 }}
            >
              <TextField
                label="ID или ФИО"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: colors.grey[400] }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                type="submit"
                disabled={searchLoading}
                sx={{ minWidth: 120 }}
              >
                {searchLoading ? <CircularProgress size={24} /> : "Найти"}
              </Button>
            </Stack>
            {searchError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {searchError}
              </Alert>
            )}
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>ФИО</TableCell>
                    <TableCell>Пол</TableCell>
                    <TableCell>ВУЗ</TableCell>
                    <TableCell>Школа</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {searchResults.map((item) => (
                    <TableRow key={item.vk_user_id}>
                      <TableCell>
                        <Chip
                          size="small"
                          label={item.vk_user_id}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{item.full_name || "—"}</TableCell>
                      <TableCell>
                        {item.gender === "male" ? (
                          <Chip size="small" icon={<Male />} label="М" color="info" />
                        ) : item.gender === "female" ? (
                          <Chip size="small" icon={<Female />} label="Ж" color="secondary" />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{item.university || "—"}</TableCell>
                      <TableCell>{item.school || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {!searchResults.length && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <EmptyState message="Введите запрос для поиска" />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>

          {/* Группы VK */}
          <SectionCard title="Группы ВКонтакте" icon={<Groups />}>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Название</TableCell>
                    <TableCell align="right">Подписчиков</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groups.map((item, index) => (
                    <TableRow key={`${item.name}-${index}`}>
                      <TableCell>{item.name || "—"}</TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={(item.members_count ?? 0).toLocaleString()}
                          color="primary"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {!groups.length && (
                    <TableRow>
                      <TableCell colSpan={2}>
                        <EmptyState message="Нет групп" />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>

          {/* Экспорт */}
          <SectionCard title="Экспорт данных" icon={<Download />}>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => handleExport("vk_members", "xlsx")}
              >
                Участники (XLSX)
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => handleExport("vk_members", "pdf")}
              >
                Участники (PDF)
              </Button>
            </Stack>
            {exportStatus && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {exportStatus}
              </Alert>
            )}
            {exportError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {exportError}
              </Alert>
            )}
          </SectionCard>
        </Stack>
      )}

      {/* Instagram */}
      {tab === 1 && (
        <Stack spacing={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <StatCard
                title="Аккаунтов"
                value={instagramAccounts.length}
                icon={<Instagram sx={{ color: "#fff", fontSize: 24 }} />}
                gradient="linear-gradient(135deg, #f09433 0%, #dc2743 100%)"
                loading={loadingData}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <StatCard
                title="Пользователей"
                value={instagramUsers.length}
                icon={<People sx={{ color: "#fff", fontSize: 24 }} />}
                gradient="linear-gradient(135deg, #bc1888 0%, #cc2366 100%)"
                loading={loadingData}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={6}>
              <SectionCard title="Аккаунты" icon={<Instagram />}>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Username</TableCell>
                        <TableCell>Локация</TableCell>
                        <TableCell align="right">Действия</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {instagramAccounts.map((item) => (
                        <TableRow key={item.username}>
                          <TableCell>
                            <Typography fontWeight={500}>@{item.username}</Typography>
                          </TableCell>
                          <TableCell>{item.location || "—"}</TableCell>
                          <TableCell align="right">
                            {item.url && (
                              <Tooltip title="Открыть профиль">
                                <IconButton
                                  size="small"
                                  href={item.url}
                                  target="_blank"
                                >
                                  <OpenInNew fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!instagramAccounts.length && (
                        <TableRow>
                          <TableCell colSpan={3}>
                            <EmptyState message="Нет аккаунтов" />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            </Grid>
            <Grid item xs={12} lg={6}>
              <SectionCard title="Пользователи" icon={<People />}>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Username</TableCell>
                        <TableCell>Локация</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {instagramUsers.map((item) => (
                        <TableRow key={item.username}>
                          <TableCell>
                            <Typography fontWeight={500}>@{item.username}</Typography>
                          </TableCell>
                          <TableCell>{item.location || "—"}</TableCell>
                        </TableRow>
                      ))}
                      {!instagramUsers.length && (
                        <TableRow>
                          <TableCell colSpan={2}>
                            <EmptyState message="Нет пользователей" />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            </Grid>
          </Grid>

          <SectionCard title="Экспорт данных" icon={<Download />}>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => handleExport("instagram_users", "xlsx")}
              >
                Пользователи (XLSX)
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => handleExport("instagram_users", "pdf")}
              >
                Пользователи (PDF)
              </Button>
            </Stack>
            {exportStatus && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {exportStatus}
              </Alert>
            )}
            {exportError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {exportError}
              </Alert>
            )}
          </SectionCard>
        </Stack>
      )}

      {/* TikTok */}
      {tab === 2 && (
        <Stack spacing={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <StatCard
                title="Аккаунтов"
                value={tiktokAccounts.length}
                icon={
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    TT
                  </Box>
                }
                gradient="linear-gradient(135deg, #000 0%, #333 100%)"
                loading={loadingData}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <StatCard
                title="Пользователей"
                value={tiktokUsers.length}
                icon={<People sx={{ color: "#fff", fontSize: 24 }} />}
                gradient="linear-gradient(135deg, #25F4EE 0%, #FE2C55 100%)"
                loading={loadingData}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={6}>
              <SectionCard
                title="Аккаунты"
                icon={
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
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    TT
                  </Box>
                }
              >
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Username</TableCell>
                        <TableCell>Локация</TableCell>
                        <TableCell align="right">Подписчики</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tiktokAccounts.map((item) => (
                        <TableRow key={item.username}>
                          <TableCell>
                            <Typography fontWeight={500}>@{item.username}</Typography>
                          </TableCell>
                          <TableCell>{item.location || "—"}</TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              label={(item.followers_count ?? 0).toLocaleString()}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {!tiktokAccounts.length && (
                        <TableRow>
                          <TableCell colSpan={3}>
                            <EmptyState message="Нет аккаунтов" />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            </Grid>
            <Grid item xs={12} lg={6}>
              <SectionCard title="Пользователи" icon={<People />}>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Username</TableCell>
                        <TableCell>Локация</TableCell>
                        <TableCell align="right">Подписчики</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tiktokUsers.map((item) => (
                        <TableRow key={item.username}>
                          <TableCell>
                            <Typography fontWeight={500}>@{item.username}</Typography>
                          </TableCell>
                          <TableCell>{item.location || "—"}</TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              label={(item.followers_count ?? 0).toLocaleString()}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {!tiktokUsers.length && (
                        <TableRow>
                          <TableCell colSpan={3}>
                            <EmptyState message="Нет пользователей" />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            </Grid>
          </Grid>

          <SectionCard title="Экспорт данных" icon={<Download />}>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => handleExport("tiktok_users", "xlsx")}
              >
                Пользователи (XLSX)
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => handleExport("tiktok_users", "pdf")}
              >
                Пользователи (PDF)
              </Button>
            </Stack>
            {exportStatus && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {exportStatus}
              </Alert>
            )}
            {exportError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {exportError}
              </Alert>
            )}
          </SectionCard>
        </Stack>
      )}
    </Stack>
  );
};

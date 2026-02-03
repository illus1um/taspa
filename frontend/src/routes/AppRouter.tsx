import { Navigate, Route, Routes } from "react-router-dom";

import { RequireAuth } from "../auth/RequireAuth";
import { RequireRole } from "../auth/RequireRole";
import { MainLayout } from "../layouts/MainLayout";
import { AdminDirectionsPage } from "../pages/AdminDirectionsPage";
import { AdminUsersPage } from "../pages/AdminUsersPage";
import { DeveloperScrapingPage } from "../pages/DeveloperScrapingPage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ProfilePage } from "../pages/ProfilePage";
import { UserAnalyticsPage } from "../pages/UserAnalyticsPage";

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<MainLayout />}>
          <Route path="/user" element={<Navigate to="/analytics/vk" replace />} />
          <Route path="/analytics" element={<Navigate to="/analytics/vk" replace />} />
          <Route path="/analytics/:platform" element={<UserAnalyticsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminDirectionsPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireRole role="admin">
                <AdminUsersPage />
              </RequireRole>
            }
          />
          <Route
            path="/developer"
            element={
              <RequireRole role="developer">
                <DeveloperScrapingPage />
              </RequireRole>
            }
          />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/analytics/vk" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

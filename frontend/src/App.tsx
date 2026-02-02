import { CssBaseline, ThemeProvider } from "@mui/material";

import { AuthProvider } from "./auth/AuthContext";
import { AppRouter } from "./routes/AppRouter";
import { appTheme } from "./theme";

const App = () => {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

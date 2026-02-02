import { Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export const NotFoundPage = () => {
  return (
    <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
      <Typography variant="h4">Страница не найдена</Typography>
      <Button component={RouterLink} to="/user" variant="contained">
        На главную
      </Button>
    </Stack>
  );
};

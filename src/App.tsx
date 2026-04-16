import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TournamentProvider } from "./context/TournamentContext";
import Layout from "./components/Layout";
import UpdatePrompt from "./components/UpdatePrompt";
import SetupPage from "./pages/SetupPage";
import GroupsPage from "./pages/GroupsPage";
import SchedulePage from "./pages/SchedulePage";
import KnockoutPage from "./pages/KnockoutPage";

export default function App() {
  return (
    <BrowserRouter>
      <TournamentProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/knockouts" element={<KnockoutPage />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </Route>
        </Routes>
        <UpdatePrompt />
      </TournamentProvider>
    </BrowserRouter>
  );
}

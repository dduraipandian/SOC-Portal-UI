import { Route, Routes } from "react-router-dom";
import { CaseDetail } from "../screens/CaseDetail";
import { Health } from "../screens/Health";
import { Evals } from "../screens/Evals";
import { Proposals } from "../screens/Proposals";
import { Queue } from "../screens/Queue";
import { Rules } from "../screens/Rules";
import { Layout } from "./Layout";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Queue />} />
        <Route path="cases/:caseId" element={<CaseDetail />} />
        <Route path="proposals" element={<Proposals />} />
        <Route path="rules" element={<Rules />} />
        <Route path="health" element={<Health />} />
        <Route path="evals" element={<Evals />} />
        <Route path="evals/:batchId" element={<Evals />} />
        <Route path="*" element={<p className="empty">No such page. Use the links on the left.</p>} />
      </Route>
    </Routes>
  );
}

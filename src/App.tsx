import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ToastProvider } from "./components/Toast";
import { BlobPage } from "./pages/BlobPage";
import { ComparePage } from "./pages/ComparePage";
import { HomePage } from "./pages/HomePage";

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="blobs/:id" element={<BlobPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

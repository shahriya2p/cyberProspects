import { createBrowserRouter } from "react-router-dom";

import { Layout } from "./components/Layout";
import { CompanyPage } from "./pages/CompanyPage";
import { Dashboard } from "./pages/Dashboard";
import { Explore } from "./pages/Explore";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/explore", element: <Explore /> },
      { path: "/company/:domain", element: <CompanyPage /> },
    ],
  },
]);

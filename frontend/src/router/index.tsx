// Router Configuration
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { ROUTES } from '../constants/routes';
import { AuthGuard } from "../security/ui/AuthGuard";
import { SecurityRoutes } from "../security/ui/SecurityRoutes";
import { withSuspense } from "./withSuspense";

// Lazy load pages for better performance
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegionSelectPage = lazy(() => import('../pages/RegionSelectPage'));
const IndexAnalysisPage = lazy(() => import('../pages/IndexAnalysisPage'));
const SplitComparisonPage = lazy(() => import('../pages/SplitComparisonPage'));
const AiInsightsPage = lazy(() => import('../pages/AiInsightsPage'));

export const router = createBrowserRouter([
    {
        path: ROUTES.LOGIN,
        element: withSuspense(LoginPage),
    },

    // ✅ Keycloak callback + logout
    ...SecurityRoutes,

    {
        path: ROUTES.HOME,
        element: <Navigate to={ROUTES.DASHBOARD} replace />,
    },
    {
        path: ROUTES.DASHBOARD,
        element: (
            <AuthGuard>
                <MainLayout />
            </AuthGuard>
        ),
        children: [
            {
                index: true,
                element: <Navigate to={ROUTES.REGION_SELECT} replace />,
            },
            {
                path: 'region',
                element: withSuspense(RegionSelectPage),
            },
            {
                path: 'analysis',
                element: withSuspense(IndexAnalysisPage),
            },
            {
                path: 'compare',
                element: withSuspense(SplitComparisonPage),
            },
        ],
    },
    {
        path: ROUTES.AI_INSIGHTS,
        element: (
            <AuthGuard>
                <MainLayout />
            </AuthGuard>
        ),
        children: [
            {
                index: true,
                element: withSuspense(AiInsightsPage),
            },
        ],
    },
    {
        path: '*',
        element: <Navigate to={ROUTES.LOGIN} replace />,
    },
]);

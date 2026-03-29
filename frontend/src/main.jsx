import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import App from './App.jsx';
import HomePage from './pages/HomePage.jsx';
import MyRidesPage from './pages/MyRidesPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import VehiclesPage from './pages/VehiclesPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ShareRidePage from './pages/ShareRidePage.jsx';
import './index.css';

const router = createBrowserRouter([{ path: '/', element: <App />, children: [{ index: true, element: <HomePage />, }, { path: 'my-rides', element: <MyRidesPage />, }, { path: 'login', element: <AuthPage />, }, { path: 'profile', element: <ProfilePage /> }, { path: 'my-vehicles', element: <VehiclesPage /> }, { path: 'admin', element: <AdminPage /> }], }, { path: '/share/:token', element: <ShareRidePage /> }, { path: '*', element: <Navigate to="/app" replace /> },]);
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,
  environment: import.meta.env.MODE
});
// Test Sentry is working - remove after confirming
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode> <RouterProvider router={router} /> </React.StrictMode>,);

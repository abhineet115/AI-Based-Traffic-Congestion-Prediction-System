import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import HomePage from './components/HomePage';
import MapArea from './components/MapArea';
import RoutesPage from './components/RoutesPage';
import RouteOptimizerPage from './components/RouteOptimizerPage';
import AlertsPage from './components/AlertsPage';
import AnalyticsPage from './components/AnalyticsPage';
import WeatherPage from './components/WeatherPage';
import CameraPage from './components/CameraPage';
import ProfilePage from './components/ProfilePage';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/map" element={<MapArea />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/optimizer" element={<RouteOptimizerPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/camera" element={<CameraPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;

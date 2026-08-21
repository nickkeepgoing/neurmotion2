import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import Admin from './routes/Admin';
import Consent from './routes/Consent';
import Home from './routes/Home';
import Login from './routes/Login';
import Register from './routes/Register';
import Result from './routes/Result';
import Settings from './routes/Settings';
import Splash from './routes/Splash';
import FacialTest from './routes/tests/FacialTest';
import SpiralTest from './routes/tests/SpiralTest';
import TappingTest from './routes/tests/TappingTest';
import TremorTest from './routes/tests/TremorTest';
import VoiceTest from './routes/tests/VoiceTest';

/** Screens behind the PDPA consent gate. */
function RequireConsent() {
  const { settings } = useSettings();
  if (!settings.consented) return <Navigate to="/consent" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/consent" element={<Consent />} />
          <Route element={<RequireConsent />}>
            <Route path="/home" element={<Home />} />
            <Route path="/test/spiral" element={<SpiralTest />} />
            <Route path="/test/tapping" element={<TappingTest />} />
            <Route path="/test/tremor" element={<TremorTest />} />
            <Route path="/test/facial" element={<FacialTest />} />
            <Route path="/test/voice" element={<VoiceTest />} />
            <Route path="/result" element={<Result />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}

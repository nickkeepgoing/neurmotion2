import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import DemoBanner from './components/DemoBanner';
import { demoRequested, enterDemo, isDemo } from './lib/demoMode';
import Admin from './routes/Admin';
import Consent from './routes/Consent';
import Home from './routes/Home';
import Login from './routes/Login';
import Register from './routes/Register';
import Result from './routes/Result';
import Clinic from './routes/Clinic';
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

/**
 * Handles the `?demo` link printed in the QR code.
 *
 * Runs before the router paints so a judge who scans lands on Home directly,
 * instead of scrolling a birth-date picker while the pitch runs out.
 */
function DemoEntry({ onEnter }: { onEnter: () => void }) {
  const navigate = useNavigate();
  const { update } = useSettings();
  useEffect(() => {
    if (!demoRequested()) return;
    enterDemo();
    // push the seeded profile into context too, so this render sees it
    update({ consented: true, userType: 'general', age: 68, birthDate: '1958-05-14', voiceOn: false });
    // drop the query string so a reload does not re-seed over their attempts
    window.history.replaceState({}, '', window.location.pathname);
    onEnter();
    navigate('/home', { replace: true });
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/**
 * Inside the router so DemoEntry can navigate.
 *
 * The demo flag is React state rather than read straight from sessionStorage:
 * the banner mounts before DemoEntry's effect writes the flag, so reading
 * storage at render time always missed it and the banner never appeared.
 */
function AppRoutes() {
  const [demo, setDemo] = useState(() => isDemo());
  return (
    <>
      <DemoEntry onEnter={() => setDemo(true)} />
      {demo && <DemoBanner />}
      <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/consent" element={<Consent />} />
          {/* Staff screen on synthetic data only — it holds nothing a patient
              consented to, so it must not sit behind the patient consent gate. */}
          <Route path="/clinic" element={<Clinic />} />
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
    </>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SettingsProvider>
  );
}

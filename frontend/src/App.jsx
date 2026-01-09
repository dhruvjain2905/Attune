import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './components/pages/Dashboard';
import NewSession from './components/pages/NewSession';
import PastSession from './components/pages/PastSession';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new-session" element={<NewSession />} />
          <Route path="/session/:sessionId" element={<PastSession />} />
        </Routes>
      </Layout>
    </Router>
  );
}

import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Savings from './pages/Savings';
import Stats from './pages/Stats';
import Tools from './pages/Tools';

const getPath = () => window.location.hash.slice(1) || '/';

export default function App() {
  const [path, setPath] = useState(getPath);

  useEffect(() => {
    const onChange = () => {
      setPath(getPath());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const [, section = '', sub = ''] = path.split('/');
  let page;
  switch (section) {
    case 'movimientos':
      page = <Transactions />;
      break;
    case 'presupuestos':
      page = <Budgets />;
      break;
    case 'ahorros':
      page = <Savings />;
      break;
    case 'estadisticas':
      page = <Stats />;
      break;
    case 'herramientas':
      page = <Tools tab={sub} />;
      break;
    default:
      page = <Dashboard />;
  }

  return <Layout path={path}>{page}</Layout>;
}

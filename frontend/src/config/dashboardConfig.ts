// Role-Based Dashboard Configuration
import type { User } from '../types/user';
import { isAdmin, isForestAnalyst, isDataManager, isViewer } from '../utils/roleUtils';

export interface DashboardWidget {
  id: string;
  title: string;
  icon: string;
  path: string;
  description: string;
  requiredPermission: (user: User | null) => boolean;
}

export interface DashboardConfig {
  title: string;
  widgets: DashboardWidget[];
  defaultPath: string;
}

/**
 * Get dashboard configuration based on user role
 */
export function getDashboardConfig(user: User | null): DashboardConfig {
  if (isAdmin(user)) {
    return ADMIN_DASHBOARD;
  }
  
  if (isDataManager(user)) {
    return DATA_MANAGER_DASHBOARD;
  }
  
  if (isForestAnalyst(user)) {
    return ANALYST_DASHBOARD;
  }
  
  if (isViewer(user)) {
    return VIEWER_DASHBOARD;
  }
  
  // Default fallback
  return VIEWER_DASHBOARD;
}


// ===== ADMIN DASHBOARD =====
const ADMIN_DASHBOARD: DashboardConfig = {
  title: 'Administrator Dashboard',
  defaultPath: '/dashboard/region',
  widgets: [
    {
      id: 'users',
      title: 'Benutzerverwaltung',
      icon: '👥',
      path: '/admin/users',
      description: 'Benutzer, Rollen und Berechtigungen verwalten',
      requiredPermission: isAdmin,
    },
    {
      id: 'data-ingest',
      title: 'Datenaufnahme',
      icon: '📡',
      path: '/data/ingest',
      description: 'Satellitendaten von Sentinel-2 importieren',
      requiredPermission: isAdmin,
    },
    {
      id: 'analysis',
      title: 'Waldgesundheitsanalyse',
      icon: '🔬',
      path: '/dashboard/analysis',
      description: 'Vegetationsindizes berechnen und analysieren',
      requiredPermission: isAdmin,
    },
    {
      id: 'regions',
      title: 'Regionsauswahl',
      icon: '🗺️',
      path: '/dashboard/region',
      description: 'Gemeinden und Regionen verwalten',
      requiredPermission: isAdmin,
    },
    {
      id: 'audit',
      title: 'Audit-Protokolle',
      icon: '📋',
      path: '/admin/audit',
      description: 'Systemaktivitäten und Zugriffsprotokoll',
      requiredPermission: isAdmin,
    },
    {
      id: 'system',
      title: 'Systemeinstellungen',
      icon: '⚙️',
      path: '/admin/settings',
      description: 'Systemkonfiguration und -einstellungen',
      requiredPermission: isAdmin,
    },
  ],
};


// ===== FOREST ANALYST DASHBOARD =====
const ANALYST_DASHBOARD: DashboardConfig = {
  title: 'Waldanalyst Dashboard',
  defaultPath: '/dashboard/region',
  widgets: [
    {
      id: 'regions',
      title: 'Meine Regionen',
      icon: '🗺️',
      path: '/dashboard/region',
      description: 'Zugewiesene Gemeinden anzeigen',
      requiredPermission: isForestAnalyst,
    },
    {
      id: 'analysis',
      title: 'Waldanalyse',
      icon: '🔬',
      path: '/dashboard/analysis',
      description: 'NDVI, EVI, NDWI Analysen durchführen',
      requiredPermission: isForestAnalyst,
    },
    {
      id: 'comparison',
      title: 'Zeitvergleich',
      icon: '📊',
      path: '/dashboard/compare',
      description: 'Waldgesundheit über Zeit vergleichen',
      requiredPermission: isForestAnalyst,
    },
    {
      id: 'ai-insights',
      title: 'KI-Einblicke',
      icon: '🤖',
      path: '/ai-insights',
      description: 'KI-gestützte Waldgesundheitsanalyse',
      requiredPermission: isForestAnalyst,
    },
    {
      id: 'reports',
      title: 'Berichte',
      icon: '📄',
      path: '/reports',
      description: 'Analyseergebnisse exportieren',
      requiredPermission: isForestAnalyst,
    },
  ],
};


// ===== DATA MANAGER DASHBOARD =====
const DATA_MANAGER_DASHBOARD: DashboardConfig = {
  title: 'Datenverwalter Dashboard',
  defaultPath: '/data/ingest',
  widgets: [
    {
      id: 'data-ingest',
      title: 'Datenaufnahme',
      icon: '📡',
      path: '/data/ingest',
      description: 'Neue Satellitendaten importieren',
      requiredPermission: isDataManager,
    },
    {
      id: 'data-catalog',
      title: 'Datenkatalog',
      icon: '📚',
      path: '/data/catalog',
      description: 'Vorhandene Szenen verwalten',
      requiredPermission: isDataManager,
    },
    {
      id: 'data-quality',
      title: 'Datenqualität',
      icon: '✅',
      path: '/data/quality',
      description: 'Datenqualität prüfen und validieren',
      requiredPermission: isDataManager,
    },
    {
      id: 'metadata',
      title: 'Metadaten',
      icon: '🏷️',
      path: '/data/metadata',
      description: 'Szenen-Metadaten bearbeiten',
      requiredPermission: isDataManager,
    },
    {
      id: 'regions',
      title: 'Regionsübersicht',
      icon: '🗺️',
      path: '/dashboard/region',
      description: 'Alle Regionen anzeigen',
      requiredPermission: isDataManager,
    },
  ],
};


// ===== VIEWER DASHBOARD =====
const VIEWER_DASHBOARD: DashboardConfig = {
  title: 'Betrachter Dashboard',
  defaultPath: '/dashboard/region',
  widgets: [
    {
      id: 'regions',
      title: 'Regionen durchsuchen',
      icon: '🗺️',
      path: '/dashboard/region',
      description: 'Gemeinden und Regionen erkunden',
      requiredPermission: isViewer,
    },
    {
      id: 'view-analysis',
      title: 'Analyseergebnisse',
      icon: '📊',
      path: '/dashboard/analysis',
      description: 'Vorhandene Analysen anzeigen',
      requiredPermission: isViewer,
    },
    {
      id: 'comparison',
      title: 'Kartenvergleich',
      icon: '🔄',
      path: '/dashboard/compare',
      description: 'Zeitreihenvergleiche ansehen',
      requiredPermission: isViewer,
    },
  ],
};


/**
 * Get available navigation items for user
 */
export function getNavigationItems(user: User | null) {
  const config = getDashboardConfig(user);
  return config.widgets.filter(widget => widget.requiredPermission(user));
}

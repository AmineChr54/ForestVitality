// Main Layout - Dashboard wrapper with Sidebar and Topbar
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { ChatWidget } from '../components/ai/ChatWidget';
import './MainLayout.css';

export const MainLayout = () => {
    return (
        <div className="main-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar />
                <main className="page-content">
                    <Outlet />
                </main>
            </div>
            <ChatWidget />
        </div>
    );
};

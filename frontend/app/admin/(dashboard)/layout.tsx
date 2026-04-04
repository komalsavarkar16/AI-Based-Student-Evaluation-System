'use client';

import Navbar from "../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { usePathname } from 'next/navigation';

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isSettingsPage = pathname === '/admin/settings';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
            <Navbar />
            <main className={!isSettingsPage ? "layout-content-wrapper" : ""} style={{ paddingTop: '70px', flex: 1 }}>
                {children}
            </main>
            <Footer theme="admin" />
        </div>
    );
}

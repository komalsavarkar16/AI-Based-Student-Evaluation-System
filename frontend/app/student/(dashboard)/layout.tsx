'use client';

import StudentNavbar from "../components/StudentNavbar/StudentNavbar";
import Footer from "../../components/Footer/Footer";
import { usePathname } from 'next/navigation';

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isVideoTestPage = pathname.startsWith('/student/video-test/');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
            <StudentNavbar />
            <main className={!isVideoTestPage ? "layout-content-wrapper" : ""} style={{ flex: 1 }}>
                {children}
            </main>
            <Footer theme="student" />
        </div>
    )
}
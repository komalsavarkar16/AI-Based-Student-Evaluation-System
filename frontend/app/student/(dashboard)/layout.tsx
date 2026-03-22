import StudentNavbar from "../components/StudentNavbar/StudentNavbar";
import Footer from "../../components/Footer/Footer";

export default function layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
            <StudentNavbar />
            <main style={{ flex: 1 }}>
                {children}
            </main>
            <Footer theme="student" />
        </div>
    )
}
import Navbar from "../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";

export default function layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
            <Navbar />
            <main style={{ paddingTop: '70px', flex: 1 }}>
                {children}
            </main>
            <Footer theme="admin" />
        </div>
    );
}

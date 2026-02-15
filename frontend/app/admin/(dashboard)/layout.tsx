import Navbar from "../components/Navbar/Navbar";
export default function layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
            <Navbar />
            <main style={{ paddingTop: '70px' }}>
                {children}
            </main>
        </div>
    );
}
